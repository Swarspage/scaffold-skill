import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (t) => t * t * (3 - 2 * t);
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const vec = (value, fallback = [0, 0, 0]) => new THREE.Vector3(...(value ?? fallback));
const quatFromEuler = (value) => new THREE.Quaternion().setFromEuler(new THREE.Euler(...(value ?? [0, 0, 0])));

function phaseAmount(progress, phase, rank, count) {
  if (!phase) return 0;
  const local = clamp01((progress - phase.from) / (phase.to - phase.from));
  const step = phase.reverse ? count - 1 - rank : rank;
  const raw = clamp01((local - step * (phase.stagger ?? 0)) / (phase.window ?? 1));
  if (phase.easing === 'backOut') return easeOutBack(raw);
  if (phase.easing === 'linear') return raw;
  return smoothstep(raw);
}

function createGeometry(definition) {
  const d = definition ?? { type: 'box', size: [1, 1, 1] };
  const segments = d.segments ?? 48;
  switch (d.type) {
    case 'box': return new THREE.BoxGeometry(...(d.size ?? [1, 1, 1]));
    case 'sphere': return new THREE.SphereGeometry(d.radius ?? 0.5, segments, Math.max(8, Math.floor(segments * 0.66)));
    case 'cylinder': return new THREE.CylinderGeometry(d.radiusTop ?? 0.5, d.radiusBottom ?? 0.5, d.height ?? 1, segments);
    case 'torus': return new THREE.TorusGeometry(d.radius ?? 0.5, d.tube ?? 0.08, 12, segments);
    case 'cone': return new THREE.ConeGeometry(d.radius ?? 0.5, d.height ?? 1, segments);
    case 'ring': return new THREE.RingGeometry(d.radiusInner ?? 0.35, d.radiusOuter ?? 0.5, segments);
    case 'lathe': {
      if (!Array.isArray(d.points) || d.points.length < 3) throw new Error('Lathe geometry requires at least three [radius, height] profile points.');
      const profile = d.points.map(([radius, height]) => new THREE.Vector2(radius, height));
      return new THREE.LatheGeometry(profile, segments);
    }
    default: throw new Error(`Unsupported procedural geometry type: ${d.type}`);
  }
}

function createMaterial(definition = {}) {
  return new THREE.MeshStandardMaterial({
    color: definition.color ?? '#aab0b8',
    metalness: definition.metalness ?? 0.35,
    roughness: definition.roughness ?? 0.5,
    emissive: definition.emissive ?? '#000000',
    emissiveIntensity: definition.emissiveIntensity ?? 0,
    transparent: definition.transparent ?? false,
    opacity: definition.opacity ?? 1,
    side: THREE.DoubleSide,
  });
}

function addLighting(scene, lighting = {}) {
  scene.add(new THREE.HemisphereLight('#d8e0ee', '#1a1512', lighting.ambient ?? 0.48));
  const key = new THREE.DirectionalLight(lighting.keyColor ?? '#f4dfc5', lighting.keyIntensity ?? 2.0);
  key.position.copy(vec(lighting.keyPosition, [-4, 5, 6]));
  scene.add(key);
  const rim = new THREE.DirectionalLight(lighting.rimColor ?? '#df783d', lighting.rimIntensity ?? 2.2);
  rim.position.copy(vec(lighting.rimPosition, [4, 2, -3]));
  scene.add(rim);
}

function resolveUniqueNode(root, name) {
  const matches = [];
  root.traverse((object) => { if (object.name === name) matches.push(object); });
  if (matches.length !== 1) {
    throw new Error(`GLTF node "${name}" matched ${matches.length} objects. Names must be unique; inspect and rename the model.`);
  }
  return matches[0];
}

function wrapExistingNode(node, parent) {
  const wrapper = new THREE.Group();
  wrapper.name = `animated:${node.name}`;
  const basePosition = node.position.clone();
  const baseQuaternion = node.quaternion.clone();
  const baseScale = node.scale.clone();
  parent.add(wrapper);
  wrapper.position.copy(basePosition);
  wrapper.quaternion.copy(baseQuaternion);
  wrapper.scale.copy(baseScale);
  node.position.set(0, 0, 0);
  node.quaternion.identity();
  node.scale.set(1, 1, 1);
  wrapper.add(node);
  return { wrapper, basePosition, baseQuaternion };
}

function createRotationStates(part) {
  const base = part.rotation ?? [0, 0, 0];
  return {
    intro: quatFromEuler(part.introRotation ?? base),
    rest: quatFromEuler(part.restRotation ?? base),
    exploded: quatFromEuler(part.explodedRotation ?? part.restRotation ?? base),
    temp: new THREE.Quaternion(),
  };
}

async function buildParts(spec, root) {
  const map = new Map();
  if (spec.source.type === 'gltf') {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(spec.source.url);
    const assetRoot = spec.source.rootName ? resolveUniqueNode(gltf.scene, spec.source.rootName) : gltf.scene;
    const resolved = spec.parts.map((part) => ({ part, node: resolveUniqueNode(assetRoot, part.nodeName) }));
    const selectedNodes = new Set(resolved.map(({ node }) => node));
    for (const { part, node } of resolved) {
      if (!node.parent) throw new Error(`GLTF node "${part.nodeName}" is the scene root and cannot be animated as an independent part.`);
      let ancestor = node.parent;
      while (ancestor) {
        if (selectedNodes.has(ancestor)) {
          throw new Error(`GLTF parts cannot map both an ancestor and its descendant (conflict near "${part.nodeName}"). Map non-overlapping nodes so transforms do not compound.`);
        }
        ancestor = ancestor.parent;
      }
    }
    root.add(gltf.scene);
    for (const { part, node } of resolved) {
      const { wrapper, basePosition, baseQuaternion } = wrapExistingNode(node, node.parent);
      map.set(part.id, { wrapper, basePosition, baseQuaternion, boundsCenterLocal: new THREE.Vector3(), rotationStates: createRotationStates(part), spec: part });
    }
    return map;
  }

  for (const part of spec.parts) {
    const wrapper = new THREE.Group();
    wrapper.name = `part:${part.id}`;
    const mesh = new THREE.Mesh(createGeometry(part.geometry), createMaterial(part.material));
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    wrapper.add(mesh);
    root.add(wrapper);
    map.set(part.id, { wrapper, basePosition: new THREE.Vector3(), baseQuaternion: new THREE.Quaternion(), boundsCenterLocal: new THREE.Vector3(), rotationStates: createRotationStates(part), spec: part });
  }
  return map;
}

function phaseLocalTransform(partState, progress, phases, rank, count) {
  const part = partState.spec;
  const rest = vec(part.rest);
  const intro = vec(part.intro, part.exploded ?? part.rest);
  const exploded = vec(part.exploded, part.rest);
  const rotations = partState.rotationStates;
  let position = intro.clone();
  const rotation = rotations.temp.copy(rotations.intro);
  const assemble = phaseAmount(progress, phases.assemble, rank, count);
  position.lerp(rest, assemble);
  rotation.slerp(rotations.rest, assemble);
  if (phases.explode && progress >= phases.explode.from) {
    const explode = phaseAmount(progress, phases.explode, rank, count);
    position.copy(rest).lerp(exploded, explode);
    rotation.copy(rotations.rest).slerp(rotations.exploded, explode);
  }
  if (phases.reassemble && progress >= phases.reassemble.from) {
    const reassemble = phaseAmount(progress, phases.reassemble, rank, count);
    position.copy(exploded).lerp(rest, reassemble);
    rotation.copy(rotations.exploded).slerp(rotations.rest, reassemble);
  }
  return { position, rotation };
}

function waypointPose(waypoint, partMap) {
  if (waypoint.focusPart) {
    const state = partMap.get(waypoint.focusPart);
    if (!state) throw new Error(`Camera waypoint references missing part "${waypoint.focusPart}".`);
    const center = state.wrapper.localToWorld(state.boundsCenterLocal.clone());
    return {
      position: center.clone().add(vec(waypoint.offset, [0.5, 0.3, 2.8])),
      target: center,
    };
  }
  return { position: vec(waypoint.position), target: vec(waypoint.target) };
}

function disposeTree(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const imageBitmaps = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of list) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) {
          textures.add(value);
          const images = Array.isArray(value.image) ? value.image : [value.image];
          for (const image of images) if (image && typeof image.close === 'function') imageBitmaps.add(image);
        }
      }
    }
  });
  textures.forEach((texture) => texture.dispose());
  imageBitmaps.forEach((bitmap) => bitmap.close());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

export async function createScroll3DExperience({ canvas, spec, onStatus = () => {} }) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('A valid canvas element is required.');
  if (!spec || !Array.isArray(spec.parts) || !spec.scene) throw new TypeError('A valid scroll-3D scene spec is required.');

  const scene = new THREE.Scene();
  const transparentCanvas = spec.scene.transparent !== false;
  scene.background = transparentCanvas ? null : new THREE.Color(spec.scene.background ?? '#08090c');
  if (spec.scene.fog) scene.fog = new THREE.Fog(spec.scene.fog.color, spec.scene.fog.near, spec.scene.fog.far);
  const cameraConfig = spec.scene.camera;
  const camera = new THREE.PerspectiveCamera(cameraConfig.fov ?? 35, 1, cameraConfig.near ?? 0.1, cameraConfig.far ?? 100);
  camera.position.copy(vec(cameraConfig.position, [0, 0, 6]));
  const initialTarget = vec(cameraConfig.target, [0, 0, 0]);
  camera.lookAt(initialTarget);
  addLighting(scene, spec.scene.lighting);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    onStatus({ type: 'webgl-unavailable', error });
    throw error;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(spec.scene.background ?? '#08090c', transparentCanvas ? 0 : 1);
  const maxDpr = () => Math.min(spec.quality?.maxDpr ?? 1.8, window.matchMedia('(max-width: 700px)').matches ? 1.35 : 2, window.devicePixelRatio || 1);

  const root = new THREE.Group();
  scene.add(root);
  let partMap;
  try {
    partMap = await buildParts(spec, root);
  } catch (error) {
    disposeTree(scene);
    renderer.dispose();
    onStatus({ type: 'asset-error', error });
    throw error;
  }

  scene.updateMatrixWorld(true);
  for (const state of partMap.values()) {
    const bounds = new THREE.Box3().setFromObject(state.wrapper);
    const center = bounds.isEmpty()
      ? state.wrapper.getWorldPosition(new THREE.Vector3())
      : bounds.getCenter(new THREE.Vector3());
    state.boundsCenterLocal.copy(state.wrapper.worldToLocal(center));
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const staticProgress = clamp01((spec.phases?.assemble?.to ?? 0.18) + 0.01);
  let targetProgress = reducedMotion.matches ? staticProgress : 0;
  let currentProgress = targetProgress;
  let running = false;
  let inView = true;
  let disposed = false;
  let frameCount = 0;
  const frameSamples = [];
  const damp = spec.quality?.damping ?? 8;
  const clock = new THREE.Clock();
  const cameraTarget = initialTarget.clone();
  const mobileCameraQuery = window.matchMedia('(max-width: 700px)');
  const sortedParts = [...spec.parts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  function resize() {
    const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(maxDpr());
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updateParts(progress) {
    sortedParts.forEach((part, rank) => {
      const state = partMap.get(part.id);
      const transform = phaseLocalTransform(state, progress, spec.phases, rank, sortedParts.length);
      state.wrapper.position.copy(state.basePosition).add(transform.position);
      state.wrapper.quaternion.copy(state.baseQuaternion).multiply(transform.rotation);
    });
  }

  function updateCamera(progress) {
    const useMobilePath = mobileCameraQuery.matches && Array.isArray(spec.camera.mobileWaypoints) && spec.camera.mobileWaypoints.length >= 2;
    const points = useMobilePath ? spec.camera.mobileWaypoints : spec.camera.waypoints;
    if (!points?.length) return;
    if (points.length === 1) {
      const pose = waypointPose(points[0], partMap);
      camera.position.copy(pose.position);
      cameraTarget.copy(pose.target);
      camera.lookAt(cameraTarget);
      return;
    }
    let right = points.findIndex((point) => point.at >= progress);
    if (right === -1) right = points.length - 1;
    if (right === 0) right = Math.min(1, points.length - 1);
    const left = Math.max(0, right - 1);
    const a = points[left];
    const b = points[right];
    const span = Math.max(0.000001, b.at - a.at);
    const local = clamp01((progress - a.at) / span);
    const eased = b.easing === 'linear' ? local : smoothstep(local);
    const poseA = waypointPose(a, partMap);
    const poseB = waypointPose(b, partMap);
    camera.position.copy(poseA.position).lerp(poseB.position, eased);
    cameraTarget.copy(poseA.target).lerp(poseB.target, eased);
    camera.lookAt(cameraTarget);
  }

  function tick() {
    if (disposed) return;
    const delta = Math.min(clock.getDelta(), 0.05);
    const alpha = 1 - Math.exp(-delta * damp);
    currentProgress += (targetProgress - currentProgress) * alpha;
    if (Math.abs(targetProgress - currentProgress) < 0.0004) currentProgress = targetProgress;
    updateParts(currentProgress);
    scene.updateMatrixWorld(true);
    updateCamera(currentProgress);
    renderer.render(scene, camera);

    if (frameCount < 36) {
      frameSamples.push(delta * 1000);
      frameCount += 1;
      if (frameCount === 36) {
        const ordered = [...frameSamples].sort((a, b) => a - b);
        const median = ordered[Math.floor(ordered.length / 2)];
        if (median > 40) onStatus({ type: 'low-performance', medianFrameMs: median });
        else onStatus({ type: 'ready', medianFrameMs: median });
      }
    }
  }

  function syncLoop() {
    const shouldRun = !disposed && inView && !document.hidden && !reducedMotion.matches;
    if (shouldRun && !running) {
      clock.start();
      renderer.setAnimationLoop(tick);
      running = true;
    } else if (!shouldRun && running) {
      renderer.setAnimationLoop(null);
      running = false;
    }
  }

  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(canvas.parentElement ?? canvas);
  const intersectionObserver = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncLoop();
  }, { threshold: 0.01 }) : null;
  intersectionObserver?.observe(canvas);
  const onWindowResize = () => resize();
  if (!resizeObserver) window.addEventListener('resize', onWindowResize);
  if (!intersectionObserver) inView = true;
  const onVisibility = () => syncLoop();
  document.addEventListener('visibilitychange', onVisibility);
  const onReducedMotion = (event) => {
    if (event.matches) {
      targetProgress = staticProgress;
      currentProgress = staticProgress;
      updateParts(currentProgress);
      scene.updateMatrixWorld(true);
      updateCamera(currentProgress);
      renderer.render(scene, camera);
      syncLoop();
      onStatus({ type: 'reduced-motion' });
    } else {
      syncLoop();
    }
  };
  reducedMotion.addEventListener?.('change', onReducedMotion);
  resize();
  if (reducedMotion.matches) {
    updateParts(currentProgress);
    scene.updateMatrixWorld(true);
    updateCamera(currentProgress);
    renderer.render(scene, camera);
    onStatus({ type: 'reduced-motion' });
  } else {
    syncLoop();
  }

  return {
    setProgress(value) {
      if (reducedMotion.matches) return;
      targetProgress = clamp01(Number(value) || 0);
    },
    getProgress() { return currentProgress; },
    resize,
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion.removeEventListener?.('change', onReducedMotion);
      disposeTree(scene);
      renderer.dispose();
      running = false;
    },
  };
}

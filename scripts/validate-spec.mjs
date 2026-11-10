#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
if (!input || input === '--help' || input === '-h') {
  console.log('Usage: node scripts/validate-spec.mjs path/to/scene.json');
  process.exit(input ? 0 : 2);
}

let spec;
try {
  spec = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
} catch (error) {
  console.error(`Could not read valid JSON: ${error.message}`);
  process.exit(2);
}

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isVector3 = (value) => Array.isArray(value) && value.length === 3 && value.every(isNumber);
const in01 = (n) => isNumber(n) && n >= 0 && n <= 1;

if (!isObject(spec)) fail('Root must be a JSON object.');
if (spec?.version !== '1.0') fail('version must be "1.0".');
if (!isObject(spec?.source) || !['procedural', 'gltf'].includes(spec.source.type)) fail('source.type must be "procedural" or "gltf".');
if (spec?.source?.type === 'gltf' && (typeof spec.source.url !== 'string' || !spec.source.url.trim())) fail('source.url is required when source.type is "gltf".');
if (!isObject(spec?.scene)) fail('scene must be an object.');
if (typeof spec?.scene?.background !== 'string') fail('scene.background must be a CSS color string.');
if (!isObject(spec?.scene?.lighting)) fail('scene.lighting must define the scene lighting.');
if (!isObject(spec?.scene?.camera)) fail('scene.camera must define the default camera.');
for (const key of ['fov', 'near', 'far']) {
  if (!isNumber(spec?.scene?.camera?.[key]) || spec.scene.camera[key] <= 0) fail(`scene.camera.${key} must be a positive number.`);
}
if (isNumber(spec?.scene?.camera?.fov) && spec.scene.camera.fov >= 180) fail('scene.camera.fov must be less than 180 degrees.');
if (isNumber(spec?.scene?.camera?.near) && isNumber(spec?.scene?.camera?.far) && spec.scene.camera.far <= spec.scene.camera.near) fail('scene.camera.far must be greater than scene.camera.near.');
for (const key of ['position', 'target']) {
  if (!isVector3(spec?.scene?.camera?.[key])) fail(`scene.camera.${key} must be a numeric [x, y, z] vector.`);
}
if (!Array.isArray(spec?.parts) || spec.parts.length === 0) fail('parts must contain at least one part.');

const ids = new Set();
const nodeNames = new Set();
for (const [index, part] of (Array.isArray(spec?.parts) ? spec.parts : []).entries()) {
  const prefix = `parts[${index}]`;
  if (!isObject(part)) { fail(`${prefix} must be an object.`); continue; }
  if (typeof part.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(part.id)) fail(`${prefix}.id must use lowercase letters, numbers, and hyphens.`);
  if (ids.has(part.id)) fail(`Duplicate part id "${part.id}".`);
  ids.add(part.id);
  if (typeof part.label !== 'string' || !part.label.trim()) fail(`${prefix}.label is required.`);
  if (!isVector3(part.rest)) fail(`${prefix}.rest must be [x, y, z].`);
  for (const vectorKey of ['intro', 'exploded', 'rotation', 'introRotation', 'restRotation', 'explodedRotation']) {
    if (part[vectorKey] !== undefined && !isVector3(part[vectorKey])) fail(`${prefix}.${vectorKey} must be [x, y, z].`);
  }
  if (spec?.source?.type === 'procedural') {
    if (!isObject(part.geometry)) fail(`${prefix}.geometry is required for procedural scenes.`);
    else if (!['box', 'sphere', 'cylinder', 'torus', 'cone', 'ring', 'lathe'].includes(part.geometry.type)) fail(`${prefix}.geometry.type is not supported by the starter runtime.`);
  }
  if (spec?.source?.type === 'gltf') {
    if (typeof part.nodeName !== 'string' || !part.nodeName.trim()) fail(`${prefix}.nodeName is required for GLTF scenes.`);
    else if (nodeNames.has(part.nodeName)) fail(`Duplicate GLTF nodeName "${part.nodeName}". Each animated part must map to one unique model node.`);
    else nodeNames.add(part.nodeName);
  }
  if (part.geometry) {
    for (const field of ['radius', 'height', 'tube']) {
      if (part.geometry[field] !== undefined && (!isNumber(part.geometry[field]) || part.geometry[field] <= 0)) fail(`${prefix}.geometry.${field} must be a positive number.`);
    }
    for (const field of ['radiusTop', 'radiusBottom']) {
      if (part.geometry[field] !== undefined && (!isNumber(part.geometry[field]) || part.geometry[field] < 0)) fail(`${prefix}.geometry.${field} must be a non-negative number.`);
    }
    if (part.geometry.type === 'cylinder' && part.geometry.radiusTop === 0 && part.geometry.radiusBottom === 0) fail(`${prefix}.geometry cylinder cannot have both radii set to zero.`);
    if (part.geometry.type === 'box') {
      if (!isVector3(part.geometry.size)) fail(`${prefix}.geometry.size is required for box geometry.`);
      else if (part.geometry.size.some((dimension) => dimension <= 0)) fail(`${prefix}.geometry.size dimensions must all be positive.`);
    }
    if (part.geometry.type === 'lathe') {
      if (!Array.isArray(part.geometry.points) || part.geometry.points.length < 3) fail(`${prefix}.geometry.points must contain at least three [radius, height] pairs for lathe geometry.`);
      else part.geometry.points.forEach((point, pointIndex) => {
        if (!Array.isArray(point) || point.length !== 2 || !point.every(isNumber) || point[0] < 0) fail(`${prefix}.geometry.points[${pointIndex}] must be [non-negative radius, height].`);
      });
    }
    if (part.geometry.segments !== undefined && (!Number.isInteger(part.geometry.segments) || part.geometry.segments < 3)) fail(`${prefix}.geometry.segments must be an integer >= 3.`);
    if (part.geometry.radiusInner !== undefined && part.geometry.radiusOuter !== undefined && part.geometry.radiusInner >= part.geometry.radiusOuter) fail(`${prefix}.geometry.radiusInner must be smaller than radiusOuter.`);
  }
  if (part.material?.metalness !== undefined && (!isNumber(part.material.metalness) || part.material.metalness < 0 || part.material.metalness > 1)) fail(`${prefix}.material.metalness must be between 0 and 1.`);
  if (part.material?.roughness !== undefined && (!isNumber(part.material.roughness) || part.material.roughness < 0 || part.material.roughness > 1)) fail(`${prefix}.material.roughness must be between 0 and 1.`);
  if (part.material?.opacity !== undefined && (!isNumber(part.material.opacity) || part.material.opacity < 0 || part.material.opacity > 1)) fail(`${prefix}.material.opacity must be between 0 and 1.`);
}

for (const phaseName of ['assemble', 'explode']) {
  const phase = spec?.phases?.[phaseName];
  if (!isObject(phase)) { fail(`phases.${phaseName} is required.`); continue; }
  if (!in01(phase.from) || !in01(phase.to) || phase.from >= phase.to) fail(`phases.${phaseName} must have 0 <= from < to <= 1.`);
  if (!isNumber(phase.stagger) || phase.stagger < 0) fail(`phases.${phaseName}.stagger must be a non-negative number.`);
  if (!isNumber(phase.window) || phase.window <= 0 || phase.window > 1) fail(`phases.${phaseName}.window must be greater than 0 and at most 1.`);
  if (isNumber(phase.stagger) && isNumber(phase.window) && Array.isArray(spec?.parts) && spec.parts.length > 0) {
    const needed = (spec.parts.length - 1) * phase.stagger + phase.window;
    if (needed > 1.000001) fail(`phases.${phaseName} stagger overflow: (parts - 1) * stagger + window = ${needed.toFixed(3)}; must be <= 1.`);
  }
}
const assemble = spec?.phases?.assemble;
const explode = spec?.phases?.explode;
if (isNumber(assemble?.to) && isNumber(explode?.from) && assemble.to > explode.from) fail('phases.assemble must finish before phases.explode begins.');
const reassemble = spec?.phases?.reassemble;
if (reassemble) {
  if (isNumber(explode?.to) && isNumber(reassemble.from) && explode.to > reassemble.from) fail('phases.explode must finish before phases.reassemble begins.');
  if (!in01(reassemble.from) || !in01(reassemble.to) || reassemble.from >= reassemble.to) fail('phases.reassemble must have 0 <= from < to <= 1.');
  if (!isNumber(reassemble.stagger) || reassemble.stagger < 0) fail('phases.reassemble.stagger must be a non-negative number.');
  if (!isNumber(reassemble.window) || reassemble.window <= 0 || reassemble.window > 1) fail('phases.reassemble.window must be greater than 0 and at most 1.');
  if (isNumber(reassemble.stagger) && isNumber(reassemble.window) && Array.isArray(spec?.parts) && spec.parts.length > 0) {
    const needed = (spec.parts.length - 1) * reassemble.stagger + reassemble.window;
    if (needed > 1.000001) fail(`phases.reassemble stagger overflow: required window is ${needed.toFixed(3)}; must be <= 1.`);
  }
}

const waypoints = spec?.camera?.waypoints;
if (!Array.isArray(waypoints) || waypoints.length < 2) fail('camera.waypoints must contain at least two points.');
function validateWaypoints(points, label) {
  if (!Array.isArray(points) || points.length < 2) { fail(`${label} must contain at least two points.`); return; }
  if (points[0]?.at !== 0) warn(`The first ${label} waypoint should normally start at at: 0.`);
  if (points.at(-1)?.at !== 1) warn(`The last ${label} waypoint should normally end at at: 1.`);
  let previous = -Infinity;
  for (const [index, point] of points.entries()) {
    if (!isObject(point) || !in01(point.at)) fail(`${label}[${index}].at must be between 0 and 1.`);
    else if (point.at <= previous) fail(`${label} must be strictly increasing by at.`);
    if (isObject(point)) {
      previous = point.at;
      const absolute = isVector3(point.position) && isVector3(point.target);
      const focused = typeof point.focusPart === 'string' && isVector3(point.offset);
      if (!absolute && !focused) fail(`${label}[${index}] must have position+target or focusPart+offset.`);
      if (focused && !ids.has(point.focusPart)) fail(`${label}[${index}] references unknown focusPart "${point.focusPart}".`);
    }
  }
}
validateWaypoints(waypoints, 'camera.waypoints');
if (spec?.camera?.mobileWaypoints !== undefined) validateWaypoints(spec.camera.mobileWaypoints, 'camera.mobileWaypoints');
if (spec?.source?.type === 'procedural' && Array.isArray(spec.parts) && spec.parts.length > 24) warn('More than 24 procedural parts may increase draw calls. Consider instancing repeated details or using a GLB.');
if (spec?.quality?.maxDpr !== undefined && (!isNumber(spec.quality.maxDpr) || spec.quality.maxDpr < 1 || spec.quality.maxDpr > 3)) fail('quality.maxDpr must be between 1 and 3.');

if (warnings.length) {
  console.warn('\nWarnings:');
  for (const warning of warnings) console.warn(`  - ${warning}`);
}
if (errors.length) {
  console.error(`\nSpec validation failed (${errors.length} error${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`\n✓ Spec validation passed: ${path.resolve(input)}`);
console.log(`  ${spec.parts.length} parts · ${waypoints.length} camera waypoints · ${reassemble ? '3' : '2'} choreography phases`);

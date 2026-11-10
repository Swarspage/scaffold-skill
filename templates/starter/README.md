# Starter template

A small Vite site demonstrating the procedural watch spec, the framework-neutral Three.js runtime, and a GSAP ScrollTrigger adapter.

```bash
npm install
npm run dev
npm run build
```

The runnable demo keeps a local copy at `src/watch.json`; the canonical sample is `assets/examples/watch.json` at the skill root. Copy the spec you want into the starter and update `src/watch-spec.js`.

The runtime supports `box`, `sphere`, `cylinder`, `torus`, `cone`, `ring`, and `lathe` procedural geometry. Lathe profiles use `geometry.points` as `[radius, height]` pairs. The scene spec can also provide `camera.mobileWaypoints` to give the mobile composition its own framing path. Validate the spec before running it.

For GLB/GLTF, set `source.type` to `gltf`, set `source.url`, and give every part a unique `nodeName` matching an object name in the model. Run the GLB inspector and verify the result in a browser first.

The demo intentionally uses no Lenis dependency. Add Lenis only when the project needs its smooth-scroll behavior, and follow `references/06-scroll-systems.md` for synchronization and cleanup.

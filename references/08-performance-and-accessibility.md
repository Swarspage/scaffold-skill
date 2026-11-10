# Performance, lifecycle, and accessibility

## Renderer and GPU budget

- Cap device pixel ratio. Start around `1.5` on constrained/mobile devices and no more than `2` on desktop unless profiling justifies more.
- Resize from a `ResizeObserver` on the actual canvas container; update camera aspect and renderer size together.
- Keep draw calls under control. Use `InstancedMesh` for repeated identical parts (keyboard keys, particles) when it reduces actual overhead.
- Limit shadow-casting lights and shadow-map sizes. Real-time shadows can dominate GPU cost.
- Avoid unnecessary post-processing, high subdivision, transparent layers, and large textures.
- Dynamically import Three.js or the scene module when it would otherwise delay initial content.
- Pause rendering when the canvas is off-screen and when the document is hidden.
- Prefer `renderer.setAnimationLoop()` for the renderer loop. Stop it during teardown.
- Dispose geometries, materials, textures, render targets, and renderer resources. Treat shared resources carefully; dispose each unique object once.

## Frame-rate-independent motion

Use exponential damping:

`alpha = 1 - exp(-deltaSeconds * damping)`

Do not use a constant per-frame interpolation factor; it changes the feel across 30, 60, and 120 FPS.

## Performance fallback

Do not rely exclusively on `navigator.hardwareConcurrency` or `navigator.deviceMemory` to decide whether WebGL will perform well. These are rough hints, can be unavailable, and do not measure GPU capability. Prefer a safe default, a short frame-time sample, and a user-visible fallback.

If performance is poor:
- reduce DPR;
- lower particle counts and shadow quality;
- simplify geometry and disable expensive effects;
- switch to a poster/static DOM state when necessary.

The starter emits a low-performance status after its initial frame sample. The host page must decide whether to lower quality or reveal its static fallback.

## Reduced motion

Respect `prefers-reduced-motion: reduce`:
- Do not require scroll to reveal essential information.
- Prefer a stable assembled object or static poster over large camera movement.
- Disable pointer parallax and nonessential particles.
- Remove or greatly reduce scrubbed movement and long pinned sections.
- Keep all text and controls available in the DOM.

Reduced motion is a functional mode, not merely shorter durations.

## Accessibility

- Mark the canvas `aria-hidden="true"` when it is decorative. Provide equivalent meaningful product information in HTML.
- Keep headings, details, labels, and CTAs semantic and keyboard accessible.
- Do not use color or motion as the only way to understand a part or state.
- Provide keyboard alternatives for interactive 3D objects; do not make hover the only interaction.
- Ensure overlays and drawers have focus management, Escape behavior, and visible focus styles.
- Check color contrast over the actual background, not only on a flat token swatch.
- Avoid scroll hijacking. Users must still be able to use touch, keyboard, scrollbar, and browser navigation.

## Cleanup checklist

On component/page teardown:
- stop the animation loop;
- disconnect `ResizeObserver` and `IntersectionObserver`;
- remove event listeners;
- kill/revert GSAP contexts and ScrollTriggers;
- destroy Lenis if it was used;
- dispose each unique geometry, material, texture, render target, and renderer;
- release any `ImageBitmap` or external resource that the loader created and the app owns.

## Mobile 3D is a composition problem first

A narrow viewport does not automatically justify removing the 3D scene. Before using a fallback:

- Create mobile-specific camera waypoints when the desktop camera crops the object.
- Reduce particle count, shadow quality, DPR, reflection complexity and render resolution before removing the main object.
- Shorten pinned sequences and avoid long desktop-only horizontal tracks.
- Place copy/cards in a vertical layout that reserves room for the object.
- Keep one recognizable primary 3D object visible throughout the mobile story.

Use a static fallback only when WebGL is unavailable, a low-performance probe fails, the user prefers reduced motion, or the scene cannot meet the device budget after simplification. The fallback should use a real product render/reference image or an accurate designed illustration, not an empty color field.

# Object choreography and camera rails

## Pattern A: object choreography

Use when the object is the star and the camera stays mostly still.

Each part has:
- `intro`: where it starts (often scattered around the object).
- `rest`: where it belongs when assembled.
- `exploded`: where it moves during the exploded view.
- `introRotation`, `restRotation`, `explodedRotation`: optional Euler orientations in radians for those states; each is interpolated with quaternion slerp.
- `order`: its position in the stagger sequence.

The scene runtime uses one normalized progress value. Each part's local phase progress is:

```js
const local = clamp01((phaseProgress - rank * stagger) / window);
```

Then it interpolates `intro → rest` during assembly, `rest → exploded` during explosion, and (when present) `exploded → rest` during reassembly.

This is the general form of the gym site's reported formula. Its specific values (`delay 0.14`, `window 0.44`) belong to that five-part barbell and should not be copied as universal settings.

## Pattern B: camera rails

Use when the visitor travels through a 3D environment or a long object/space.

- Define camera waypoints at normalized positions from `0` to `1`.
- A waypoint can specify absolute `position` + `target`, or `focusPart` + `offset`.
- The runtime interpolates between neighboring waypoints.
- Per-segment easing creates a “stop at stations” rhythm. For continuous flight, use a real curve such as `THREE.CatmullRomCurve3` and test overshoot and clearance.

The desk portfolio report described its implementation as piecewise interpolation between seven camera waypoints with easing per segment—not a continuous spline. Treat those as two different approaches.

## Pattern C: combine object + camera

Use both only when the narrative explicitly calls for it, e.g.:

`assembled overview → explode → camera visits movement → camera visits crown → reassemble → final CTA`

Do not animate the camera and every part aggressively at the same moment. Give each visual idea its own time window so the viewer can understand the object.

## Framing a component

For a focused part:

1. Update the scene's world matrices.
2. Compute a `THREE.Box3` from the part group.
3. Get the bounding sphere or center.
4. Set the look-at target to the center.
5. Choose the camera offset from the part radius, field of view, and desired composition.
6. Recompute on resize or when the target model changes.

The starter runtime supports `focusPart` plus an explicit `offset`; it does not attempt to infer a cinematic angle from semantic object knowledge. The agent should choose an offset based on the part's orientation and visual importance.

## Visual rhythm

A dependable default narrative is:

1. **Arrival:** assembled object, clear headline, one concise promise.
2. **Hold:** let the viewer read and identify the product.
3. **Explode:** stagger parts in a readable order; label the parts in the DOM.
4. **Inspect:** camera approaches one or more meaningful parts.
5. **Reassemble or transition:** restore the object or move to the next content section.
6. **Conversion:** show the actual CTA after the main visual has finished its story.

This is a starting framework, not a mandatory formula. A product may need only an assembly and a single detail focus.

## Responsive camera paths

If the scene becomes crowded or cropped on a narrow viewport, define `camera.mobileWaypoints` in the scene spec. The runtime chooses this path below 700px. Use it to widen the camera offset and preserve the whole object during opening/closing beats; component close-ups can remain, but use more generous offsets on mobile. Do not solve mobile composition by hiding the canvas.

Mobile camera waypoints use the same `at`, `position`/`target` or `focusPart`/`offset` structure and the same normalized scroll progress as desktop. Validate both sets with `scripts/validate-spec.mjs`.

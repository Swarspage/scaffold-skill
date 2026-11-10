# Portable scene specification

## Why a spec exists

Coding agents should not improvise the object hierarchy, timing math, and camera path in one giant component. First describe the scene in a small, inspectable contract. The runtime and browser code then implement that contract.

The canonical schema is `assets/schema/scene-spec.schema.json`. Examples:

- `assets/examples/watch.json` — procedural assembly/explosion with part-focused camera waypoints.
- `assets/examples/speaker.json` — procedural object with fewer components.
- `assets/examples/camera-tour.json` — camera waypoints through a scene rather than a single exploded product.

Run:

```bash
node scripts/validate-spec.mjs assets/examples/watch.json
```

## Main fields

| Field | Meaning |
| --- | --- |
| `version` | Spec version. V1 is `1.0`. |
| `source.type` | `procedural` or `gltf`. |
| `source.url` | GLB/GLTF URL or project-relative asset path when `source.type` is `gltf`. |
| `scene` | Background, fog, camera defaults, and lighting. |
| `parts[]` | Stable IDs, geometry or GLTF node mapping, material, rest/intro/exploded offsets, optional Euler rotations for each state, and choreography order. |
| `phases` | Normalized assembly, explosion, and optional reassembly intervals. |
| `camera.waypoints[]` | Desktop normalized scroll positions and either absolute targets or `focusPart` + offset. |
| `camera.mobileWaypoints[]` | Optional mobile-specific path using the same waypoint structure; use when the desktop camera crops the object at narrow widths. |
| `quality` | Suggested DPR and render-loop behavior. |

## Coordinate conventions

- Use one consistent local coordinate system per object.
- `rest` is the final assembled local position for procedural parts. For GLTF nodes, it is an offset from the original node transform; leave it `[0,0,0]` unless the spec needs an additional local offset.
- `intro` is the scattered/starting local position. If absent, it defaults to `exploded`.
- `exploded` is the destination offset for the exploded state. If absent, it defaults to `rest`.
- Rotation values are Euler angles in radians. `rotation` is the default orientation; `introRotation`, `restRotation`, and `explodedRotation` override it for each story state. Orientations are interpolated as quaternions to avoid awkward Euler interpolation.
- The runtime and spec use local coordinates. Camera waypoints are world-space coordinates.

## Normalized progress

All scroll systems must send one number in the range `0..1`:

- `0` — first frame of the story.
- `1` — last frame of the story.
- A phase has `from` and `to` positions in that same range.
- Within the phase, each part gets a local staggered progress value.

The per-part delay is normalized to the phase, not the full page. For `n` parts:

`(n - 1) * stagger + window <= 1`

The validator checks this constraint so the final part has time to finish inside the phase.

## Authoring rules

- Use descriptive stable IDs like `watch-case`, `bezel`, `dial`, `left-door`, not `mesh-12`.
- Keep the number of parts purposeful. Too many moving parts create visual noise and increase draw calls.
- Keep geometry dimensions and the story in the same scale. A single tiny gear should not need a camera move from 50 units away.
- Use a `focusPart` waypoint for a meaningful component close-up. The runtime derives its bounding box center; the author supplies a camera offset.
- Use absolute camera position/target waypoints when the narrative is about traveling through a room or along a spatial environment.
- Keep the examples as examples. Recalculate dimensions, part positions, and camera offsets for the user's actual object.

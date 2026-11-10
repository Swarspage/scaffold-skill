# Geometry and asset strategy

## Start with fidelity, not convenience

Ask: what exact object is requested, how recognizable must it be, and what reference/model evidence is available? Do not start by choosing primitives.

For branded, iconic, organic, or mechanically detailed products, research the exact product and search for a model before deciding to construct it procedurally. Follow `references/02-research-and-asset-discovery.md` and keep the report.

## Procedural geometry

Use procedural geometry when the form is simple enough to be intentionally designed and the user accepts the fidelity level. The silhouette must be credible in neutral lighting before materials and effects.

Suitable targets include stylized dumbbells, simple speakers, geometric sculptures, abstract devices, and some rotationally symmetric vessels.

### Prefer the right geometry primitive

- Boxes/cylinders/spheres are building blocks, not a complete object design language.
- Use `LatheGeometry` for rotational profiles such as bottles, vases, knobs and some containers. Define a radius-versus-height profile with enough control points to describe the base, heel, body, shoulder, neck and lip as one coherent silhouette. Increase radial segments to avoid obvious faceting.
- Use custom curves/extrusions or a suitable model for non-rotational organic forms.
- Use real geometry boundaries for parts that actually separate. Avoid arbitrary cuts that make an exploded view visually convenient but physically meaningless.

### Bottle/can anti-pattern

A real bottle is not a stack of cylinders and cones. That creates hard steps, no shoulder transition, and no recognizable contour—the exact failure seen in the first Coca-Cola attempt. For a bottle:

1. Obtain side/profile references and dimensions where possible.
2. Build the body from one continuous `LatheGeometry` profile or use a real model.
3. Make cap, seal, label, glass body and any genuinely separate components distinct parts.
4. Match label curvature to the body; avoid a square/flat label floating in front of the bottle.
5. Use physically plausible glass settings, controlled thickness/opacity, and environment reflections. A transparent dark-green material without reflections can read as opaque plastic.
6. Validate the silhouette from front and three-quarter views before adding glow or particles.

The `assets/examples/contour-bottle.json` file demonstrates a deliberately stylized, unbranded profile built with `LatheGeometry`. It is a geometry teaching example—not a photorealistic or brand-accurate bottle and not a replacement for a researched/licensed model.

## GLB/GLTF model

Use a model when the object must look like a specific branded product, sneaker, vehicle, animal, human, or mechanically detailed device.

Before writing animation code:

1. Confirm the user supplied the model or its listing and intended-use license are verified.
2. Run `python scripts/inspect-gltf.py path/to/model.glb > model-inspection.json`.
3. Inspect mesh node names, parent paths, transforms, primitive/material metadata, local position bounds, and duplicates.
4. Check whether important parts are truly separate nodes (e.g. `body`, `left-door`, `right-door`, `engine`, `steering-wheel`).
5. Inspect scale, origin, orientation, texture dependencies and total geometry complexity.
6. Check the model in a viewer/browser. The inspector reads structure; it does not establish rendered quality or license compliance.
7. Keep parent/child selection non-overlapping. Mapping both a parent and descendant to independent animation wrappers compounds transforms.

### Combined-mesh warning

A GLB can be valid but unsuitable for a part-level exploded view. One combined car mesh cannot independently move its doors and engine. A material group is not automatically a physical part. Find a properly separated model, split it in a real 3D editing workflow, or change the story to camera inspection/surface highlights rather than claiming a true exploded view.

## Asset licensing and brand use

- Preserve the source listing, creator, license text/URL, attribution and restrictions.
- Unknown or ambiguous license means do not use the asset in a published project until clarified.
- Do not bypass payments, account gates, access restrictions or download protections.
- Do not remove embedded attribution/creator information when required.
- Do not imply brand endorsement or authenticity of a third-party model.
- For commercial use, verify commercial-use and modification rights for the specific asset and intended distribution. Do not infer permission from the platform's general terms.

## Three distinct visual techniques

1. **Live 3D:** actual Three.js/WebGL scene and geometry; can be camera-controlled and part-animated.
2. **Scroll-scrubbed video/image sequence:** a set of frames or video rendered elsewhere and mapped to scroll; visually 3D-like but not a live model.
3. **Cursor mask/image reveal:** layered 2D images revealed by CSS mask or shader; not a 3D object.

Do not substitute one technique for another without telling the user. V1's main runtime supports live 3D; video scrubbing and cursor masks should be separate modules.

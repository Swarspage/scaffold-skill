# Research-first asset discovery

## Purpose

Recognizable products must not be invented from vague memory. Before modelling a branded, organic, iconic, or mechanically complex object, research the actual object and choose an evidence-backed asset strategy.

This stage is mandatory when the brief names a real product, brand, model, character, animal, or recognizable physical object, or when silhouette fidelity is important.

## 1. Detect available research tools

Inspect the host agent's available tools before starting. Look for web search, image search, browser navigation, page opening, file download, and image inspection. Tool names differ between agents.

- If search and image search are available, use both. Search result snippets and thumbnails are discovery aids, not verified evidence.
- Open the source pages for the best results. Confirm that each reference depicts the exact product/version rather than a visually similar variant.
- If image search is unavailable but web search exists, open official product pages and reputable image pages.
- If web access is unavailable, do not imply that research happened. Ask for references or proceed only with an explicitly labeled approximation.
- Never invent a URL, model, license, attribution, file availability, or search result.

## 2. Build a visual reference pack

Search for the exact object name plus useful view terms. Example query set for a classic glass soda bottle:

- `[brand] [product] bottle official product image`
- `[brand] contour bottle front side back view`
- `[brand] glass bottle neck shoulder base close up`
- `[brand] bottle label cap detail`

Prefer sources in this order:

1. Official manufacturer/product pages and official brand press/media pages.
2. Manufacturer manuals, product catalogues, technical drawings, or packaging documentation.
3. Reputable editorial/product photography with a clearly identified product/version.
4. Model-hosting pages and specialist communities for geometry/model evidence.

Collect multiple distinct views where possible: front, side/profile, back, and close-ups of distinctive details. Three references is a useful target, not a reason to fabricate missing views. Record what each image proves: silhouette, proportions, component layout, materials, branding, or fine details.

Do not use a single front photograph to infer hidden geometry. Mark unseen surfaces and dimensions as unknown. Never pass off an image pasted onto a primitive as a faithful 3D object.

## 3. Search separately for an actual 3D asset

Visual references and usable 3D models are different things. Search model sources separately, including reputable marketplaces, creator portfolios, public asset libraries, and manufacturer-provided assets where available. Search by exact product and file type (`GLB`, `GLTF`, `FBX`, `OBJ`, `BLEND`) and also by generic object category when the exact brand model is unavailable.

For every candidate, open its individual listing page and record:

- Creator/uploader and canonical listing URL.
- Preview URL or image reference, if available.
- Download format and whether the file is actually downloadable.
- License name, license URL, attribution requirement, commercial-use permission, modification permission, and redistribution restrictions.
- Brand/trademark caveats where relevant.
- Whether it is one combined mesh or has separately named parts.
- Texture/material dependencies and approximate file size if visible.

A search snippet, preview image, or “free” badge does not establish the license. If the license cannot be verified, mark it `unknown` and do not silently use the model in a published project. Never bypass login, payment, access controls, or download restrictions.

## 4. Score model candidates before choosing

Score each candidate from 0–5 on these criteria and record evidence:

| Criterion | What to inspect |
|---|---|
| Identity/silhouette | Does the shape match the requested exact object? |
| Completeness | Are the expected parts/details present? |
| Separability | Are parts separate named nodes suitable for choreography? |
| Materials | Are glass/metal/rubber/plastic/fabric materials plausible and supported by textures? |
| Technical health | Does it load, have sensible scale/origin, valid textures, and manageable polygon count? |
| License clarity | Is the permitted use clear for this project and distribution? |

Do not choose a model solely because it is downloadable. License clarity and technical suitability are gates, not negotiable quality points. For a scroll-exploded story, separability is also a hard gate unless the user explicitly accepts a different treatment.

## 5. Choose a strategy explicitly

Choose and state one of these:

- `user-supplied-model`: user has provided the model and confirms rights to use it.
- `licensed-model`: a candidate has been opened, inspected, and its license verified for the intended use.
- `procedural-from-reference`: no suitable model was found; the object is simple enough to approximate procedurally. State which details are inferred and which are supported by references.
- `image-sequence-or-video`: use only when the requested visual is inherently a pre-rendered transformation or asset sequence, not a live manipulable 3D model. This is a separate implementation pattern and must be identified as such.
- `blocked-awaiting-asset`: a recognizable complex object needs geometry the agent cannot lawfully or accurately obtain. Do not fabricate a poor substitute and call it faithful.

An optional image-to-3D tool may be used only when the host actually provides one and its terms permit the intended use. It is an asset-generation route, not a guaranteed feature of Three.js or of this skill. Inspect the generated mesh, topology, textures, and component separation; generated results often need cleanup and may not produce semantic parts.

## 6. Inspect the selected model

For GLB/GLTF:

```bash
python scripts/inspect-gltf.py path/to/model.glb > model-inspection.json
```

Then open it in a viewer or the starter application. The inspector is structural evidence only; it does not replace a visual review. Confirm the selected nodes are unique, named, non-overlapping in the hierarchy, and useful for the planned animation. If all geometry is one mesh, reject the part-level explosion plan or change the asset.

For reference images, save source URLs and notes in `assets/templates/asset-research-report.json` (copy it per project). Keep attribution and license evidence with the project. Do not hotlink search-thumbnail URLs as production assets. Download only from a legitimate source and keep the original license/attribution file.

## 7. Derive geometry from evidence, not from primitive convenience

Examples:

- A rotationally symmetric bottle should start from a measured/profiled radius-vs-height curve (e.g. Three.js `LatheGeometry`), not a vertical stack of cylinders. Shape the base, heel, body, shoulder, neck, finish and lip as a continuous profile. Use separate geometry only for genuinely separate parts such as cap, seal, label, or internal contents.
- A can needs a rolled rim, top/bottom chimes, tapered shoulders if present, and a wrapped label surface; a cylinder alone is not enough for a recognizable can.
- A sneaker needs a continuous upper/outsole silhouette, layered materials, laces and panel construction. Do not build it from boxes and call it realistic.
- A car needs a model with a credible body shell, wheels, glazing, and—if requested—separate doors, bonnet, engine and steering assembly. A one-piece exterior model cannot produce a true mechanical exploded view.

Use orthographic/profile references to establish proportions. Fit the 3D model to observed proportions before adding lighting, particles, or effects.

## Research report requirement

Before writing geometry code, create an asset research report based on `assets/templates/asset-research-report.json`. Validate it with:

```bash
node scripts/validate-asset-report.mjs path/to/asset-research-report.json
```

A report may conclude that no suitable model was found. That is a valid result. The purpose is to make the decision traceable and stop the agent from inventing an asset without saying so.

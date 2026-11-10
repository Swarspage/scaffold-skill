---
name: scroll-3d-experiences
description: Design, build, or critique object-led immersive web experiences with Three.js/WebGL, scroll choreography, cinematic motion, and responsive visual QA. Use for product stories, 3D explainers, portfolios, configurators, and camera-led scenes; not for ordinary app UI or static pages without an experiential visual goal.
version: 0.3.0
---

# Scroll-3D Experiences

Build an experience in which the object, motion, interface, and evidence tell one story. This skill is for live 3D and scroll-led pages, not generic frontend styling.

## Operating principles

- Start from product truth and a visual brief. Do not invent product attributes, model availability, endorsements, or licensing.
- Preserve a working runtime and scene contract. The scene owns rendering; the page owns scroll, DOM, and controls.
- Choose the lightest credible asset route: researched procedural construction for simple forms, inspected/licensed GLTF for complex or recognizable forms, and an explicit fallback when fidelity is not possible.
- Give every beat a narrative job. A successful WebGL context is not proof of a good experience.
- Design the mobile and reduced-motion versions as compositions, not as disabled desktop pages.

## Start here

1. Read `references/workflow.md`. Create a project-local brief from `assets/templates/EXPERIENCE-BRIEF.template.md`; if material facts are absent, ask no more than three questions, then mark assumptions.
2. Read `references/design-modes.md`, choose **Persuade**, **Experience**, **Operate**, or **Read**, then use `references/art-direction.md` when the direction is not already clear.
3. For a recognizable object, read `references/02-research-and-asset-discovery.md` and create a report from `assets/templates/asset-research-report.json` before geometry work.
4. Route only to the references required below. Keep `PRODUCT.md`, `DESIGN.md`, and `EXPERIENCE.md` in the target project—not in this installed skill—when durable context is useful.
5. Validate, build, capture, inspect, and score the result using `references/09-verification.md` and `references/visual-critique.md`.

## Commands and routing

These names are portable vocabulary, not promised slash commands. If the host supports aliases, expose them; otherwise route natural-language requests to the same playbook.

| Request or command | Load | Outcome |
| --- | --- | --- |
| `init` / capture context | `commands/init.md` | durable product and experience facts |
| `shape` / plan an experience | `commands/shape.md`, `workflow.md` | brief, mode, narrative, constraints |
| `direct` / make it cinematic | `commands/direct.md`, `art-direction.md` | one approved visual direction |
| `research` / find the real object | `commands/research.md`, `02-research-and-asset-discovery.md` | evidence-backed asset decision |
| `construct` / model or integrate | `commands/construct.md`, `03-geometry-and-assets.md`, `04-scene-spec.md` | credible object and valid spec |
| `choreograph` / animate on scroll | `commands/choreograph.md`, `05-choreography-and-camera.md`, `06-scroll-systems.md` | reversible, readable motion |
| `compose` / design the whole page | `commands/compose.md`, `interface-composition.md` | DOM and scene working together |
| `adapt` / improve mobile | `commands/adapt.md`, `responsive-experience.md`, `08-performance-and-accessibility.md` | intentional narrow/reduced-motion modes |
| `critique` | `commands/critique.md`, `visual-critique.md` | evidence-ranked visual fixes |
| `audit` | `commands/audit.md`, `08-performance-and-accessibility.md`, `09-verification.md` | technical and accessibility evidence |
| `polish` | `commands/polish.md`, `quality-floor.md` | final restraint and coherence pass |
| `document` | `commands/document.md` | project-local context updated without overwrite |

Read `references/design-vocabulary.md` only when selecting or changing an aesthetic system. Read `references/materials-and-lighting.md` for material/lighting work, and `references/typography.md` or `references/color.md` for their respective decisions.

## Verification contract

Run `node scripts/validate-spec.mjs <scene.json>` before wiring a scene. For GLTF, run `python scripts/inspect-gltf.py <model>` and inspect the result. Follow the browser and screenshot sequence in `references/09-verification.md`; complete the scorecard in `references/visual-critique.md`. Never claim visual or real-device validation that did not occur.

## Boundaries

This skill does not manufacture a legally usable model, turn a single image into accurate multi-angle geometry, or make static video/mask effects equivalent to live 3D. See `references/10-scope-and-limits.md`.

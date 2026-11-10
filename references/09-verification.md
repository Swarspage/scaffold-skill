# Verification and visual quality assurance

## A screenshot report is evidence, not a design review

A browser script can prove that a page loaded, a canvas exists, WebGL initialized, screenshots were captured, and no configured errors were detected. It cannot prove that the model is accurate, attractive, well-composed, or useful. A vision-capable agent or human must inspect the actual images.

## Verification ladder

1. **Asset decision:** ensure the asset research report is complete. Verify the chosen model's listing and license. Do not treat this as an engineering test.
2. **Structure:** run `python scripts/inspect-gltf.py` for GLB/GLTF and inspect the output. Confirm selected parts exist and are separate.
3. **Spec:** run `node scripts/validate-spec.mjs path/to/scene.json`.
4. **Static checks:** run host lint and production build.
5. **Browser pass:** start the site and run:

   ```bash
   npm install --no-save playwright
   npx playwright install chromium
   node scripts/verify-experience.mjs http://localhost:5173 --out ./verification --require-visible-canvas
   ```

   The verifier captures desktop/mobile at 0%, 25%, 50%, 75%, and 100%, checks errors and tests whether the canvas is visibly inside the viewport. Use `--desktop-only` only for a narrow debugging pass, not final handoff.
6. **Visual review:** open every screenshot and compare it to the reference pack. Fill `assets/templates/visual-review-checklist.md`. Inspect all positions, not only the hero.
7. **Viewport pass:** also check tablet and a narrow phone if the design changes materially at breakpoints. Check orientation, touch scrolling, cards, nav and text overflow.
8. **Physical device pass:** test a real phone and a low/mid-tier laptop before saying the experience is production-ready.

## Hard pass/fail gates

A visual experience is not ready when any of these fail:

- **Object identity:** recognizable silhouette and major proportions match the researched references. A stack of primitive cylinders is not a bottle silhouette.
- **Part truth:** exploded pieces correspond to real named model components or intentionally constructed parts. No arbitrary slabs/blocks presented as authentic inner components.
- **Material truth:** glass reads as glass, metal as metal, paper as paper, rubber as rubber. Use reflections and controlled highlights; do not rely on color alone.
- **Camera composition:** the object remains in frame when required; focus views center the named component with comfortable margins; focal changes are meaningful.
- **Story continuity:** each phase has a clear narrative purpose; parts do not jump, clip, overlap unintentionally or disappear behind text.
- **Page composition:** type, nav, labels, cards and CTA are readable and do not cover critical geometry. No clipped headings or overlapping cards.
- **Mobile parity:** at a 390px viewport the 3D object/scene is still visible by default and the experience preserves the key story. If WebGL capability or performance forces a fallback, show a designed static product image/illustration and identify the reason. Do not simply hide the canvas and leave an empty gradient.
- **Motion/accessibility:** reduced motion, keyboard/touch usability, cleanup and accessible DOM content are implemented.

Score visual qualities from 1–5 for discussion, but use the hard gates above as blockers. A high average cannot cancel an inaccurate silhouette or missing mobile object.

## What the verifier measures

`scripts/verify-experience.mjs`:
- Opens a URL with Playwright/Chromium.
- Collects page errors, console errors, failed requests and HTTP errors.
- Maps normalized scroll progress to the element marked `data-scroll-3d-track`.
- Saves five screenshots for desktop and mobile.
- Checks canvas presence, WebGL context and canvas CSS visibility/viewport intersection at each screenshot.
- Checks horizontal overflow and samples RAF intervals as a rough diagnostic.
- Writes a JSON report and can fail on a hidden canvas with `--require-visible-canvas`.

Limitations:
- Canvas presence/visibility does not prove geometry was drawn or that the object looks good.
- Headless frame timings are diagnostic only, not a real-device benchmark.
- A successful WebGL context does not prove that the browser rendered the intended meshes.
- Screenshot inspection is still mandatory. If the agent cannot view images, report `NOT TESTED` rather than saying visual review passed.

## Mobile rules

- Do not set the main scene canvas to `display:none` at mobile breakpoints as a default optimization.
- Re-compose the scene: use dedicated mobile camera waypoints, a wider camera offset, a tighter object scale, fewer particles/lights/shadows and shorter pin durations.
- Rearrange the DOM into a readable vertical flow and reserve canvas space for the object.
- For complex scenes that are still too heavy, offer a deliberate static poster or short image sequence rather than empty space.
- A fallback must preserve object identity and meaningful information.

## Failure modes

| Symptom | Likely cause | Response |
|---|---|---|
| Bottle looks like stacked green blocks | Geometry authored from cylinders instead of a continuous profile/model | Use a real bottle model or measured LatheGeometry profile; re-check reference silhouette |
| Branded object looks generic | Agent guessed from memory or used category-level references | Re-run exact-product image/model research; replace asset or label approximation |
| Correct front view, wrong side | Only one image reference was used | Find profile/back views; mark hidden geometry unknown |
| Exploded view shows meaningless slabs | Arbitrary geometry cuts or a non-separable asset | Use actual named nodes or redesign the story as camera inspection |
| Canvas missing on mobile | CSS hides canvas or mobile layout drops the scene | Require visible-canvas check; add mobile camera path/layout or deliberate fallback |
| Camera misses the component | Wrong local/world coordinates, stale bounds or scale mismatch | Update world matrices and recompute bounds; inspect screenshots after correction |
| Parts jump while scrolling | Multiple progress sources or non-linear scrub mapping | Use one progress value, linear scrub and frame-rate-independent damping |
| Looks polished but object is inaccurate | Styling was added before silhouette was approved | Strip effects, fix identity/shape first, then reapply materials and lighting |

## Reporting honestly

Use precise statements:
- “Asset research completed” — source pages and tool access are recorded; this does not mean a model was found.
- “License verified” — specific listing license and intended-use permission were reviewed.
- “Model structure inspected” — node hierarchy was inspected; not visual correctness.
- “Spec validation passed” — only structured config checks passed.
- “Browser smoke test passed” — configured browser checks passed.
- “Canvas visible on desktop and mobile” — canvas CSS visibility was checked at the test points; still not a visual review.
- “Visual review passed” — screenshots were actually inspected against the references and hard gates.
- “Real-device tested” — list the device and browser.

Never compress these into “fully verified” when some checks remain incomplete.

# Visual direction: make the 3D feel intentional

## Approve the silhouette before the art direction

Before gradients, particles, labels, and typography, render the selected object in neutral studio light against a plain background. Compare its silhouette and proportions to the researched visual references from front, side, and three-quarter angles. If the product identity is wrong, do not hide the error with dark lighting or visual effects. Fix the geometry/model first.

## Start with a creative thesis

Choose one short metaphor that could plausibly guide the entire page (examples: “the forge”, “precision instrument”, “ocean laboratory”, “architectural archive”). Derive the system from that concept. Do not copy the exact colors or typography of an earlier project.

Write down:
- **Tone:** precise, playful, industrial, calm, editorial, futuristic, etc.
- **Material world:** machined aluminum, ceramic, smoked glass, paper, brushed steel, rubber, wood, etc.
- **Light story:** a key light, fill, rim, and optional localized accent.
- **Palette:** background, surface, text, muted text, accent, emissive accent.
- **Type roles:** display, body, data/metadata.
- **Texture strategy:** none by default; add grain, scratches, or procedural texture only when they support the material story.

## Typography

Use 2–3 roles, not a random collection of fonts:
- Display: the personality and hierarchy.
- Body: readable descriptions and interface text.
- Mono: technical labels, coordinates, specs, and status values when appropriate.

Avoid ultra-condensed display type for long paragraphs. Check the chosen font's actual weight files and ensure the fallback remains legible.

## Lighting and materials

- Establish readable silhouette before adding glow.
- Use low ambient/environment fill plus a distinct key and rim. Too many lights flatten the object.
- Set roughness and metalness according to the physical material; do not make every surface chrome.
- Reserve emissive materials for a few focal edges or indicators.
- Use a restrained background gradient or fog to create depth. Keep the text contrast independent from the canvas.
- Use correct output color space and a deliberate tone-mapping choice; compare screenshots rather than guessing.

## Cinematic depth without clutter

A strong hero can use a layered composition:
1. background atmosphere;
2. real 3D object;
3. foreground typography or fine outline layer;
4. small metadata/caption system.

If text overlaps the canvas, duplicate the same DOM heading only when necessary for a deliberate behind/in-front sandwich effect. Make decorative duplicate text `aria-hidden="true"` so screen readers do not read it twice. On small screens, simplify or remove the sandwich rather than making text unreadable.

## Premium is not a preset

A dark background, orange glow, grain, and a condensed font do not automatically create a premium design. Pick visual properties that fit the object's materials and brand. Restraint, scale, spacing, and composition matter more than adding effects.

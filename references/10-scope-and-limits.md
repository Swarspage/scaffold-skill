# V1 scope and limits

## The core

V1 should become known for one thing:

**A portable choreography system for object-led 3D web stories: named parts, shared scroll progress, meaningful camera focus, and a verification loop.**

The differentiator is not “we know Three.js” or “we use GSAP.” Those APIs are documented elsewhere. The value is the system that keeps object structure, story timing, camera framing, cleanup, and evidence connected.

## Included in V1

- Procedural primitive-based objects.
- Supplied/licensed GLB/GLTF assets with separate nodes.
- Assembly, hold, exploded view, part focus, reassembly.
- Camera rails and component close-ups.
- GSAP ScrollTrigger and native-scroll adapters.
- Responsive/reduced-motion/static fallbacks.
- Spec validation, GLTF hierarchy inspection, browser screenshots.

## Not included in V1

- AI sculpting or generative mesh creation for complex organic products.
- A Blender automation pipeline.
- Automatic segmentation of a single combined mesh into reliable semantic parts.
- Scrubbed video/image sequences (e.g. pulling a cloth off a car frame by frame).
- Cursor-following dual-image masks or shader reveal effects.
- A general-purpose visual design skill for every kind of website.

These can become separate focused modules later. Keep the router/skill description specific; adding all visual effects to one skill would make its trigger vague and its workflow less dependable.

## Honest promise

Do not market “any object, no 3D files required.” That is false for complex/recognizable objects.

A defensible promise is:

> Describe the product and the story. The skill chooses procedural geometry or a supplied model, maps named parts into a shared choreography, guides the camera on scroll, and produces screenshots for review.

The procedural route is strongest for stylized mechanical/simple objects. GLB/GLTF is the route for complex forms, but the model must contain useful separate nodes.

## Future expansion path

Only add a module after the core produces repeatable results on at least three unrelated subjects:

1. Image-sequence/video scroll scrubbing.
2. Cursor-following masks and shader reveals.
3. A higher-level design-direction module distilled from Scaffold's design-system catalog.
4. Optional React Three Fiber adapter, while keeping vanilla Three.js as the framework-neutral base.
5. More examples and automated visual-regression comparisons.

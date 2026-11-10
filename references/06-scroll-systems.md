# Scroll systems and DOM animation

## Keep the scene and the page decoupled

The Three.js runtime should not import GSAP, ScrollTrigger, Lenis, or React. It exposes `setProgress(0..1)`; the page owns scrolling and passes progress into the scene.

This separation allows the same scene to work with:
- GSAP ScrollTrigger;
- native `scrollY` progress;
- an application-specific scroll controller;
- a future React/Vue adapter.

## GSAP ScrollTrigger

Use GSAP for pinned sections, scrubbed timelines, staged DOM reveals, horizontal scroll, labels, and coordinated choreography.

```js
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const context = gsap.context(() => {
  const state = { progress: 0 };
  gsap.to(state, {
    progress: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '.story',
      start: 'top top',
      end: '+=3500',
      pin: true,
      scrub: 0.8,
      onUpdate: () => experience.setProgress(state.progress),
    },
  });
}, rootElement);

// On unmount:
context.revert();
```

If the timeline is scrubbed, use a linear timeline mapping (`ease: 'none'`). Put per-part physical easing in the scene, not in the scroll-to-progress bridge. Avoid animating the pinned element itself; animate its children.

In React, create the GSAP context inside the component lifecycle and call `revert()` on cleanup. Use `gsap.matchMedia()` for responsive and reduced-motion variants.

## Native scroll for camera-only journeys

When the only motion is a camera path, a native scroll driver is often enough:

```js
function getProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max));
}
```

Cache expensive measurements and refresh them on resize. Do not read `scrollHeight` and force layout on every animation frame. Smooth the camera using frame-rate-independent damping:

```js
const alpha = 1 - Math.exp(-deltaSeconds * damping);
current.lerp(target, alpha);
```

## Lenis is optional

Add Lenis only when the design explicitly benefits from smooth scrolling. If used with GSAP ScrollTrigger, synchronize both loops:

```js
const lenis = new Lenis();
const raf = (time) => lenis.raf(time * 1000);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(raf);
gsap.ticker.lagSmoothing(0);

// cleanup
gsap.ticker.remove(raf);
lenis.destroy();
```

Do not combine Lenis, native smooth scroll, and ScrollTrigger without a single clear scroll source. Test anchors, touch, nested scrollers, and reduced motion.

## Horizontal scroll

Use a pinned horizontal track only when the content genuinely benefits from lateral comparison or a sequence of cards. Calculate the track distance from its measured width minus viewport width. Recalculate on resize. On mobile, use a normal vertical list or native horizontal overflow; do not trap touch users in a fake horizontal desktop interaction.

## DOM motion

The canvas is not a replacement for semantic HTML. Render headlines, descriptions, labels, captions, navigation, and CTAs in the DOM. Animate DOM elements with GSAP where needed, and keep DOM timing coordinated with the same story phases.

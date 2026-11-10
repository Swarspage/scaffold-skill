import spec from './watch-spec.js';
import './style.css';

const canvas = document.querySelector('#scene');
const fallback = document.querySelector('#fallback');
const status = document.querySelector('#status');
const progressFill = document.querySelector('#progress-fill');
const partLabel = document.querySelector('#part-label');
const partNames = [
  { at: 0.00, end: 0.20, index: '01 / 06', name: 'ASSEMBLY' },
  { at: 0.20, end: 0.43, index: '02 / 06', name: 'ASSEMBLED WATCH' },
  { at: 0.43, end: 0.58, index: '03 / 06', name: 'DIAL DETAIL' },
  { at: 0.58, end: 0.76, index: '04 / 06', name: 'MOVEMENT DETAIL' },
  { at: 0.76, end: 0.86, index: '05 / 06', name: 'WINDING CROWN' },
  { at: 0.86, end: 1.01, index: '06 / 06', name: 'REASSEMBLY' },
];

let experience;
let context;
let motionMedia;
let gsap;
let ScrollTrigger;
let disposed = false;
let refreshAfterLoad;

function updateLabels(progress) {
  const current = partNames.find((item) => progress >= item.at && progress < item.end) ?? partNames.at(-1);
  partLabel.querySelector('.part-index').textContent = current.index;
  partLabel.querySelector('.part-name').textContent = current.name;
  progressFill.style.transform = `scaleX(${progress})`;
}

function showFallback(message) {
  document.querySelector('#scroll-track')?.classList.add('is-static');
  fallback.hidden = false;
  status.textContent = message;
  canvas.hidden = true;
}

async function start() {
  try {
    const [gsapModule, scrollTriggerModule, runtimeModule] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('./scene-runtime.js'),
    ]);
    gsap = gsapModule.gsap;
    ScrollTrigger = scrollTriggerModule.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    experience = await runtimeModule.createScroll3DExperience({
      canvas,
      spec,
      onStatus(event) {
        if (event.type === 'low-performance') {
          experience?.dispose();
          experience = null;
          showFallback('LOW FRAME RATE · SHOWING THE STATIC EXPERIENCE');
        }
        if (event.type === 'reduced-motion') {
          status.textContent = 'REDUCED MOTION · STATIC ASSEMBLED VIEW';
          updateLabels(0.21);
        }
      },
    });

    context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: '#scroll-track',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          experience?.setProgress(self.progress);
          updateLabels(self.progress);
        },
        onRefresh: (self) => {
          experience?.setProgress(self.progress);
          updateLabels(self.progress);
        },
      });

      motionMedia = gsap.matchMedia();
      motionMedia.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo('.closing .eyebrow, .closing h2, .closing p:not(.eyebrow), .closing a',
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.closing', start: 'top 72%', once: true },
          },
        );
      });
    });
    updateLabels(experience.getProgress());
    refreshAfterLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', refreshAfterLoad, { once: true });
  } catch (error) {
    console.error('3D scene failed to initialize:', error);
    experience?.dispose();
    experience = null;
    showFallback('3D UNAVAILABLE · SHOWING THE STATIC EXPERIENCE');
  }
}

function cleanup() {
  if (disposed) return;
  disposed = true;
  motionMedia?.revert();
  context?.revert();
  experience?.dispose();
  window.removeEventListener('load', refreshAfterLoad);
}

window.addEventListener('pagehide', cleanup, { once: true });
start();

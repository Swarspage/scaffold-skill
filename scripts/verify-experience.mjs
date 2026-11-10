#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const url = args.find((arg) => !arg.startsWith('--'));
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node scripts/verify-experience.mjs http://localhost:5173 [--out ./verification] [--track-selector "[data-scroll-3d-track]"] [--canvas-selector canvas] [--desktop-only] [--require-visible-canvas] [--fail-on-console-error]');
  process.exit(0);
}
const argValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const outputDir = path.resolve(argValue('--out', './verification'));
const trackSelector = argValue('--track-selector', '[data-scroll-3d-track]');
const canvasSelector = argValue('--canvas-selector', 'canvas');
const requireVisibleCanvas = args.includes('--require-visible-canvas');
const failOnConsole = args.includes('--fail-on-console-error');
const desktopOnly = args.includes('--desktop-only');
if (!url) {
  console.error('A local or deployed page URL is required. Use --help for usage.');
  process.exit(2);
}
let expectedOrigin;
try { expectedOrigin = new URL(url).origin; }
catch { console.error(`Invalid URL: ${url}`); process.exit(2); }

let chromium;
try {
  const requireFromProject = createRequire(path.resolve(process.cwd(), 'package.json'));
  const playwright = requireFromProject('playwright');
  chromium = playwright.chromium;
} catch (error) {
  console.error('Playwright is required. From your project directory run: npm install --no-save playwright && npx playwright install chromium');
  console.error(`Details: ${error.message}`);
  process.exit(2);
}

fs.mkdirSync(outputDir, { recursive: true });
const report = {
  url,
  startedAt: new Date().toISOString(),
  screenshots: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  httpErrors: [],
  warnings: [],
  scrollTarget: { selector: trackSelector, found: false, method: null },
  horizontalOverflow: [],
  canvasVisibility: [],
  canvasSelector,
  webgl: null,
  frameTimingMs: null,
};

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('requestfailed', (request) => report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' }));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      const item = { url: response.url(), status: response.status() };
      report.httpErrors.push(item);
      if (new URL(response.url()).origin === expectedOrigin) report.warnings.push(`Same-origin asset returned HTTP ${response.status()}: ${response.url()}`);
    }
  });

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  if (!response) report.warnings.push('Navigation returned no main-resource response.');
  else if (!response.ok()) report.warnings.push(`Main document returned HTTP ${response.status()}.`);
  await page.waitForTimeout(900);

  report.webgl = await page.evaluate((selector) => {
    const canvas = document.querySelector(selector);
    if (!canvas) return { canvasFound: false, contextAvailable: false, width: 0, height: 0 };
    let context = null;
    try { context = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'); } catch {}
    const rect = canvas.getBoundingClientRect();
    const style = getComputedStyle(canvas);
    return { canvasFound: true, contextAvailable: Boolean(context), width: canvas.width, height: canvas.height, selector: selector, cssDisplay: style.display, cssVisibility: style.visibility };
  }, canvasSelector);
  if (!report.webgl.canvasFound) report.warnings.push('No canvas element found. This may be expected for a static fallback, but inspect the page.');
  if (report.webgl.canvasFound && !report.webgl.contextAvailable) report.warnings.push('Headless Chromium could not create a WebGL context. Repeat in a headed browser or on a physical device before diagnosing this as a product failure.');

  const stops = [0, 25, 50, 75, 100];
  const viewports = desktopOnly
    ? [{ name: 'desktop', width: 1440, height: 900 }]
    : [
        { name: 'desktop', width: 1440, height: 900 },
        { name: 'mobile', width: 390, height: 844 },
      ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(350);
    const targetMetrics = await page.evaluate((selector) => {
      const target = document.querySelector(selector);
      if (!target) return null;
      const rect = target.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const scrollDistance = Math.max(0, target.offsetHeight - window.innerHeight);
      return { top, scrollDistance, height: target.offsetHeight, viewportHeight: window.innerHeight };
    }, trackSelector);

    const overflow = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      overflows: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));
    if (overflow.overflows) report.horizontalOverflow.push({ viewport: viewport.name, ...overflow });

    if (targetMetrics) {
      report.scrollTarget.found = true;
      report.scrollTarget.method = 'tracked-section';
    } else {
      report.scrollTarget.method = 'whole-document-fallback';
      report.warnings.push(`No element matched ${trackSelector}; ${viewport.name} screenshots use whole-document scroll progress. Add data-scroll-3d-track to the scene's scroll section for accurate scene progress.`);
    }

    for (const stop of stops) {
      await page.evaluate(({ percent, metrics }) => {
        const progress = percent / 100;
        const root = document.documentElement;
        const maxDocumentScroll = Math.max(0, root.scrollHeight - window.innerHeight);
        const top = metrics
          ? metrics.top + metrics.scrollDistance * progress
          : maxDocumentScroll * progress;
        window.scrollTo(0, Math.max(0, Math.min(maxDocumentScroll, top)));
      }, { percent: stop, metrics: targetMetrics });
      await page.waitForTimeout(650);
      const canvasState = await page.evaluate((selector) => {
        const canvas = document.querySelector(selector);
        if (!canvas) return { found: false, visible: false, reason: 'not-found' };
        const rect = canvas.getBoundingClientRect();
        const style = getComputedStyle(canvas);
        const intersectsViewport = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.05 && intersectsViewport;
        return { found: true, visible, display: style.display, visibility: style.visibility, opacity: style.opacity, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, intersectsViewport };
      }, canvasSelector);
      report.canvasVisibility.push({ viewport: viewport.name, progress: `${stop}%`, ...canvasState });
      if (!canvasState.visible) report.warnings.push(`${viewport.name} at ${stop}%: 3D canvas is not visibly rendered (${canvasState.reason ?? canvasState.display ?? 'outside viewport'}).`);
      const filename = `scroll-${viewport.name}-${String(stop).padStart(3, '0')}.png`;
      await page.screenshot({ path: path.join(outputDir, filename), fullPage: false });
      report.screenshots.push({ viewport: viewport.name, width: viewport.width, height: viewport.height, progress: `${stop}%`, file: filename });
    }
  }

  report.frameTimingMs = await page.evaluate(async () => {
    const samples = [];
    let previous = 0;
    await new Promise((resolve) => {
      let count = 0;
      const tick = (time) => {
        if (previous) samples.push(time - previous);
        previous = time;
        count += 1;
        if (count >= 91) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const sorted = samples.sort((a, b) => a - b);
    const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? null;
    return { median: percentile(0.5), p95: percentile(0.95), sampleCount: samples.length, note: 'Headless diagnostic only; not a real-device performance benchmark.' };
  });
} catch (error) {
  report.pageErrors.push(error.message);
} finally {
  if (browser) await browser.close();
}

report.finishedAt = new Date().toISOString();
const fatalHttpErrors = report.httpErrors.filter((item) => new URL(item.url).origin === expectedOrigin);
report.fatalHttpErrors = fatalHttpErrors;
const hiddenCanvasFailure = requireVisibleCanvas && (!report.webgl?.canvasFound || report.canvasVisibility.some((item) => !item.visible));
report.hiddenCanvasFailure = hiddenCanvasFailure;
report.status = report.pageErrors.length || fatalHttpErrors.length || hiddenCanvasFailure || (failOnConsole && report.consoleErrors.length) ? 'failed' : 'completed-with-review';
report.reviewRequired = true;
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.pageErrors.length || report.fatalHttpErrors.length || hiddenCanvasFailure || (failOnConsole && report.consoleErrors.length)) process.exit(1);

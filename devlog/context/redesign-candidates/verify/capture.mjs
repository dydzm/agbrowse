#!/usr/bin/env node
/**
 * capture.mjs — Screenshot verification harness for static landing pages.
 *
 * Uses playwright-core (already in repo node_modules) + local Chrome.
 * No new npm installs required.
 *
 * Usage:
 *   node capture.mjs <file-or-url> --out <dir> [options]
 *
 * Options:
 *   --width W        viewport width   (default 1440)
 *   --height H       viewport height  (default 900)
 *   --scroll N       scroll to Y=N px before capture (repeatable)
 *   --fullpage       full-page screenshot
 *   --reduced-motion emulate prefers-reduced-motion: reduce
 *   --no-js          disable JavaScript
 *   --device-scale S device scale factor (default 1)
 */

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Resolve playwright-core from repo root node_modules
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const require = createRequire(path.join(repoRoot, 'package.json'));
const { chromium } = require('playwright-core');

// ---------------------------------------------------------------------------
// CLI argument parsing (no deps, just process.argv)
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    url: null,
    out: './out',
    width: 1440,
    height: 900,
    scrolls: [],
    fullpage: false,
    reducedMotion: false,
    noJs: false,
    deviceScale: 1,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--out')            { opts.out = args[++i]; continue; }
    if (a === '--width')          { opts.width = Number(args[++i]); continue; }
    if (a === '--height')         { opts.height = Number(args[++i]); continue; }
    if (a === '--scroll')         { opts.scrolls.push(Number(args[++i])); continue; }
    if (a === '--fullpage')       { opts.fullpage = true; continue; }
    if (a === '--reduced-motion') { opts.reducedMotion = true; continue; }
    if (a === '--no-js')          { opts.noJs = true; continue; }
    if (a === '--device-scale')   { opts.deviceScale = Number(args[++i]); continue; }
    if (!a.startsWith('-') && !opts.url) { opts.url = a; continue; }
    console.error(`Unknown argument: ${a}`);
    process.exit(1);
  }

  if (!opts.url) {
    console.error('Usage: node capture.mjs <url-or-filepath> --out <dir> [options]');
    process.exit(1);
  }

  // Auto-convert bare file paths to file:// URLs
  if (!opts.url.startsWith('http') && !opts.url.startsWith('file://')) {
    const abs = path.resolve(opts.url);
    opts.url = `file://${abs}`;
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Chrome executable path (macOS default)
// ---------------------------------------------------------------------------
const CHROME_PATH =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv);

  // Ensure output directory exists
  mkdirSync(opts.out, { recursive: true });

  console.log(`Launching Chrome headless...`);
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--hide-scrollbars'],
  });

  const contextOpts = {
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: opts.deviceScale,
    javaScriptEnabled: !opts.noJs,
  };
  if (opts.reducedMotion) {
    contextOpts.reducedMotion = 'reduce';
  }

  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();

  console.log(`Navigating to ${opts.url}`);
  await page.goto(opts.url, { waitUntil: 'networkidle', timeout: 30000 });
  // Extra settle time for CSS animations
  await page.waitForTimeout(500);

  const tag = `${opts.width}x${opts.height}`;
  const captures = [];

  // --- Viewport screenshot ---
  if (!opts.fullpage && opts.scrolls.length === 0) {
    const suffix = opts.reducedMotion ? '_reduced-motion' : '';
    const noJsSuffix = opts.noJs ? '_nojs' : '';
    const fname = `viewport_${tag}${suffix}${noJsSuffix}.png`;
    const outPath = path.join(opts.out, fname);
    await page.screenshot({ path: outPath, fullPage: false });
    captures.push(outPath);
    console.log(`  -> ${fname}`);
  }

  // --- Full-page screenshot ---
  if (opts.fullpage) {
    const fname = `fullpage_${opts.width}.png`;
    const outPath = path.join(opts.out, fname);
    await page.screenshot({ path: outPath, fullPage: true });
    captures.push(outPath);
    console.log(`  -> ${fname}`);
  }

  // --- Scrolled screenshots ---
  for (const scrollY of opts.scrolls) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(400); // settle after scroll
    const fname = `scroll_${tag}_y${scrollY}.png`;
    const outPath = path.join(opts.out, fname);
    await page.screenshot({ path: outPath, fullPage: false });
    captures.push(outPath);
    console.log(`  -> ${fname}`);
  }

  await browser.close();

  // --- Summary ---
  console.log('\nCapture summary:');
  for (const p of captures) {
    if (existsSync(p)) {
      const sz = statSync(p).size;
      console.log(`  ${path.basename(p)}: ${sz} bytes`);
    } else {
      console.log(`  ${path.basename(p)}: MISSING`);
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

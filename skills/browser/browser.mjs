#!/usr/bin/env node
/**
 * browser.mjs — Standalone browser control for AI agents
 * Extracted from cli-jaw browser. Zero external dependencies beyond playwright-core.
 *
 * Usage:  node browser.mjs <command> [args] [--flags]
 *
 * Commands:
 *   start [--port N] [--headless]    Start Chrome with CDP
 *   stop                             Stop Chrome
 *   status                           Connection status
 *   snapshot [--interactive]          Accessibility tree with ref IDs
 *   screenshot [--full-page] [--ref eN] [--json]  Capture screenshot
 *   mouse-click <x> <y> [--double]  Click at pixel coordinates
 *   click <ref> [--double]           Click element
 *   type <ref> <text> [--submit]     Type into element
 *   press <key>                      Press key (Enter, Tab, Escape…)
 *   hover <ref>                      Hover element
 *   navigate <url>                   Go to URL
 *   tabs                             List open tabs
 *   text [--format html]             Get page text
 *   evaluate <js>                    Execute JavaScript
 *   reset [--force]                  Clear profile + screenshots
 */

import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import net from 'node:net';

// ─── Config ──────────────────────────────────────
const DATA_DIR = process.env.BROWSER_AGENT_HOME || join(homedir(), '.browser-agent');
const PROFILE_DIR = join(DATA_DIR, 'browser-profile');
const SCREENSHOTS_DIR = join(DATA_DIR, 'screenshots');
const DEFAULT_CDP_PORT = parseInt(process.env.CDP_PORT || '9222', 10);

// ─── State ───────────────────────────────────────
let cached = null;   // { browser, cdpUrl }
let chromeProc = null;
let activePort = null;

// ─── ANSI colors ─────────────────────────────────
const c = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

// ═══════════════════════════════════════════════════
//  Connection Layer (from cli-jaw src/browser/connection.ts)
// ═══════════════════════════════════════════════════

function isPortListening(port, host = '127.0.0.1') {
    return new Promise(resolve => {
        const sock = net.createConnection({ port, host });
        const timer = setTimeout(() => { sock.destroy(); resolve(false); }, 500);
        sock.once('connect', () => { clearTimeout(timer); sock.destroy(); resolve(true); });
        sock.once('error', () => { clearTimeout(timer); resolve(false); });
    });
}

async function waitForCdpReady(port, timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const resp = await fetch(`http://127.0.0.1:${port}/json/version`, {
                signal: AbortSignal.timeout(2000),
            });
            if (resp.ok) return true;
        } catch { /* not ready yet */ }
        await new Promise(r => setTimeout(r, 300));
    }
    return false;
}

function isWSL() {
    if (process.platform !== 'linux') return false;
    try {
        return readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
    } catch { return false; }
}

function findChrome() {
    const platform = process.platform;
    const paths = [];

    if (platform === 'darwin') {
        paths.push(
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
            `${homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
        );
    } else if (platform === 'win32') {
        const pf = process.env.PROGRAMFILES || 'C:\\Program Files';
        const pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
        const local = process.env.LOCALAPPDATA || '';
        paths.push(
            `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
            `${pf86}\\Google\\Chrome\\Application\\chrome.exe`,
            `${local}\\Google\\Chrome\\Application\\chrome.exe`,
            `${pf}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
        );
    } else {
        paths.push(
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/snap/bin/chromium',
            '/usr/bin/brave-browser',
        );
        if (isWSL()) {
            paths.push(
                '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
                '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
            );
        }
    }

    for (const p of paths) {
        if (p && existsSync(p)) return p;
    }
    throw new Error('Chrome not found — install Google Chrome');
}

async function launchChrome(port = DEFAULT_CDP_PORT, opts = {}) {
    // CDP already responding → reuse
    if (await isPortListening(port)) {
        try {
            const resp = await fetch(`http://127.0.0.1:${port}/json/version`, {
                signal: AbortSignal.timeout(2000),
            });
            if (resp.ok) {
                console.log(`[browser] CDP already listening on port ${port} — reusing existing instance`);
                activePort = port;
                return;
            }
        } catch {
            throw new Error(
                `Port ${port} is in use but not responding as CDP. ` +
                `Another process may be occupying the port. Try --port <other> or stop the conflicting process.`
            );
        }
    }

    if (chromeProc && !chromeProc.killed) return;

    const chrome = findChrome();
    const noSandbox = process.env.CHROME_NO_SANDBOX === '1';
    const headless = opts.headless || process.env.CHROME_HEADLESS === '1';

    chromeProc = spawn(chrome, [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${PROFILE_DIR}`,
        '--no-first-run', '--no-default-browser-check',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        ...(noSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
        ...(headless ? ['--headless=new'] : []),
        'about:blank',
    ], { detached: true, stdio: 'ignore' });
    chromeProc.unref();

    const ready = await waitForCdpReady(port);
    if (ready) {
        activePort = port;
    } else {
        if (chromeProc && !chromeProc.killed) {
            chromeProc.kill('SIGTERM');
            chromeProc = null;
        }
        throw new Error(
            `Chrome CDP not responding on port ${port} after 10s. ` +
            `Possible causes:\n` +
            `  - Windows: Chrome singleton absorbed the launch (close ALL Chrome windows first)\n` +
            `  - No display available (try --headless or CHROME_HEADLESS=1)\n` +
            `  - Port conflict (try --port <other>)`
        );
    }
}

function getPort() {
    return activePort || DEFAULT_CDP_PORT;
}

async function connectCdp(port = getPort(), retries = 3) {
    // Lazy import playwright-core
    const { chromium } = await import('playwright-core');
    const cdpUrl = `http://127.0.0.1:${port}`;
    if (cached?.cdpUrl === cdpUrl && cached.browser.isConnected()) return cached;

    let lastError = null;
    for (let i = 0; i < retries; i++) {
        try {
            const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 10000 });
            cached = { browser, cdpUrl };
            browser.on('disconnected', () => { cached = null; });
            return cached;
        } catch (e) {
            lastError = e;
            if (i < retries - 1) {
                console.warn(`[browser] CDP connect attempt ${i + 1}/${retries} failed, retrying in 1s...`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
    throw new Error(`CDP connection failed after ${retries} attempts: ${lastError?.message}`);
}

async function getActivePage(port = getPort()) {
    const { browser } = await connectCdp(port);
    const pages = browser.contexts().flatMap(c => c.pages());
    return pages[pages.length - 1] || null;
}

async function listTabs(port = getPort()) {
    const resp = await fetch(`http://127.0.0.1:${port}/json/list`);
    return (await resp.json()).filter(t => t.type === 'page');
}

async function getBrowserStatus(port = getPort()) {
    try {
        const tabs = await listTabs(port);
        return { running: true, tabs: tabs.length, cdpUrl: `http://127.0.0.1:${port}` };
    } catch { return { running: false, tabs: 0 }; }
}

async function getCdpSession(port = getPort()) {
    const page = await getActivePage(port);
    if (!page) return null;
    return page.context().newCDPSession(page);
}

async function closeBrowser() {
    if (cached?.browser) { await cached.browser.close().catch(() => { }); cached = null; }
    if (chromeProc && !chromeProc.killed) { chromeProc.kill('SIGTERM'); chromeProc = null; }
    activePort = null;
}

// ═══════════════════════════════════════════════════
//  Actions Layer (from cli-jaw src/browser/actions.ts)
// ═══════════════════════════════════════════════════

const INTERACTIVE_ROLES = ['button', 'link', 'textbox', 'checkbox',
    'radio', 'combobox', 'menuitem', 'tab', 'slider', 'searchbox',
    'option', 'switch', 'spinbutton'];

function parseAriaYaml(yaml) {
    const nodes = [];
    let counter = 0;
    for (const line of yaml.split('\n')) {
        if (!line.trim() || !line.includes('-')) continue;
        const indent = line.search(/\S/);
        const depth = Math.floor(indent / 2);
        const m = line.match(/-\s+(\w+)(?:\s+"([^"]*)")?/);
        if (!m) continue;
        counter++;
        const role = m[1];
        const name = m[2] || '';
        nodes.push({ ref: `e${counter}`, role, name, depth });
    }
    return nodes;
}

function parseCdpAxTree(axNodes) {
    const nodes = [];
    let counter = 0;
    const depthMap = {};
    for (const n of axNodes) {
        const parentDepth = n.parentId ? (depthMap[n.parentId] ?? 0) : -1;
        const depth = parentDepth + 1;
        depthMap[n.nodeId] = depth;
        const role = n.role?.value || 'unknown';
        const name = n.name?.value || '';
        const value = n.value?.value || '';
        if (n.ignored) continue;
        counter++;
        nodes.push({
            ref: `e${counter}`, role, name,
            ...(value ? { value } : {}),
            depth,
        });
    }
    return nodes;
}

async function snapshot(port, opts = {}) {
    const page = await getActivePage(port);
    if (!page) throw new Error('No active page');

    let nodes;

    // Strategy 1: locator.ariaSnapshot()
    try {
        const yaml = await page.locator('body').ariaSnapshot({ timeout: 10000 });
        nodes = parseAriaYaml(yaml);
    } catch (e1) {
        // Strategy 2: direct CDP Accessibility.getFullAXTree
        try {
            const cdp = await getCdpSession(port);
            const { nodes: axNodes } = await cdp.send('Accessibility.getFullAXTree');
            nodes = parseCdpAxTree(axNodes);
            await cdp.detach().catch(() => { });
        } catch (e2) {
            throw new Error(
                `Snapshot failed.\n  ariaSnapshot: ${e1.message}\n  CDP fallback: ${e2.message}`
            );
        }
    }

    if (opts.interactive) {
        nodes = nodes.filter(n => INTERACTIVE_ROLES.includes(n.role));
    }
    return nodes;
}

async function refToLocator(page, port, ref) {
    const nodes = await snapshot(port);
    const node = nodes.find(n => n.ref === ref);
    if (!node) throw new Error(`ref ${ref} not found — re-run snapshot`);
    return page.getByRole(node.role, { name: node.name });
}

async function screenshotAction(port, opts = {}) {
    const page = await getActivePage(port);
    if (!page) throw new Error('No active page');
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    const type = opts.type || 'png';
    const filename = `screenshot_${Date.now()}.${type}`;
    const filepath = join(SCREENSHOTS_DIR, filename);

    if (opts.ref) {
        const locator = await refToLocator(page, port, opts.ref);
        await locator.screenshot({ path: filepath, type });
    } else {
        await page.screenshot({ path: filepath, fullPage: opts.fullPage, type });
    }
    const dpr = await page.evaluate('window.devicePixelRatio');
    const viewport = page.viewportSize();
    return { path: filepath, dpr, viewport };
}

async function click(port, ref, opts = {}) {
    const page = await getActivePage(port);
    const locator = await refToLocator(page, port, ref);
    if (opts.doubleClick) await locator.dblclick();
    else await locator.click();
    return { ok: true, url: page.url() };
}

async function typeAction(port, ref, text, opts = {}) {
    const page = await getActivePage(port);
    const locator = await refToLocator(page, port, ref);
    await locator.fill(text);
    if (opts.submit) await page.keyboard.press('Enter');
    return { ok: true };
}

async function press(port, key) {
    const page = await getActivePage(port);
    await page.keyboard.press(key);
    return { ok: true };
}

async function hover(port, ref) {
    const page = await getActivePage(port);
    const locator = await refToLocator(page, port, ref);
    await locator.hover();
    return { ok: true };
}

async function navigate(port, url) {
    const page = await getActivePage(port);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    return { ok: true, url: page.url() };
}

async function evaluate(port, expression) {
    const page = await getActivePage(port);
    const result = await page.evaluate(expression);
    return { ok: true, result };
}

async function getPageText(port, format = 'text') {
    const page = await getActivePage(port);
    if (format === 'html') return { text: await page.content() };
    return { text: await page.innerText('body') };
}

async function mouseClick(port, x, y, opts = {}) {
    const page = await getActivePage(port);
    if (opts.doubleClick) await page.mouse.dblclick(x, y);
    else await page.mouse.click(x, y);
    return { success: true, clicked: { x, y } };
}

// ═══════════════════════════════════════════════════
//  CLI Layer
// ═══════════════════════════════════════════════════

const sub = process.argv[2];

try {
    switch (sub) {
        case 'start': {
            const { values } = parseArgs({
                args: process.argv.slice(3),
                options: {
                    port: { type: 'string', default: String(DEFAULT_CDP_PORT) },
                    headless: { type: 'boolean', default: false },
                }, strict: false,
            });
            await launchChrome(Number(values.port), { headless: values.headless });
            const r = await getBrowserStatus(Number(values.port));
            console.log(r.running ? `🌐 Chrome started (CDP: ${r.cdpUrl})` : '❌ Failed');
            break;
        }
        case 'stop':
            await closeBrowser();
            console.log('🌐 Chrome stopped');
            break;
        case 'status': {
            const r = await getBrowserStatus();
            console.log(`running: ${r.running}\ntabs: ${r.tabs}\ncdpUrl: ${r.cdpUrl || 'n/a'}`);
            break;
        }
        case 'snapshot': {
            const { values } = parseArgs({
                args: process.argv.slice(3),
                options: { interactive: { type: 'boolean', default: false } }, strict: false,
            });
            const nodes = await snapshot(getPort(), { interactive: values.interactive });
            for (const n of nodes) {
                const indent = '  '.repeat(n.depth);
                const val = n.value ? ` = "${n.value}"` : '';
                console.log(`${n.ref.padEnd(4)} ${indent}${n.role.padEnd(10)} "${n.name}"${val}`);
            }
            break;
        }
        case 'screenshot': {
            const { values } = parseArgs({
                args: process.argv.slice(3),
                options: { 'full-page': { type: 'boolean' }, ref: { type: 'string' }, json: { type: 'boolean', default: false } }, strict: false,
            });
            const r = await screenshotAction(getPort(), { fullPage: values['full-page'], ref: values.ref });
            if (values.json) console.log(JSON.stringify(r));
            else console.log(r.path);
            break;
        }
        case 'click': {
            const ref = process.argv[3];
            if (!ref) { console.error('Usage: browser.mjs click <ref>'); process.exit(1); }
            const opts = {};
            if (process.argv.includes('--double')) opts.doubleClick = true;
            await click(getPort(), ref, opts);
            console.log(`clicked ${ref}`);
            break;
        }
        case 'type': {
            const [ref, ...rest] = process.argv.slice(3);
            const text = rest.filter(a => !a.startsWith('--')).join(' ');
            const submit = rest.includes('--submit');
            await typeAction(getPort(), ref, text, { submit });
            console.log(`typed into ${ref}`);
            break;
        }
        case 'press':
            await press(getPort(), process.argv[3]);
            console.log(`pressed ${process.argv[3]}`);
            break;
        case 'hover': {
            const ref = process.argv[3];
            await hover(getPort(), ref);
            console.log(`hovered ${ref}`);
            break;
        }
        case 'mouse-click': {
            const mx = parseInt(process.argv[3]);
            const my = parseInt(process.argv[4]);
            if (isNaN(mx) || isNaN(my)) {
                console.error('Usage: browser.mjs mouse-click <x> <y> [--double]');
                process.exit(1);
            }
            const mOpts = {};
            if (process.argv.includes('--double')) mOpts.doubleClick = true;
            await mouseClick(getPort(), mx, my, mOpts);
            console.log(`🖱️ clicked at (${mx}, ${my})`);
            break;
        }
        case 'navigate': {
            const r = await navigate(getPort(), process.argv[3]);
            console.log(`navigated → ${r.url}`);
            break;
        }
        case 'tabs': {
            const tabs = await listTabs(getPort());
            tabs.forEach((t, i) => console.log(`${i + 1}. ${t.title}\n   ${t.url}`));
            break;
        }
        case 'text': {
            const { values } = parseArgs({
                args: process.argv.slice(3),
                options: { format: { type: 'string', default: 'text' } }, strict: false,
            });
            const r = await getPageText(getPort(), values.format);
            console.log(r.text);
            break;
        }
        case 'evaluate': {
            const r = await evaluate(getPort(), process.argv.slice(3).join(' '));
            console.log(JSON.stringify(r.result, null, 2));
            break;
        }
        case 'reset': {
            const force = process.argv.includes('--force');
            if (!force) {
                const { createInterface } = await import('node:readline');
                const rl = createInterface({ input: process.stdin, output: process.stdout });
                const answer = await new Promise(r => {
                    rl.question(`\n  ${c.yellow}⚠️  Reset browser data.${c.reset}\n  Profile, screenshots, and CDP cache will be deleted.\n  Continue? (y/N): `, r);
                });
                rl.close();
                if (answer.toLowerCase() !== 'y') {
                    console.log('  Cancelled.\n');
                    break;
                }
            }

            console.log(`\n  ${c.bold}🔄 Resetting browser data...${c.reset}\n`);

            // Stop browser
            try {
                await closeBrowser();
                console.log(`  ${c.dim}✓ browser stopped${c.reset}`);
            } catch {
                console.log(`  ${c.dim}✓ browser not running${c.reset}`);
            }

            // Clear profile
            if (existsSync(PROFILE_DIR)) {
                rmSync(PROFILE_DIR, { recursive: true, force: true });
                console.log(`  ${c.dim}✓ cleared ${PROFILE_DIR}${c.reset}`);
            }

            // Clear screenshots
            if (existsSync(SCREENSHOTS_DIR)) {
                rmSync(SCREENSHOTS_DIR, { recursive: true, force: true });
                console.log(`  ${c.dim}✓ cleared ${SCREENSHOTS_DIR}${c.reset}`);
            }

            console.log(`\n  ${c.green}✅ Browser reset complete!${c.reset}\n`);
            break;
        }
        default:
            console.log(`
  🌐 browser.mjs — Standalone browser control for AI agents

  Prerequisites:
    npm install playwright-core    (or: npm install -g playwright-core)

  Commands:
    start [--port <9222>] [--headless]  Start Chrome (headless for WSL/CI/Docker)
    stop                   Stop Chrome
    status                 Connection status
    reset [--force]        Reset (clear profile + screenshots)

    snapshot               Page snapshot with ref IDs
      --interactive        Interactive elements only
    screenshot             Capture screenshot
      --full-page          Full page
      --ref <ref>          Specific element only
      --json               Output JSON (path, dpr, viewport)
    mouse-click <x> <y>    Click at pixel coordinates [--double]
    click <ref>            Click element [--double]
    type <ref> <text>      Type text [--submit]
    press <key>            Press key (Enter, Tab, Escape…)
    hover <ref>            Hover element
    navigate <url>         Go to URL
    tabs                   List tabs
    text                   Page text [--format text|html]
    evaluate <js>          Execute JavaScript

  Environment:
    BROWSER_AGENT_HOME     Data directory (default: ~/.browser-agent)
    CDP_PORT               Default CDP port (default: 9222)
    CHROME_HEADLESS=1      Force headless mode
    CHROME_NO_SANDBOX=1    Disable sandbox (Docker/CI)
`);
    }
    // Force exit — playwright CDP WebSocket keeps event loop alive
    process.exit(0);
} catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
}

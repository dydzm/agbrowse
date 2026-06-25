// @ts-check

// Parity catalog 203.3 (P2): Camoufox stealth-browser fallback (hardened fingerprint).
// agbrowse escalated only to its own CDP Chrome; this adds a Python Camoufox render lane.
// Reverse port of cli-jaw adaptive-fetch/camoufox-session.ts. Spawn-based (no-op without
// python3 + camoufox); bails before spawning when the overall deadline already fired.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** @type {string|null|undefined} */
let cachedPython;
/** @type {boolean|undefined} */
let cachedAvailable;

/** @returns {Promise<string|null>} */
async function detectPython() {
    if (cachedPython !== undefined) return cachedPython;
    for (const name of ['python3', 'python']) {
        try {
            const { stdout } = await execFileAsync(name, ['--version']);
            if (stdout.includes('Python 3')) {
                cachedPython = name;
                return name;
            }
        } catch { /* not found */ }
    }
    cachedPython = null;
    return null;
}

/** @returns {Promise<boolean>} */
async function detectCamoufox() {
    if (cachedAvailable !== undefined) return cachedAvailable;
    const python = await detectPython();
    if (!python) { cachedAvailable = false; return false; }
    try {
        await execFileAsync(python, ['-c', 'from camoufox.sync_api import Camoufox; print("ok")'], { timeout: 10_000 });
        cachedAvailable = true;
        return true;
    } catch {
        cachedAvailable = false;
        return false;
    }
}

/**
 * @typedef {{ ok: boolean, html: string, title: string, url: string }} CamoufoxResult
 */

/**
 * @param {string} url
 * @param {{ timeoutMs?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<CamoufoxResult|null>}
 */
export async function fetchViaCamoufox(url, options) {
    // P0-6: bail before spawning if the overall deadline already fired.
    if (options?.signal?.aborted) return null;
    const available = await detectCamoufox();
    if (!available) return null;

    const python = /** @type {string} */ (cachedPython);
    const timeout = Math.ceil((options?.timeoutMs || 30_000) / 1000);
    const script = [
        'import json, sys',
        'from camoufox.sync_api import Camoufox',
        `url = ${JSON.stringify(url)}`,
        `timeout = ${timeout * 1000}`,
        'with Camoufox(headless=True) as browser:',
        '    page = browser.new_page()',
        '    page.goto(url, timeout=timeout)',
        '    title = page.title()',
        '    html = page.content()',
        '    print(json.dumps({"ok": True, "title": title, "html": html, "url": url}))',
    ].join('\n');

    try {
        const { stdout } = await execFileAsync(python, ['-c', script], {
            timeout: (timeout + 30) * 1000,
            maxBuffer: 10_000_000,
            // P0-6: kill the Camoufox subprocess if the overall deadline fires.
            ...(options?.signal ? { signal: options.signal } : {}),
        });
        return JSON.parse(stdout.trim().split('\n').pop() || '{}');
    } catch {
        return null;
    }
}

export { detectCamoufox, detectPython };

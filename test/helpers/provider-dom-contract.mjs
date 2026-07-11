// @ts-check
/**
 * Test-only strict contract loader for provider-dom fixtures.
 * Reads data-eval-key records from fixture HTML without DOM semantic inference.
 * Production modules must NEVER import this file.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const FIXTURE_DIR = 'test/fixtures/provider-dom';

/**
 * @typedef {{
 *   key: string,
 *   label: string|null,
 *   tier: string|null,
 *   intent: string|null,
 *   ref: string|null,
 *   role: string|null,
 *   ariaChecked: string|null,
 *   dataState: string|null,
 *   tagName: string,
 * }} EvalKeyRecord
 */

const EVAL_KEY_RE = /<([a-z][a-z0-9]*)\b([^>]*?)\bdata-eval-key="([^"]+)"([^>]*)>/gi;

/**
 * Parse all data-eval-key annotated elements from fixture HTML.
 * Does NOT infer DOM semantics - only reads explicit annotations.
 * @param {string} html
 * @returns {EvalKeyRecord[]}
 */
export function parseEvalKeyRecords(html) {
    /** @type {EvalKeyRecord[]} */
    const records = [];
    const str = String(html || '');
    let match;
    while ((match = EVAL_KEY_RE.exec(str)) !== null) {
        const tagName = match[1].toLowerCase();
        const allAttrs = match[2] + ' data-eval-key="' + match[3] + '"' + match[4];
        records.push({
            key: match[3],
            label: extractAttr(allAttrs, 'data-eval-label'),
            tier: extractAttr(allAttrs, 'data-eval-tier'),
            intent: extractAttr(allAttrs, 'data-eval-intent'),
            ref: extractAttr(allAttrs, 'data-eval-ref'),
            role: extractAttr(allAttrs, 'role'),
            ariaChecked: extractAttr(allAttrs, 'aria-checked'),
            dataState: extractAttr(allAttrs, 'data-state'),
            tagName,
        });
    }
    return records;
}

/**
 * @param {string} attrs
 * @param {string} name
 * @returns {string|null}
 */
function extractAttr(attrs, name) {
    const re = new RegExp(`\\b${escapeRe(name)}="([^"]*)"`, 'i');
    const m = attrs.match(re);
    return m ? m[1] : null;
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Load a fixture file and return its eval-key records.
 * @param {string} fileName - e.g. 'chatgpt-gpt56-chat.html'
 * @returns {Promise<{ html: string, records: EvalKeyRecord[], recordsByKey: Map<string, EvalKeyRecord> }>}
 */
export async function loadFixtureContract(fileName) {
    const filePath = path.resolve(FIXTURE_DIR, fileName);
    const html = await fs.readFile(filePath, 'utf8');
    const records = parseEvalKeyRecords(html);
    const recordsByKey = new Map(records.map(r => [r.key, r]));
    return { html, records, recordsByKey };
}

/**
 * Check for duplicate data-eval-key values.
 * @param {EvalKeyRecord[]} records
 * @returns {string[]} duplicate keys
 */
export function findDuplicateKeys(records) {
    const seen = new Set();
    const dupes = new Set();
    for (const r of records) {
        if (seen.has(r.key)) dupes.add(r.key);
        seen.add(r.key);
    }
    return [...dupes];
}

// @ts-check
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execBrowser } from '../helpers/exec-browser.mjs';

/** @type {string} */
let tempDir;
/** @type {string} */
let schemaPath;
/** @type {string} */
let pricingHtmlPath;
/** @type {string} */
let prosePath;

beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'agbrowse-extract-'));
    schemaPath = join(tempDir, 'pricing.schema.json');
    writeFileSync(schemaPath, JSON.stringify({
        type: 'array',
        items: {
            type: 'object',
            properties: {
                plan: { type: 'string' },
                price: { type: 'number' },
            },
            required: ['plan', 'price'],
        },
        minItems: 1,
    }));
    pricingHtmlPath = join(tempDir, 'pricing.html');
    writeFileSync(pricingHtmlPath, `
<html><body>
<table>
  <tr><th>Plan</th><th>Price</th></tr>
  <tr><td>Free</td><td>$0</td></tr>
  <tr><td>Pro</td><td>$25</td></tr>
</table>
</body></html>`);
    prosePath = join(tempDir, 'prose.html');
    writeFileSync(prosePath, '<html><body><p>Nothing structured here.</p></body></html>');
});

afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
});

describe.sequential('extract CLI', () => {
    it('--help exits 0 and prints usage', async () => {
        const result = await execBrowser(['extract', '--help']);
        expect(result.code).toBe(0);
        expect(result.stdout).toContain('agbrowse extract');
        expect(result.stdout).toContain('--schema');
        expect(result.stdout).toContain('--escalate-web-ai');
    });

    it('extracts a local HTML table into schema-shaped JSON (Tier 1, exit 0)', async () => {
        const result = await execBrowser([
            'extract', '--from-file', pricingHtmlPath, '--schema', schemaPath, '--json',
        ]);
        expect(result.code).toBe(0);
        const body = JSON.parse(result.stdout);
        expect(body.schemaVersion).toBe('agbrowse-extract-v1');
        expect(body.ok).toBe(true);
        expect(body.tier).toBe(1);
        expect(body.verdict).toBe('extracted');
        expect(body.source).toBe('table');
        expect(body.data).toEqual([
            { plan: 'Free', price: 0 },
            { plan: 'Pro', price: 25 },
        ]);
        expect(body.evidence).toContain('extract-schema-v1');
    });

    it('fails closed with no_mappable_structure on a prose page (exit 1)', async () => {
        const result = await execBrowser([
            'extract', '--from-file', prosePath, '--schema', schemaPath, '--json',
        ]);
        expect(result.code).toBe(1);
        const body = JSON.parse(result.stdout);
        expect(body.ok).toBe(false);
        expect(body.verdict).toBe('no_mappable_structure');
        expect(body.candidatesConsidered).toBe(0);
        expect(body.structuresAvailable).toBeDefined();
        expect(body.structuresAvailable.tables).toEqual([]);
    });

    it('rejects an unsupported schema construct fail-closed (exit 1)', async () => {
        const badSchemaPath = join(tempDir, 'bad.schema.json');
        writeFileSync(badSchemaPath, JSON.stringify({ type: 'object', patternProperties: {}, properties: { a: { type: 'date' } } }));
        const result = await execBrowser([
            'extract', '--from-file', pricingHtmlPath, '--schema', badSchemaPath, '--json',
        ]);
        expect(result.code).toBe(1);
        const body = JSON.parse(result.stdout);
        expect(body.ok).toBe(false);
        expect(body.verdict).toBe('schema_unsupported');
    });

    it('requires --schema (exit 1)', async () => {
        const result = await execBrowser(['extract', '--from-file', pricingHtmlPath]);
        expect(result.code).toBe(1);
        expect(result.stderr).toContain('--schema');
    });

    it('requires a url or --from-file (exit 1)', async () => {
        const result = await execBrowser(['extract', '--schema', schemaPath]);
        expect(result.code).toBe(1);
        expect(result.stderr).toContain('--from-file');
    });

    it('rejects an invalid --source value (exit 1)', async () => {
        const result = await execBrowser(['extract', '--from-file', pricingHtmlPath, '--schema', schemaPath, '--source', 'json-ld']);
        expect(result.code).toBe(1);
        expect(result.stderr).toContain('invalid --source');
    });
});

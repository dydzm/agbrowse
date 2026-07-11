// @ts-check
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mapStructuredToSchema, coerceCell, parseJsonFromText, runExtractCli } from '../../skills/browser/extract.mjs';
import { extractStructuredContent } from '../../skills/browser/adaptive-fetch/structured-extractor.mjs';

const PRICE_TABLE_HTML = `
<html><body>
<h1>Pricing</h1>
<table>
  <tr><th>Plan</th><th>Price</th><th>Active</th></tr>
  <tr><td>Free</td><td>$0</td><td>yes</td></tr>
  <tr><td>Developer</td><td>$20</td><td>yes</td></tr>
  <tr><td>Legacy</td><td>$5</td><td>no</td></tr>
</table>
</body></html>`;

const ARRAY_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            plan: { type: 'string' },
            price: { type: 'number' },
            active: { type: 'boolean' },
        },
        required: ['plan', 'price'],
    },
    minItems: 1,
};

describe('mapStructuredToSchema (Tier 1)', () => {
    it('maps a th-headed table to an array of objects with coercion', () => {
        const structured = extractStructuredContent(PRICE_TABLE_HTML);
        const result = mapStructuredToSchema(ARRAY_SCHEMA, structured);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.source).toBe('table');
            expect(result.data).toEqual([
                { plan: 'Free', price: 0, active: true },
                { plan: 'Developer', price: 20, active: true },
                { plan: 'Legacy', price: 5, active: false },
            ]);
        }
    });

    it('falls back to first row as headers when table has no th', () => {
        const html = `<table>
          <tr><td>Plan</td><td>Price</td></tr>
          <tr><td>Free</td><td>0</td></tr>
        </table>`;
        const structured = extractStructuredContent(html);
        const schema = {
            type: 'array',
            items: { type: 'object', properties: { plan: { type: 'string' }, price: { type: 'number' } }, required: ['plan'] },
        };
        const result = mapStructuredToSchema(schema, structured);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data).toEqual([{ plan: 'Free', price: 0 }]);
    });

    it('fails closed when required properties are not covered by headers', () => {
        const structured = extractStructuredContent(PRICE_TABLE_HTML);
        const schema = {
            type: 'array',
            items: { type: 'object', properties: { sku: { type: 'string' } }, required: ['sku'] },
        };
        const result = mapStructuredToSchema(schema, structured);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.candidatesConsidered).toBeGreaterThan(0);
            expect(result.errors.some(e => e.code === 'table.headers-unmatched')).toBe(true);
        }
    });

    it('fails closed with structure.none when the page has no structures', () => {
        const structured = extractStructuredContent('<html><body><p>prose only</p></body></html>');
        const result = mapStructuredToSchema(ARRAY_SCHEMA, structured);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.candidatesConsidered).toBe(0);
            expect(result.errors[0].code).toBe('structure.none');
        }
    });

    it('maps JSON-LD nodes for object schemas', () => {
        const html = `<html><head><script type="application/ld+json">
          {"@context":"https://schema.org","@type":"Product","name":"Widget","price":9.99}
        </script></head><body></body></html>`;
        const structured = extractStructuredContent(html);
        const schema = {
            type: 'object',
            properties: { name: { type: 'string' }, price: { type: 'number' } },
            required: ['name'],
        };
        const result = mapStructuredToSchema(schema, structured);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.source).toBe('jsonld');
    });

    it('maps a key/value table to a single object', () => {
        const html = `<table>
          <tr><td>Name</td><td>Widget</td></tr>
          <tr><td>Price</td><td>9.99</td></tr>
        </table>`;
        const structured = extractStructuredContent(html);
        const schema = {
            type: 'object',
            properties: { name: { type: 'string' }, price: { type: 'number' } },
            required: ['name', 'price'],
        };
        const result = mapStructuredToSchema(schema, structured);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data).toEqual({ name: 'Widget', price: 9.99 });
    });

    it('respects --source table (skips jsonld)', () => {
        const html = `<html><head><script type="application/ld+json">
          {"name":"FromJsonLd"}
        </script></head><body></body></html>`;
        const structured = extractStructuredContent(html);
        const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
        const result = mapStructuredToSchema(schema, structured, { sourceMode: 'table' });
        expect(result.ok).toBe(false);
    });
});

describe('coerceCell', () => {
    it('coerces currency and separators to number', () => {
        expect(coerceCell('$1,234.50', 'number')).toBe(1234.5);
        expect(coerceCell('₩20,000', 'number')).toBe(20000);
        expect(coerceCell('42', 'integer')).toBe(42);
    });

    it('refuses non-numeric text for number', () => {
        expect(coerceCell('contact us', 'number')).toBeUndefined();
        expect(coerceCell('3.5', 'integer')).toBeUndefined();
    });

    it('coerces booleans conservatively', () => {
        expect(coerceCell('Yes', 'boolean')).toBe(true);
        expect(coerceCell('no', 'boolean')).toBe(false);
        expect(coerceCell('maybe', 'boolean')).toBeUndefined();
    });

    it('keeps empty cells absent', () => {
        expect(coerceCell('', 'string')).toBeUndefined();
        expect(coerceCell(undefined, 'string')).toBeUndefined();
    });
});

describe('parseJsonFromText', () => {
    it('parses plain JSON', () => {
        expect(parseJsonFromText('{"a":1}')).toEqual({ a: 1 });
    });

    it('parses fenced JSON', () => {
        expect(parseJsonFromText('```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }]);
    });

    it('extracts JSON embedded in prose', () => {
        expect(parseJsonFromText('Here is the data: {"a":1} hope it helps')).toEqual({ a: 1 });
    });

    it('returns undefined for no JSON', () => {
        expect(parseJsonFromText('no json here')).toBeUndefined();
    });
});

describe('Tier 2 escalation (mock web-ai)', () => {
    /** Build CLI deps capturing output without exiting the process. */
    function makeIo() {
        /** @type {string[]} */
        const out = [];
        /** @type {number[]} */
        const codes = [];
        return {
            out, codes,
            deps: {
                log: (/** @type {string} */ line) => out.push(line),
                error: () => {},
                exit: (/** @type {number} */ code) => codes.push(code),
            },
        };
    }

    function writeFixtures() {
        const dir = mkdtempSync(join(tmpdir(), 'agbrowse-extract-t2-'));
        const schemaPath = join(dir, 's.json');
        writeFileSync(schemaPath, JSON.stringify({
            type: 'object',
            properties: { name: { type: 'string' }, price: { type: 'number' } },
            required: ['name', 'price'],
        }));
        const htmlPath = join(dir, 'p.html');
        // Prose page: Tier 1 must fail, forcing escalation.
        writeFileSync(htmlPath, '<html><body><p>Widget costs about ten dollars.</p></body></html>');
        return { schemaPath, htmlPath };
    }

    it('validates mock web-ai JSON with the same validator (ok path)', async () => {
        const { schemaPath, htmlPath } = writeFixtures();
        const io = makeIo();
        await runExtractCli([
            '--from-file', htmlPath, '--schema', schemaPath, '--json', '--escalate-web-ai',
        ], {
            ...io.deps,
            runWebAiQuery: async () => ({ text: '```json\n{"name":"Widget","price":9.99}\n```' }),
        });
        const body = JSON.parse(io.out.join('\n'));
        expect(body.ok).toBe(true);
        expect(body.tier).toBe(2);
        expect(body.verdict).toBe('extracted');
        expect(body.source).toBe('web-ai');
        expect(body.data).toEqual({ name: 'Widget', price: 9.99 });
        expect(io.codes).toEqual([]);
    });

    it('fails closed when mock web-ai JSON violates the schema', async () => {
        const { schemaPath, htmlPath } = writeFixtures();
        const io = makeIo();
        await runExtractCli([
            '--from-file', htmlPath, '--schema', schemaPath, '--json', '--escalate-web-ai',
        ], {
            ...io.deps,
            runWebAiQuery: async () => ({ text: '{"name":"Widget","price":"cheap"}' }),
        });
        const body = JSON.parse(io.out.join('\n'));
        expect(body.ok).toBe(false);
        expect(body.tier).toBe(2);
        expect(body.verdict).toBe('web_ai_schema_mismatch');
        expect(io.codes).toEqual([1]);
    });

    it('fails closed when mock web-ai returns no JSON', async () => {
        const { schemaPath, htmlPath } = writeFixtures();
        const io = makeIo();
        await runExtractCli([
            '--from-file', htmlPath, '--schema', schemaPath, '--json', '--escalate-web-ai',
        ], {
            ...io.deps,
            runWebAiQuery: async () => ({ text: 'sorry, I cannot help with that' }),
        });
        const body = JSON.parse(io.out.join('\n'));
        expect(body.ok).toBe(false);
        expect(body.verdict).toBe('web_ai_unparseable');
        expect(io.codes).toEqual([1]);
    });
});

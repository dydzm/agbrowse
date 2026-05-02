import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { loadActionCache, saveActionCache } from '../../web-ai/action-cache.mjs';
import { CACHE_SCHEMA_VERSION } from '../../web-ai/constants.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('web-ai cache-schema', () => {
    let tempDir;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'cache-schema-test-'));
    });

    afterEach(() => {
        try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    });

    it('migrates old schema v1 to empty cache', () => {
        const oldCache = { schemaVersion: 1, entries: { a: { target: {} } } };
        saveActionCache(oldCache, tempDir);
        const cache = loadActionCache(tempDir);
        expect(cache.schemaVersion).toBe(CACHE_SCHEMA_VERSION);
        expect(Object.keys(cache.entries)).toHaveLength(0);
    });
});

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { recordCacheEvent, reportCacheMetricsFromEvents } from '../../web-ai/cache-metrics.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('web-ai cache-metrics', () => {
    let tempDir;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'cache-metrics-test-'));
    });

    afterEach(() => {
        try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    });

    it('records and reports events', () => {
        recordCacheEvent(tempDir, { type: 'lookup', provider: 'chatgpt' });
        recordCacheEvent(tempDir, { type: 'cache-hit-valid', provider: 'chatgpt' });
        const report = reportCacheMetricsFromEvents(tempDir);
        expect(report).not.toBeNull();
        expect(report.totalLookups).toBe(1);
        expect(report.cacheHitsValid).toBe(1);
    });
});

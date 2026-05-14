import { describe, expect, it } from 'vitest';
import { runAdaptiveFetch } from '../../skills/browser/adaptive-fetch/index.mjs';

describe('adaptive fetch browser escalation', () => {
    it('does not call browser dependencies in browser never mode', async () => {
        let browserCalled = false;
        const result = await runAdaptiveFetch({
            url: 'https://example.com/a',
            browserMode: 'never',
            publicEndpoints: false,
        }, {
            fetch: async () => new Response('<title>Weak</title><p>Short</p>', {
                status: 200,
                headers: { 'content-type': 'text/html' },
            }),
            getPage: async () => {
                browserCalled = true;
                return fakePage({});
            },
        });
        expect(browserCalled).toBe(false);
        expect(result.chromeUsed).toBe(false);
    });

    it('surfaces archive fallback as deferred instead of silently ignoring the flag', async () => {
        const result = await runAdaptiveFetch({
            url: 'https://example.com/a',
            browserMode: 'never',
            publicEndpoints: false,
            allowArchive: true,
        }, {
            fetch: async () => new Response('<title>Weak</title><p>Short</p>', {
                status: 200,
                headers: { 'content-type': 'text/html' },
            }),
        });
        expect(result.warnings).toContain('archive-fallback-deferred');
    });

    it('uses browser required mode after URL validation', async () => {
        const result = await runAdaptiveFetch({
            url: 'https://example.com/spa',
            browserMode: 'required',
            browserSession: 'isolated',
            trace: true,
        }, {
            createIsolatedPage: async () => ({
                page: fakePage({ text: 'Rendered article body '.repeat(120), title: 'Rendered title' }),
                cleanup: async () => undefined,
            }),
        });
        expect(result.ok).toBe(true);
        expect(result.source).toBe('browser');
        expect(result.chromeUsed).toBe(true);
        expect(result.attempts.some(a => a.source === 'browser')).toBe(true);
    });

    it('auto mode lets browser render beat weak direct fetch', async () => {
        const result = await runAdaptiveFetch({
            url: 'https://example.com/spa',
            browserMode: 'auto',
            browserSession: 'isolated',
            publicEndpoints: false,
            trace: true,
        }, {
            fetch: async () => new Response('<title>SPA</title><div id="root"></div>', {
                status: 200,
                headers: { 'content-type': 'text/html' },
            }),
            createIsolatedPage: async () => ({
                page: fakePage({
                    text: 'Hydrated article body '.repeat(140),
                    title: 'Hydrated title',
                    networkCandidates: [{
                        source: 'network_api',
                        finalUrl: 'https://example.com/data.json',
                        text: '{"body":"network json"}',
                        evidence: ['fixture'],
                    }],
                }),
                cleanup: async () => undefined,
            }),
        });
        expect(result.source).toBe('browser');
        expect(result.verdict).toBe('strong_ok');
        expect(result.attempts.some(a => a.source === 'network_api')).toBe(true);
    });

    it('returns browser_required when required browser dependency is missing', async () => {
        const result = await runAdaptiveFetch({
            url: 'https://example.com/spa',
            browserMode: 'required',
            trace: true,
        });
        expect(result.ok).toBe(false);
        expect(result.verdict).toBe('browser_required');
        expect(result.chromeRequired).toBe(true);
    });
});

function fakePage({ text = '', title = '', networkCandidates = [] }) {
    return {
        async goto() {},
        async waitForTimeout() {},
        url: () => 'https://example.com/rendered',
        title: async () => title,
        evaluate: async () => text,
        on: async (_event, handler) => {
            for (const candidate of networkCandidates) handler(fakeResponse(candidate));
        },
        off: () => undefined,
    };
}

function fakeResponse(candidate) {
    return {
        headers: () => ({ 'content-type': 'application/json' }),
        text: async () => candidate.text,
        url: () => candidate.finalUrl,
        status: () => 200,
        ok: () => true,
    };
}

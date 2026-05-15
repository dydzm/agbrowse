import { describe, expect, it } from 'vitest';
import {
    fromBrowserResult,
    fromFetchResult,
    fromHumanResolvedResult,
    fromMetadataResult,
    fromNetworkCandidate,
    fromPublicEndpointResult,
    normalizeReaderCandidate,
    normalizeReaderCandidates,
} from '../../skills/browser/adaptive-fetch/reader-adapters.mjs';

describe('adaptive fetch reader adapters', () => {
    it('normalizes fetch HTML into a reader candidate with metadata evidence', () => {
        const candidate = fromFetchResult({
            ok: true,
            status: 200,
            finalUrl: 'https://example.com/a',
            contentType: 'text/html',
            text: '<title>Hello</title><meta name="description" content="Desc"><article>Readable body</article>',
            evidence: ['http-200'],
        }, { source: 'fetch', label: 'direct-fetch' });
        expect(candidate.source).toBe('fetch');
        expect(candidate.label).toBe('direct-fetch');
        expect(candidate.title).toBe('Hello');
        expect(candidate.text).toContain('Readable body');
        expect(candidate.evidence).toContain('description');
    });

    it('normalizes all planned candidate families into one shape', () => {
        const candidates = normalizeReaderCandidates([
            fromMetadataResult({ finalUrl: 'https://example.com/meta', title: 'Meta', text: 'Metadata text' }),
            fromPublicEndpointResult({ finalUrl: 'https://api.example.com/a', text: 'Public JSON', evidence: ['api'] }),
            fromBrowserResult({ finalUrl: 'https://example.com/browser', text: 'Browser text' }),
            fromNetworkCandidate({ finalUrl: 'https://example.com/data.json', text: 'Network JSON' }),
        ]);
        expect(candidates.map(c => c.source)).toEqual(['metadata', 'public_endpoint', 'browser', 'network_api']);
        expect(candidates.every(c => typeof c.text === 'string')).toBe(true);
    });

    it('normalizeReaderCandidate preserves safetyFlags array', () => {
        const candidate = normalizeReaderCandidate({
            source: 'browser_user',
            finalUrl: 'https://example.com',
            text: 'content',
            safetyFlags: ['user_session_used'],
        });
        expect(candidate.safetyFlags).toEqual(['user_session_used']);
    });

    it('normalizeReaderCandidate defaults safetyFlags to empty array', () => {
        const candidate = normalizeReaderCandidate({
            source: 'fetch',
            finalUrl: 'https://example.com',
            text: 'content',
        });
        expect(candidate.safetyFlags).toEqual([]);
    });

    it('fromHumanResolvedResult produces correct shape with safety flags', () => {
        const candidate = fromHumanResolvedResult({
            finalUrl: 'https://example.com/article',
            title: 'Article Title',
            text: 'Full article text after human resolved challenge',
            contentType: 'text/html',
            status: 200,
        });
        expect(candidate.source).toBe('human_resolved');
        expect(candidate.label).toBe('human-resolved');
        expect(candidate.safetyFlags).toEqual(['user_session_used', 'human_action_taken']);
        expect(candidate.evidence).toContain('human-resolved-challenge');
        expect(candidate.ok).toBe(true);
        expect(candidate.text).toContain('Full article text');
    });
});


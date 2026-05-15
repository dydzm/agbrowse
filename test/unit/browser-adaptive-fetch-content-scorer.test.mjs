import { describe, expect, it } from 'vitest';
import { chooseBestReaderCandidate, scoreReaderCandidate, verdictFromScore } from '../../skills/browser/adaptive-fetch/content-scorer.mjs';

describe('adaptive fetch content scorer', () => {
    it('prefers dense article text over metadata-only shells', () => {
        const best = chooseBestReaderCandidate([
            {
                source: 'metadata',
                finalUrl: 'https://example.com/meta',
                title: 'Metadata only',
                text: 'Short summary',
                metadata: { description: 'Short summary' },
                rawTextLength: 5000,
                evidence: ['description'],
            },
            {
                source: 'fetch',
                finalUrl: 'https://example.com/article',
                title: 'Detailed article',
                text: 'Readable article body '.repeat(160),
                metadata: { jsonLd: [{ '@type': 'Article' }] },
                rawTextLength: 3600,
                evidence: ['json-ld'],
            },
        ]);
        expect(best.candidate.finalUrl).toBe('https://example.com/article');
        expect(best.verdict).toBe('strong_ok');
        expect(best.evidence).toContain('json-ld');
    });

    it('penalizes challenge shells even when they have status 200 text', () => {
        const scored = scoreReaderCandidate({
            source: 'fetch',
            finalUrl: 'https://example.com/',
            title: 'Checking your browser',
            text: 'Verify you are human captcha',
            rawTextLength: 30,
            evidence: [],
        });
        expect(scored.verdict).toBe('challenge');
        expect(scored.evidence).toContain('marker:challenge');
    });

    it('maps score thresholds to verdicts', () => {
        expect(verdictFromScore({ score: 80 })).toBe('strong_ok');
        expect(verdictFromScore({ score: 25 })).toBe('weak_ok');
        expect(verdictFromScore({ score: 5 })).toBe('blocked');
    });

    it('scores human_resolved and browser_user sources with appropriate trust', () => {
        const humanResolved = scoreReaderCandidate({
            source: 'human_resolved',
            finalUrl: 'https://example.com/',
            title: 'Detailed article title',
            text: 'Article body '.repeat(200),
            rawTextLength: 2800,
            evidence: ['human-resolved-challenge'],
        });
        const browserUser = scoreReaderCandidate({
            source: 'browser_user',
            finalUrl: 'https://example.com/',
            title: 'Detailed article title',
            text: 'Article body '.repeat(200),
            rawTextLength: 2800,
            evidence: ['user-session-render'],
        });
        const regularBrowser = scoreReaderCandidate({
            source: 'browser',
            finalUrl: 'https://example.com/',
            title: 'Detailed article title',
            text: 'Article body '.repeat(200),
            rawTextLength: 2800,
            evidence: ['browser-render'],
        });
        expect(humanResolved.score).toBeGreaterThan(regularBrowser.score);
        expect(browserUser.score).toBeGreaterThan(regularBrowser.score);
    });
});


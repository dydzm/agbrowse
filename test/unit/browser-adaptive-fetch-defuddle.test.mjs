import { beforeEach, describe, expect, it } from 'vitest';
import { resetDefuddleBundleCache, runDefuddleInPage } from '../../skills/browser/adaptive-fetch/defuddle-extractor.mjs';
import { collectDefuddleCandidate } from '../../skills/browser/adaptive-fetch/browser-escalation.mjs';

const PARSED_FIXTURE = {
    content: '# Title\n\nBody paragraph.',
    title: 'Title',
    author: 'Author',
    published: '2026-06-10',
    wordCount: 3,
};

/**
 * Fake page: first evaluate call is the Defuddle-defined probe, later calls
 * run the parse callback. `evaluateResults` queues return values in order.
 */
function makeFakePage({ evaluateResults = [], addScriptTagError = null, noAddScriptTag = false } = {}) {
    const calls = { addScriptTag: 0, evaluate: 0 };
    const queue = [...evaluateResults];
    const page = {
        evaluate: async () => {
            calls.evaluate += 1;
            const next = queue.shift();
            if (next instanceof Error) throw next;
            return next;
        },
    };
    if (!noAddScriptTag) {
        page.addScriptTag = async () => {
            calls.addScriptTag += 1;
            if (addScriptTagError) throw addScriptTagError;
        };
    }
    return { page, calls };
}

describe('defuddle extractor', () => {
    beforeEach(() => resetDefuddleBundleCache());

    it('returns parsed content via addScriptTag injection', async () => {
        const { page, calls } = makeFakePage({
            // probe: not yet injected → addScriptTag → parse returns fixture
            evaluateResults: [false, PARSED_FIXTURE],
        });
        const result = await runDefuddleInPage(page);
        expect(result.reason).toBeNull();
        expect(result.parsed.content).toContain('Body paragraph');
        expect(calls.addScriptTag).toBe(1);
    });

    it('skips re-injection when Defuddle is already defined', async () => {
        const { page, calls } = makeFakePage({
            evaluateResults: [true, PARSED_FIXTURE],
        });
        const result = await runDefuddleInPage(page);
        expect(result.parsed.title).toBe('Title');
        expect(calls.addScriptTag).toBe(0);
    });

    it('falls back to evaluate injection when addScriptTag is CSP-blocked', async () => {
        const { page } = makeFakePage({
            addScriptTagError: new Error('Refused to execute inline script (CSP)'),
            // probe false → addScriptTag throws → eval-inject (undefined) →
            // defined probe true → parse returns fixture
            evaluateResults: [false, undefined, true, PARSED_FIXTURE],
        });
        const result = await runDefuddleInPage(page);
        expect(result.reason).toBeNull();
        expect(result.parsed.wordCount).toBe(3);
    });

    it('reports csp-blocked when both injection paths fail', async () => {
        const { page } = makeFakePage({
            addScriptTagError: new Error('CSP'),
            evaluateResults: [false, new Error('unsafe-eval blocked')],
        });
        const result = await runDefuddleInPage(page);
        expect(result.parsed).toBeNull();
        expect(result.reason).toBe('defuddle:csp-blocked');
    });

    it('reports empty-content when parse yields nothing useful', async () => {
        const { page } = makeFakePage({
            evaluateResults: [true, { ...PARSED_FIXTURE, content: '   ' }],
        });
        const result = await runDefuddleInPage(page);
        expect(result.parsed).toBeNull();
        expect(result.reason).toBe('defuddle:empty-content');
    });

    it('returns no-evaluate for pages without evaluate support', async () => {
        const result = await runDefuddleInPage({});
        expect(result.parsed).toBeNull();
        expect(result.reason).toBe('defuddle:no-evaluate');
    });
});

describe('collectDefuddleCandidate', () => {
    it('returns the attached candidate', () => {
        const candidate = { label: 'browser-defuddle', text: '# md' };
        expect(collectDefuddleCandidate({ defuddleCandidate: candidate })).toBe(candidate);
    });

    it('returns null when absent', () => {
        expect(collectDefuddleCandidate({})).toBeNull();
        expect(collectDefuddleCandidate(null)).toBeNull();
    });
});

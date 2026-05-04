import { describe, expect, it } from 'vitest';
import { collectMetricRegressions, compareEvalRuns, summarizeEvalResults } from '../../web-ai/eval/metrics.mjs';

describe('web-ai eval metrics', () => {
    it('summarizes pass rate as a ratio metric', () => {
        const summary = summarizeEvalResults([{ status: 'pass' }, { status: 'fail' }]);
        expect(summary.passCount).toBe(1);
        expect(summary.knownFixturePassRate.value).toBe(0.5);
    });

    it('reports threshold regressions', () => {
        const regressions = collectMetricRegressions({
            provider: 'chatgpt',
            variant: 'baseline',
            metrics: { composerFill: { value: 0, threshold: 1 } },
        });
        expect(regressions[0]).toMatchObject({ metric: 'composerFill', value: 0, threshold: 1 });
    });

    it('compares snapshot token growth against golden', () => {
        const regressions = compareEvalRuns({
            results: [{ provider: 'chatgpt', variant: 'baseline', metrics: { snapshotTokenEstimate: { value: 100 } } }],
        }, {
            results: [{ provider: 'chatgpt', variant: 'baseline', metrics: { snapshotTokenEstimate: { value: 120 } } }],
        });
        expect(regressions[0]).toMatchObject({ metric: 'snapshotTokenEstimate', golden: 100 });
    });
});

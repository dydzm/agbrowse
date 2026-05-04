import { makeRatioMetric } from './types.mjs';

export const DEFAULT_EVAL_THRESHOLDS = Object.freeze({
    knownFixturePassRate: 0.95,
    composerFill: 1.0,
    uploadOpen: 0.9,
    copyExactness: 0.85,
    snapshotTokenEstimateMax: 500,
});

export function summarizeEvalResults(results = []) {
    const passCount = results.filter((result) => result.status === 'pass').length;
    const failCount = results.filter((result) => result.status === 'fail').length;
    return {
        total: results.length,
        passCount,
        failCount,
        knownFixturePassRate: makeRatioMetric(passCount, results.length || 1, DEFAULT_EVAL_THRESHOLDS.knownFixturePassRate),
    };
}

export function collectMetricRegressions(result) {
    const regressions = [];
    for (const [name, metric] of Object.entries(result.metrics || {})) {
        if (!metric || typeof metric !== 'object') continue;
        if (name === 'snapshotTokenEstimate') {
            if (metric.value > DEFAULT_EVAL_THRESHOLDS.snapshotTokenEstimateMax) {
                regressions.push({
                    provider: result.provider,
                    variant: result.variant,
                    metric: name,
                    value: metric.value,
                    threshold: DEFAULT_EVAL_THRESHOLDS.snapshotTokenEstimateMax,
                    fixturePath: result.fixturePath,
                });
            }
            continue;
        }
        if (typeof metric.threshold === 'number' && typeof metric.value === 'number' && metric.value < metric.threshold) {
            regressions.push({
                provider: result.provider,
                variant: result.variant,
                metric: name,
                value: metric.value,
                threshold: metric.threshold,
                fixturePath: result.fixturePath,
            });
        }
    }
    return regressions;
}

export function compareEvalRuns(golden, current) {
    const regressions = [];
    const goldenByKey = new Map((golden?.results || []).map((result) => [`${result.provider}:${result.variant}`, result]));
    for (const result of current?.results || []) {
        const key = `${result.provider}:${result.variant}`;
        const goldenResult = goldenByKey.get(key);
        if (!goldenResult) continue;
        const goldenTokens = Number(goldenResult.metrics?.snapshotTokenEstimate?.value || 0);
        const currentTokens = Number(result.metrics?.snapshotTokenEstimate?.value || 0);
        if (goldenTokens > 0 && currentTokens > Math.ceil(goldenTokens * 1.15)) {
            regressions.push({
                provider: result.provider,
                variant: result.variant,
                metric: 'snapshotTokenEstimate',
                value: currentTokens,
                golden: goldenTokens,
                threshold: Number((goldenTokens * 1.15).toFixed(2)),
            });
        }
    }
    return regressions;
}

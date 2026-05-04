export const EVAL_SCHEMA_VERSION = 1;
export const DEFAULT_MAX_FIXTURE_CONCURRENCY = 1;
export const MAX_FIXTURE_CONCURRENCY = 4;

export const EVAL_VENDORS = ['chatgpt', 'gemini', 'grok'];
export const EVAL_VARIANTS = ['baseline', 'cosmetic-churn', 'structural-churn', 'breaking'];
export const DEFAULT_EVAL_RUN_VARIANTS = ['baseline', 'cosmetic-churn', 'structural-churn'];
export const EVAL_VENDOR_SET = new Set(EVAL_VENDORS);
export const EVAL_VARIANT_SET = new Set(EVAL_VARIANTS);

export function normalizeEvalVendor(vendor = 'chatgpt') {
    const normalized = String(vendor || 'chatgpt').trim().toLowerCase();
    if (!EVAL_VENDOR_SET.has(normalized)) {
        throw createEvalError('eval.vendor-unsupported', 'eval-input', `unsupported eval vendor: ${vendor}`, {
            allowed: EVAL_VENDORS,
            vendor,
        });
    }
    return normalized;
}

export function normalizeEvalVariant(variant = 'baseline') {
    const normalized = String(variant || 'baseline').trim().toLowerCase();
    if (!EVAL_VARIANT_SET.has(normalized)) {
        throw createEvalError('eval.variant-unsupported', 'eval-input', `unsupported eval variant: ${variant}`, {
            allowed: EVAL_VARIANTS,
            variant,
        });
    }
    return normalized;
}

export function parseFixtureConcurrency(value, {
    defaultValue = DEFAULT_MAX_FIXTURE_CONCURRENCY,
    max = MAX_FIXTURE_CONCURRENCY,
} = {}) {
    const raw = value ?? defaultValue;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
        throw createEvalError('eval.concurrency-invalid', 'eval-input', `fixture concurrency must be an integer from 1 to ${max}`, {
            value,
            max,
        });
    }
    return parsed;
}

export function makeRatioMetric(numerator, denominator, threshold) {
    const safeNumerator = Number(numerator);
    const safeDenominator = Number(denominator);
    const value = safeDenominator > 0 ? safeNumerator / safeDenominator : 0;
    return {
        numerator: safeNumerator,
        denominator: safeDenominator,
        value: Number(value.toFixed(4)),
        threshold,
    };
}

export function createEvalError(errorCode, stage, message, evidence = {}) {
    const error = new Error(message);
    error.name = 'WebAiEvalError';
    error.errorCode = errorCode;
    error.stage = stage;
    error.mutationAllowed = false;
    error.evidence = evidence;
    error.toJSON = () => ({
        name: error.name,
        errorCode,
        stage,
        message,
        mutationAllowed: false,
        evidence,
    });
    return error;
}

export function serializeEvalError(error) {
    if (typeof error?.toJSON === 'function') return error.toJSON();
    return {
        name: error?.name || 'Error',
        errorCode: error?.errorCode || 'eval.unhandled',
        stage: error?.stage || 'eval',
        message: error?.message || String(error),
        mutationAllowed: false,
        evidence: error?.evidence || {},
    };
}

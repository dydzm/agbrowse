import { describe, expect, it } from 'vitest';
import { createEvalError, makeRatioMetric, normalizeEvalVariant, normalizeEvalVendor, parseFixtureConcurrency } from '../../web-ai/eval/types.mjs';

describe('web-ai eval types', () => {
    it('normalizes supported vendors and variants', () => {
        expect(normalizeEvalVendor('ChatGPT')).toBe('chatgpt');
        expect(normalizeEvalVariant('baseline')).toBe('baseline');
    });

    it('rejects unknown vendor and variant fail-closed', () => {
        expect(() => normalizeEvalVendor('claude')).toThrow(/unsupported eval vendor/);
        expect(() => normalizeEvalVariant('parallel-a')).toThrow(/unsupported eval variant/);
    });

    it('caps fixture concurrency to 1..4', () => {
        expect(parseFixtureConcurrency(undefined)).toBe(1);
        expect(parseFixtureConcurrency('4')).toBe(4);
        expect(() => parseFixtureConcurrency('0')).toThrow(/fixture concurrency/);
        expect(() => parseFixtureConcurrency('5')).toThrow(/fixture concurrency/);
    });

    it('creates ratio metrics and serializable eval errors', () => {
        expect(makeRatioMetric(1, 2, 0.9)).toEqual({ numerator: 1, denominator: 2, value: 0.5, threshold: 0.9 });
        expect(createEvalError('x', 'stage', 'message').toJSON()).toMatchObject({
            errorCode: 'x',
            stage: 'stage',
            mutationAllowed: false,
        });
    });
});

// @ts-check
import { describe, it, expect } from 'vitest';
import {
    MAX_MODEL_ADAPTER_ATTEMPTS,
    MODEL_ADAPTER_TRANSIENT_STATUS,
    isModelAdapterTransient,
} from '../../web-ai/constants.mjs';

describe('G09 model-adapter freeze contract', () => {
    it('hard caps total attempts at 2 (1 initial + 1 retry)', () => {
        expect(MAX_MODEL_ADAPTER_ATTEMPTS).toBe(2);
    });

    it('exposes the canonical transient status set including 408/429/5xx/529', () => {
        for (const code of [408, 429, 500, 502, 503, 504, 529]) {
            expect(MODEL_ADAPTER_TRANSIENT_STATUS).toContain(code);
        }
    });

    it('classifies 4xx (except 408/429) as non-transient', () => {
        for (const code of [400, 401, 403, 404, 413, 422]) {
            expect(isModelAdapterTransient({ statusCode: code })).toBe(false);
        }
    });

    it('classifies 408/429/5xx/529 as transient', () => {
        for (const code of [408, 429, 500, 502, 503, 504, 529]) {
            expect(isModelAdapterTransient({ statusCode: code })).toBe(true);
        }
    });

    it('never retries mid-stream errors after a 200 response', () => {
        expect(isModelAdapterTransient({ statusCode: 500, midStream: true })).toBe(false);
    });

    it('never retries non-idempotent calls even on transient codes', () => {
        expect(isModelAdapterTransient({ statusCode: 500, idempotent: false })).toBe(false);
    });

    it('rejects null/undefined input', () => {
        // @ts-expect-error – exercising defensive branch
        expect(isModelAdapterTransient(null)).toBe(false);
        // @ts-expect-error – exercising defensive branch
        expect(isModelAdapterTransient(undefined)).toBe(false);
    });

    it('respects an explicit transient flag', () => {
        expect(isModelAdapterTransient({ transient: true })).toBe(true);
    });
});

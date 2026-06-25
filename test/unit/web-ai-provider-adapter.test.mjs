import { describe, expect, it } from 'vitest';
import { createDisabledProviderAdapter, ProviderRuntimeDisabledError } from '../../web-ai/provider-adapter.mjs';
import { WebAiError } from '../../web-ai/errors.mjs';

// Parity catalog 201 #7 (P2, contract-only): provider lifecycle adapter.
describe('web-ai provider adapter (disabled factory)', () => {
    it('exposes a non-mutating adapter for the vendor', () => {
        const adapter = createDisabledProviderAdapter('gemini');
        expect(adapter.vendor).toBe('gemini');
        expect(adapter.mutationAllowed).toBe(false);
    });

    it('every lifecycle method fails closed with a typed WebAiError + stage', async () => {
        const adapter = createDisabledProviderAdapter('grok');
        const cases = [
            ['waitForUi', () => adapter.waitForUi(), 'status'],
            ['typePrompt', () => adapter.typePrompt('hi'), 'composer-insert'],
            ['submitPrompt', () => adapter.submitPrompt(), 'send-click'],
            ['waitForResponse', () => adapter.waitForResponse({ timeoutMs: 1 }), 'poll-timeout'],
        ];
        for (const [, call, stage] of cases) {
            try {
                await call();
                expect.fail(`expected ${stage} to throw`);
            } catch (err) {
                expect(err).toBeInstanceOf(ProviderRuntimeDisabledError);
                expect(err).toBeInstanceOf(WebAiError);
                expect(err.errorCode).toBe('provider.runtime-disabled');
                expect(err.stage).toBe(stage);
                expect(err.vendor).toBe('grok');
                expect(err.mutationAllowed).toBe(false);
            }
        }
    });
});

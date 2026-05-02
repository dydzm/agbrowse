import { describe, expect, it, vi } from 'vitest';
import { assertPostAction, scrubTargetForTrace } from '../../web-ai/post-action-assert.mjs';

describe('web-ai post-action-assert', () => {
    it('scrubTargetForTrace removes sensitive fields', () => {
        const target = { selector: '#btn', role: 'button', name: 'Send', extra: 'data' };
        const scrubbed = scrubTargetForTrace(target);
        expect(scrubbed.selector).toBe('#btn');
        expect(scrubbed.role).toBe('button');
        expect(scrubbed.extra).toBeUndefined();
    });

    it('assertPostAction detects value mismatch', async () => {
        const page = {
            locator: vi.fn(() => ({
                inputValue: vi.fn(() => Promise.resolve('wrong')),
            })),
        };
        const result = await assertPostAction(page, 'fill', { selector: '#input' }, { expectedValue: 'expected' });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('value-mismatch');
    });
});

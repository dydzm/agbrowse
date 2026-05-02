import { describe, expect, it } from 'vitest';
import { redactSensitive, appendTraceToSession } from '../../web-ai/trace-persistence.mjs';

describe('web-ai trace-persistence', () => {
    it('redacts API keys', () => {
        const input = 'sk-abc12345678901234567890';
        expect(redactSensitive(input)).toBe('[REDACTED]');
    });

    it('redacts emails recursively', () => {
        const input = { user: 'test@example.com', nested: { key: 'Bearer token123' } };
        const result = redactSensitive(input);
        expect(result.user).toBe('[REDACTED]');
        expect(result.nested.key).toBe('[REDACTED]');
    });
});

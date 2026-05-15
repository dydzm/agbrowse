import { describe, expect, it } from 'vitest';
import { humanResolve } from '../../skills/browser/adaptive-fetch/human-loop.mjs';

describe('adaptive fetch human loop', () => {
    it('non-interactive mode returns actionable message without stdin wait', async () => {
        const result = await humanResolve(
            'https://example.com',
            { browserSession: 'isolated', browserSessionRaw: 'isolated' },
            { type: 'challenge', primary: { profile: { id: 'cloudflare_managed_challenge' } } },
        );
        expect(result.ok).toBe(false);
        expect(result.humanActionNeeded).toBe(true);
        expect(result.actionMessage).toContain('--browser-session interactive');
    });

    it('non-interactive mode with auth_required returns auth message', async () => {
        const result = await humanResolve(
            'https://example.com',
            { browserSession: 'isolated', browserSessionRaw: 'isolated' },
            { type: 'auth_required' },
        );
        expect(result.ok).toBe(false);
        expect(result.verdict).toBe('auth_required');
        expect(result.actionMessage).toContain('auth_required');
    });

    it('non-interactive mode with paywall returns paywall message', async () => {
        const result = await humanResolve(
            'https://example.com/article',
            { browserSession: 'isolated', browserSessionRaw: 'isolated' },
            { type: 'paywall' },
        );
        expect(result.ok).toBe(false);
        expect(result.verdict).toBe('paywall');
    });
});

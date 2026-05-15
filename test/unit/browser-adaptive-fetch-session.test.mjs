import { describe, expect, it } from 'vitest';
import { isUserSessionAvailable, shouldTryUserSession } from '../../skills/browser/adaptive-fetch/browser-session.mjs';

describe('adaptive fetch browser session', () => {
    it('isUserSessionAvailable returns false when no browser deps', () => {
        expect(isUserSessionAvailable()).toBe(false);
        expect(isUserSessionAvailable({ browserDeps: {} })).toBe(false);
    });

    it('isUserSessionAvailable returns true when getPage is available', () => {
        expect(isUserSessionAvailable({ browserDeps: { getPage: () => {} } })).toBe(true);
    });

    it('shouldTryUserSession returns true when session is user', () => {
        expect(shouldTryUserSession([], { browserSessionRaw: 'user' })).toBe(true);
    });

    it('shouldTryUserSession returns true when session is interactive', () => {
        expect(shouldTryUserSession([], { browserSessionRaw: 'interactive' })).toBe(true);
    });

    it('shouldTryUserSession returns false when no challenge and session is fresh', () => {
        expect(shouldTryUserSession([], { browserSession: 'isolated' })).toBe(false);
    });

    it('shouldTryUserSession returns prompt when challenge detected and session available', () => {
        const candidates = [{ challenge: { type: 'challenge' } }];
        const result = shouldTryUserSession(candidates, {
            browserSession: 'isolated',
            browserDeps: { getPage: () => {} },
        });
        expect(result).toBe('prompt');
    });

    it('shouldTryUserSession returns false when challenge detected but no session available', () => {
        const candidates = [{ challenge: { type: 'challenge' } }];
        const result = shouldTryUserSession(candidates, { browserSession: 'isolated' });
        expect(result).toBe(false);
    });
});

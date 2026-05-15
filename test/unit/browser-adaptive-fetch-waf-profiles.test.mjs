import { describe, expect, it } from 'vitest';
import { WAF_PROFILES, getProfileById, scoreProfile } from '../../skills/browser/adaptive-fetch/waf-profiles.mjs';

describe('adaptive fetch WAF profiles', () => {
    it('detects Cloudflare managed challenge from cf-ray header and body', () => {
        const cf = getProfileById('cloudflare_managed_challenge');
        expect(cf).toBeTruthy();
        const score = scoreProfile(cf, {
            cookies: ['cf_clearance', '__cf_bm'],
            headers: { server: 'cloudflare', 'cf-ray': '123abc-LAX' },
            body: '<html>Checking your browser before accessing</html>',
            status: 403,
        });
        expect(score).toBeGreaterThan(5);
    });

    it('detects Cloudflare Turnstile from script URL', () => {
        const turnstile = getProfileById('cloudflare_turnstile');
        expect(turnstile).toBeTruthy();
        const score = scoreProfile(turnstile, {
            cookies: [],
            headers: {},
            body: '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>',
            status: 200,
        });
        expect(score).toBeGreaterThan(0);
    });

    it('detects Akamai from _abck cookie', () => {
        const akamai = getProfileById('akamai_bot_manager');
        expect(akamai).toBeTruthy();
        const score = scoreProfile(akamai, {
            cookies: ['_abck', 'bm_sz'],
            headers: {},
            body: '',
            status: 200,
        });
        expect(score).toBeGreaterThan(0);
    });

    it('returns zero for clean pages', () => {
        const score = scoreProfile(WAF_PROFILES[0], {
            cookies: [],
            headers: { server: 'nginx' },
            body: '<html><body>Normal content</body></html>',
            status: 200,
        });
        expect(score).toBe(0);
    });

    it('truncates large body to 50KB for detection', () => {
        const largeBody = 'x'.repeat(100000) + 'challenge-platform';
        const score = scoreProfile(WAF_PROFILES[0], {
            cookies: [],
            headers: {},
            body: largeBody,
            status: 200,
        });
        expect(score).toBe(0);
    });

    it('getProfileById returns null for unknown profile', () => {
        expect(getProfileById('nonexistent')).toBeNull();
    });
});

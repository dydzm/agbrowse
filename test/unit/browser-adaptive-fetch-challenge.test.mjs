import { describe, expect, it } from 'vitest';
import { detectWafChallenge, classifyChallengeType, detectLoginWall, detectPaywall } from '../../skills/browser/adaptive-fetch/challenge-detector.mjs';

describe('adaptive fetch challenge detection', () => {
    it('detects Cloudflare challenge from headers and body', () => {
        const result = detectWafChallenge({
            status: 403,
            headers: { server: 'cloudflare', 'cf-ray': '123-LAX' },
            body: '<html>Checking your browser before accessing the site</html>',
        });
        expect(result.detected).toBe(true);
        expect(result.primary.profile.id).toBe('cloudflare_managed_challenge');
    });

    it('detects Turnstile from script tag', () => {
        const result = detectWafChallenge({
            status: 200,
            headers: {},
            body: '<div class="cf-turnstile" data-sitekey="0x4AAA"></div>',
        });
        expect(result.detected).toBe(true);
        expect(result.primary.profile.id).toBe('cloudflare_turnstile');
    });

    it('returns no detection for clean pages', () => {
        const result = detectWafChallenge({
            status: 200,
            headers: { server: 'nginx' },
            body: '<html><body>Normal page content with lots of text</body></html>',
        });
        expect(result.detected).toBe(false);
        expect(result.primary).toBeNull();
    });

    it('classifyChallengeType identifies WAF challenge', () => {
        const result = classifyChallengeType({
            status: 403,
            headers: { server: 'cloudflare', 'cf-ray': '123-LAX' },
            body: 'Checking your browser',
        });
        expect(result.type).toBe('challenge');
    });

    it('classifyChallengeType identifies login wall', () => {
        const result = classifyChallengeType({
            status: 200,
            headers: {},
            body: 'Please sign in to continue. Create an account to access this content.',
        });
        expect(result.type).toBe('auth_required');
    });

    it('classifyChallengeType identifies paywall', () => {
        const result = classifyChallengeType({
            status: 200,
            headers: {},
            body: 'Subscribe to read the full article. Members only content.',
        });
        expect(result.type).toBe('paywall');
    });

    it('classifyChallengeType returns null for clean content', () => {
        const result = classifyChallengeType({
            status: 200,
            headers: {},
            body: 'This is a normal article about technology with lots of detail.',
        });
        expect(result.type).toBeNull();
    });

    it('detectLoginWall finds auth markers', () => {
        expect(detectLoginWall('Please log in to continue').detected).toBe(true);
        expect(detectLoginWall('Normal text content').detected).toBe(false);
    });

    it('detectPaywall finds paywall markers', () => {
        expect(detectPaywall('Subscribe to read more').detected).toBe(true);
        expect(detectPaywall('Free article content').detected).toBe(false);
    });
});

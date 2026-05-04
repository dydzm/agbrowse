import { describe, expect, it } from 'vitest';
import { assertScrubbedSafe, scrubProviderDom } from '../../web-ai/eval/scrub-dom.mjs';

describe('web-ai DOM scrubber', () => {
    it('redacts common sensitive patterns', () => {
        const scrubbed = scrubProviderDom('Contact alice@example.com with key sk_1234567890abcdef and SECRET_TOKEN', {
            forbiddenText: ['SECRET_TOKEN'],
        });
        expect(scrubbed).toContain('[redacted-email]');
        expect(scrubbed).toContain('[redacted-key]');
        expect(scrubbed).toContain('[redacted-forbidden-text]');
    });

    it('fails if fixture still contains unsafe content', () => {
        expect(() => assertScrubbedSafe('alice@example.com')).toThrow(/unsafe/);
        expect(() => assertScrubbedSafe('safe fixture text')).not.toThrow();
    });
});

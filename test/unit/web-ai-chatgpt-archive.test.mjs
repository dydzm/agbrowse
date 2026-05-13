import { describe, expect, it } from 'vitest';
import { isTemporaryChatgptUrl, resolveArchivePolicy } from '../../web-ai/chatgpt-archive.mjs';

function completeSession(overrides = {}) {
    return {
        conversationUrl: 'https://chatgpt.com/c/abc123',
        originalUrl: 'https://chatgpt.com/',
        followUpCount: 0,
        researchMode: 'standard',
        projectUrl: '',
        status: 'complete',
        ...overrides,
    };
}

describe('ChatGPT archive policy', () => {
    it('skips Temporary Chat conversations by conversation URL', () => {
        expect(resolveArchivePolicy({
            session: completeSession({
                conversationUrl: 'https://chatgpt.com/c/abc123?temporary-chat=true',
            }),
        })).toEqual({ shouldArchive: false, reason: 'temporary-chat' });
    });

    it('skips Temporary Chat conversations by original URL after navigation strips query state', () => {
        expect(resolveArchivePolicy({
            session: completeSession({
                originalUrl: 'https://chatgpt.com/?temporary-chat=true',
            }),
        })).toEqual({ shouldArchive: false, reason: 'temporary-chat' });
    });

    it('does not let forced archive override Temporary Chat', () => {
        expect(resolveArchivePolicy({
            archiveFlag: 'always',
            session: completeSession({
                originalUrl: 'https://chatgpt.com/?temporary-chat=true',
            }),
        })).toEqual({ shouldArchive: false, reason: 'temporary-chat' });
    });

    it('does not treat malformed URLs as Temporary Chat', () => {
        expect(isTemporaryChatgptUrl('not a url')).toBe(false);
        expect(resolveArchivePolicy({
            session: completeSession({
                originalUrl: 'not a url',
            }),
        })).toEqual({ shouldArchive: true, reason: 'auto-archive-one-shot' });
    });

    it('keeps normal one-shot conversations archivable', () => {
        expect(resolveArchivePolicy({
            session: completeSession(),
        })).toEqual({ shouldArchive: true, reason: 'auto-archive-one-shot' });
    });
});

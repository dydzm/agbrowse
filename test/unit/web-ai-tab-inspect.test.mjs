import { describe, expect, it } from 'vitest';
import { classifyTabState } from '../../web-ai/tab-inspect.mjs';

describe('web-ai tab-inspect', () => {
    describe('classifyTabState', () => {
        it('returns detached when not authenticated', () => {
            expect(classifyTabState({
                authenticated: false,
                stopExists: false,
                sendExists: false,
                promptReady: false,
                assistantCount: 0,
            })).toBe('detached');
        });

        it('returns running when stop button exists', () => {
            expect(classifyTabState({
                authenticated: true,
                stopExists: true,
                sendExists: true,
                promptReady: true,
                assistantCount: 1,
            })).toBe('running');
        });

        it('returns completed when send is ready', () => {
            expect(classifyTabState({
                authenticated: true,
                stopExists: false,
                sendExists: true,
                promptReady: true,
                assistantCount: 2,
            })).toBe('completed');
        });

        it('returns detached when authenticated but nothing visible', () => {
            expect(classifyTabState({
                authenticated: true,
                stopExists: false,
                sendExists: false,
                promptReady: false,
                assistantCount: 0,
            })).toBe('detached');
        });
    });

    describe('TabSummary modelSelection contract', () => {
        it('INSPECT_EXPRESSION contains readChatGptTabModelSelection', async () => {
            const { readFileSync } = await import('node:fs');
            const src = readFileSync(
                new URL('../../web-ai/tab-inspect.mjs', import.meta.url),
                'utf8',
            );
            expect(src).toContain('readChatGptTabModelSelection');
            expect(src).toContain('modelSelection');
            expect(src).not.toContain('button[aria-haspopup="menu"] > div > span');
        });

        it('INSPECT_EXPRESSION reads surface radios for Chat/Work discrimination', async () => {
            const { readFileSync } = await import('node:fs');
            const src = readFileSync(
                new URL('../../web-ai/tab-inspect.mjs', import.meta.url),
                'utf8',
            );
            expect(src).toContain('[role="radio"]');
            expect(src).toContain('/^(Chat|Work)$/');
            expect(src).toContain("surface === 'chat'");
            expect(src).toContain('familyLabel && tierLabel');
        });

        it('INSPECT_EXPRESSION checks aria-checked/data-state consistency for surface radios', async () => {
            const { readFileSync } = await import('node:fs');
            const src = readFileSync(
                new URL('../../web-ai/tab-inspect.mjs', import.meta.url),
                'utf8',
            );
            expect(src).toContain('aria-checked');
            expect(src).toContain('data-state');
            expect(src).toContain("'ambiguous'");
        });

        it('INSPECT_EXPRESSION scopes family to known labels and does not synthesize', async () => {
            const { readFileSync } = await import('node:fs');
            const src = readFileSync(
                new URL('../../web-ai/tab-inspect.mjs', import.meta.url),
                'utf8',
            );
            expect(src).toContain('GPT-5\\.(?:6 Sol|5|4|3)|o3');
            expect(src).not.toMatch(/Instant.*GPT-5\.5.*family/);
        });

        it('INSPECT_EXPRESSION uses composer-scoped picker trigger with exact tier labels', async () => {
            const { readFileSync } = await import('node:fs');
            const src = readFileSync(
                new URL('../../web-ai/tab-inspect.mjs', import.meta.url),
                'utf8',
            );
            expect(src).toContain("composer?.closest('form')");
            expect(src).toContain('/^(Instant|Medium|High|Extra High|Pro)$/i');
        });

        it('INSPECT_EXPRESSION uses legacy model-switcher span as tier fallback only', async () => {
            const { readFileSync } = await import('node:fs');
            const src = readFileSync(
                new URL('../../web-ai/tab-inspect.mjs', import.meta.url),
                'utf8',
            );
            expect(src).toContain('[data-testid="model-switcher"] span');
            const legacyIdx = src.indexOf('legacyModelEl');
            const composerIdx = src.indexOf('pickerTrigger');
            expect(composerIdx).toBeLessThan(legacyIdx);
        });

        it('TabSummary typedef includes modelSelection property', async () => {
            const { readFileSync } = await import('node:fs');
            const src = readFileSync(
                new URL('../../web-ai/tab-inspect.mjs', import.meta.url),
                'utf8',
            );
            expect(src).toMatch(/@property.*modelSelection/);
            expect(src).toContain("'chat'|'work'|'ambiguous'|null");
        });

        it('inspectTab return includes modelSelection field', async () => {
            const { readFileSync } = await import('node:fs');
            const src = readFileSync(
                new URL('../../web-ai/tab-inspect.mjs', import.meta.url),
                'utf8',
            );
            expect(src).toContain('modelSelection: data.modelSelection || null');
        });

        it('collectTabs in-use stub includes modelSelection: null', async () => {
            const { readFileSync } = await import('node:fs');
            const src = readFileSync(
                new URL('../../web-ai/tab-inspect.mjs', import.meta.url),
                'utf8',
            );
            const collectSection = src.slice(src.indexOf('collectTabs'));
            expect(collectSection).toContain('modelSelection: null');
        });
    });
});

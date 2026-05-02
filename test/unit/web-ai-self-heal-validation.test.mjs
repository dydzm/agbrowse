import { describe, expect, it, vi } from 'vitest';
import { validateResolvedTarget } from '../../web-ai/self-heal.mjs';

describe('web-ai self-heal validation scoring', () => {
    function mockPage(overrides = {}) {
        const locators = new Map();
        return {
            url: vi.fn(() => 'https://chatgpt.com/'),
            locator: vi.fn((sel) => {
                if (!locators.has(sel)) {
                    locators.set(sel, {
                        count: vi.fn(() => Promise.resolve(overrides.count ?? 1)),
                        first: vi.fn(() => ({
                            isVisible: vi.fn(() => Promise.resolve(overrides.visible ?? true)),
                            isEnabled: vi.fn(() => Promise.resolve(overrides.enabled ?? true)),
                            isEditable: vi.fn(() => Promise.resolve(overrides.editable ?? true)),
                            evaluate: vi.fn(() => Promise.resolve(overrides.evalResult ?? { role: 'button', label: 'Send' })),
                        })),
                    });
                }
                return locators.get(sel);
            }),
        };
    }

    it('returns confidence 1.0 for perfect match', async () => {
        const page = mockPage({ evalResult: { role: 'button', label: 'Send Message', tagName: 'button', isEditable: false } });
        const result = await validateResolvedTarget(page, { selector: '#btn', role: 'button', name: 'Send Message' }, { actionKind: 'click' });
        expect(result.ok).toBe(true);
        expect(result.confidence).toBe(1);
    });

    it('returns low-confidence for role mismatch', async () => {
        const page = mockPage({ evalResult: { role: 'link', label: 'Cancel', tagName: 'a', isEditable: false } });
        const result = await validateResolvedTarget(page, { selector: '#btn', role: 'button', name: 'Send' }, { actionKind: 'click', semanticTarget: { roles: ['button'] } });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('low-confidence');
    });

    it('rejects ambiguous selector', async () => {
        const page = mockPage({ count: 2 });
        const result = await validateResolvedTarget(page, { selector: 'button' }, { actionKind: 'click' });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('ambiguous-selector');
        expect(result.count).toBe(2);
    });
});

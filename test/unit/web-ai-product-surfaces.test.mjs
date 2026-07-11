import { describe, expect, it } from 'vitest';
import {
    detectChatGptProductSurfaces,
    detectGeminiProductSurfaces,
    detectChatGptComposerSurface,
    readChatGptSurfaceRadio,
    detectChatGptWorkAvailability,
    workSurfaceUnsupportedError,
} from '../../web-ai/product-surfaces.mjs';

function fakePage(visibleTexts = [], visibleSelectors = []) {
    return {
        getByText: (text) => ({ first: () => ({ isVisible: async () => visibleTexts.includes(text) }) }),
        locator: (sel) => ({ first: () => ({ isVisible: async () => visibleSelectors.includes(sel) }) }),
    };
}

/**
 * Build a page mock with Chat/Work radio buttons for the detector.
 */
function fakeRadioPage(radios = []) {
    return {
        getByText: () => ({ first: () => ({ isVisible: async () => false }) }),
        locator: (sel) => {
            if (sel === 'button[role="radio"]') {
                return {
                    count: async () => radios.length,
                    nth: (i) => {
                        const r = radios[i] || {};
                        return {
                            isVisible: async () => r.visible !== false,
                            textContent: async () => r.text || '',
                            getAttribute: async (attr) => {
                                if (attr === 'aria-checked') return r.ariaChecked || null;
                                if (attr === 'data-state') return r.dataState || null;
                                return null;
                            },
                        };
                    },
                };
            }
            return { first: () => ({ isVisible: async () => false }), count: async () => 0 };
        },
    };
}

// Parity catalog 201 #5 (P2): read-only product-surface detector.
describe('web-ai product surfaces', () => {
    it('detects an available ChatGPT surface by visible text, never mutates', async () => {
        const surfaces = await detectChatGptProductSurfaces(fakePage(['Projects']));
        const projects = surfaces.find((s) => s.id === 'chatgpt-projects');
        expect(projects.available).toBe(true);
        expect(projects.evidence).toContain('Projects');
        expect(surfaces.every((s) => s.mutationAllowed === false)).toBe(true);
        // a surface with no matching text is unavailable
        expect(surfaces.find((s) => s.id === 'chatgpt-apps').available).toBe(false);
    });

    it('detects canvas via selector evidence', async () => {
        const surfaces = await detectChatGptProductSurfaces(fakePage([], ['[data-testid="canvas-panel"]']));
        const canvas = surfaces.find((s) => s.id === 'canvas');
        expect(canvas.available).toBe(true);
        expect(canvas.evidence).toContain('[data-testid="canvas-panel"]');
    });

    it('returns all-unavailable surfaces for an empty page', async () => {
        const surfaces = await detectChatGptProductSurfaces(fakePage());
        expect(surfaces.length).toBe(5);
        expect(surfaces.every((s) => s.available === false && s.evidence.length === 0)).toBe(true);
    });

    it('detects Gemini deep-research surface', async () => {
        const surfaces = await detectGeminiProductSurfaces(fakePage(['Deep Research']));
        const dr = surfaces.find((s) => s.id === 'gemini-deep-research');
        expect(dr.available).toBe(true);
        expect(dr.mutationAllowed).toBe(false);
    });
});

// 04 section 2.1: Chat/Work surface radio detector
describe('detectChatGptComposerSurface', () => {
    it('returns legacy when no radio buttons exist', async () => {
        const page = fakeRadioPage([]);
        const result = await detectChatGptComposerSurface(page);
        expect(result.ui).toBe('legacy');
        expect(result.surface).toBeNull();
        expect(result.evidence.chat).toBeNull();
        expect(result.evidence.work).toBeNull();
    });

    it('detects active Chat surface', async () => {
        const page = fakeRadioPage([
            { text: 'Chat', ariaChecked: 'true', dataState: 'on', visible: true },
            { text: 'Work', ariaChecked: 'false', dataState: 'off', visible: true },
        ]);
        const result = await detectChatGptComposerSurface(page);
        expect(result.ui).toBe('toggle');
        expect(result.surface).toBe('chat');
        expect(result.evidence.chat.checked).toBe(true);
        expect(result.evidence.work.checked).toBe(false);
    });

    it('detects active Work surface', async () => {
        const page = fakeRadioPage([
            { text: 'Chat', ariaChecked: 'false', dataState: 'off', visible: true },
            { text: 'Work', ariaChecked: 'true', dataState: 'on', visible: true },
        ]);
        const result = await detectChatGptComposerSurface(page);
        expect(result.ui).toBe('toggle');
        expect(result.surface).toBe('work');
    });

    it('returns ambiguous when both are active', async () => {
        const page = fakeRadioPage([
            { text: 'Chat', ariaChecked: 'true', dataState: 'on', visible: true },
            { text: 'Work', ariaChecked: 'true', dataState: 'on', visible: true },
        ]);
        const result = await detectChatGptComposerSurface(page);
        expect(result.surface).toBe('ambiguous');
    });

    it('returns ambiguous when both are inactive', async () => {
        const page = fakeRadioPage([
            { text: 'Chat', ariaChecked: 'false', dataState: 'off', visible: true },
            { text: 'Work', ariaChecked: 'false', dataState: 'off', visible: true },
        ]);
        const result = await detectChatGptComposerSurface(page);
        expect(result.surface).toBe('ambiguous');
    });

    it('returns ambiguous when aria-checked and data-state disagree', async () => {
        const page = fakeRadioPage([
            { text: 'Chat', ariaChecked: 'true', dataState: 'off', visible: true },
            { text: 'Work', ariaChecked: 'false', dataState: 'on', visible: true },
        ]);
        const result = await detectChatGptComposerSurface(page);
        expect(result.surface).toBe('ambiguous');
    });

    it('returns ambiguous when one radio is not visible', async () => {
        const page = fakeRadioPage([
            { text: 'Chat', ariaChecked: 'true', dataState: 'on', visible: true },
            { text: 'Work', ariaChecked: 'false', dataState: 'off', visible: false },
        ]);
        const result = await detectChatGptComposerSurface(page);
        expect(result.surface).toBe('ambiguous');
    });

    it('returns legacy when radios exist but neither matches Chat/Work text', async () => {
        const page = fakeRadioPage([
            { text: 'Foo', ariaChecked: 'true', dataState: 'on', visible: true },
            { text: 'Bar', ariaChecked: 'false', dataState: 'off', visible: true },
        ]);
        const result = await detectChatGptComposerSurface(page);
        expect(result.ui).toBe('legacy');
        expect(result.surface).toBeNull();
    });
});

describe('readChatGptSurfaceRadio', () => {
    it('returns evidence for active Work', async () => {
        const page = fakeRadioPage([
            { text: 'Chat', ariaChecked: 'false', dataState: 'off', visible: true },
            { text: 'Work', ariaChecked: 'true', dataState: 'on', visible: true },
        ]);
        const evidence = await readChatGptSurfaceRadio(page);
        expect(evidence.chat.checked).toBe(false);
        expect(evidence.work.checked).toBe(true);
    });
});

describe('detectChatGptWorkAvailability', () => {
    it('reports available and active when Work radio is visible and checked', async () => {
        const page = fakeRadioPage([
            { text: 'Chat', ariaChecked: 'false', dataState: 'off', visible: true },
            { text: 'Work', ariaChecked: 'true', dataState: 'on', visible: true },
        ]);
        const { available, active } = await detectChatGptWorkAvailability(page);
        expect(available).toBe(true);
        expect(active).toBe(true);
    });

    it('reports available but not active when Work visible but Chat active', async () => {
        const page = fakeRadioPage([
            { text: 'Chat', ariaChecked: 'true', dataState: 'on', visible: true },
            { text: 'Work', ariaChecked: 'false', dataState: 'off', visible: true },
        ]);
        const { available, active } = await detectChatGptWorkAvailability(page);
        expect(available).toBe(true);
        expect(active).toBe(false);
    });

    it('reports unavailable when no radios', async () => {
        const page = fakeRadioPage([]);
        const { available, active } = await detectChatGptWorkAvailability(page);
        expect(available).toBe(false);
        expect(active).toBe(false);
    });
});

describe('workSurfaceUnsupportedError', () => {
    it('creates a WebAiError with correct error code and stage', () => {
        const err = workSurfaceUnsupportedError({ surface: 'work' });
        expect(err.errorCode).toBe('capability.unsupported');
        expect(err.stage).toBe('provider-surface-preflight');
        expect(err.retryHint).toBe('switch-to-chat');
        expect(err.vendor).toBe('chatgpt');
        expect(err.message).toContain('Work surface');
    });
});

// @ts-check

import { WebAiError } from './errors.mjs';

// Parity catalog 201 #5 (P2): read-only product-surface detector. Non-mutating awareness
// of which product flows exist (ChatGPT Projects/Library/Apps/Deep-Research/Canvas,
// Gemini Deep-Research/Canvas). Distinct from agbrowse chatgpt-project-sources.mjs, which
// is an upload/mutation flow. Reverse port of cli-jaw web-ai/product-surfaces.ts.
// Detectors intentionally never mutate browser state (mutationAllowed: false).

/**
 * @typedef {'chatgpt-projects'|'chatgpt-library'|'chatgpt-apps'|'chatgpt-deep-research'|'gemini-deep-research'|'canvas'} ProductSurfaceId
 * @typedef {{ id: ProductSurfaceId, available: boolean, evidence: string[], mutationAllowed: false }} ProductSurfaceStatus
 */

/**
 * @param {any} page
 * @returns {Promise<ProductSurfaceStatus[]>}
 */
export async function detectChatGptProductSurfaces(page) {
    return [
        await detectByText(page, 'chatgpt-projects', ['Projects', 'New project']),
        await detectByText(page, 'chatgpt-library', ['Library', 'Add from library']),
        await detectByText(page, 'chatgpt-apps', ['Apps', 'Connected apps']),
        await detectByText(page, 'chatgpt-deep-research', ['Deep research', '/Deepresearch']),
        await detectBySelector(page, 'canvas', [
            '[data-testid="canvas-panel"]',
            'aside[data-testid*="canvas" i]',
            'section[aria-label*="Canvas" i]',
        ]),
    ];
}

/**
 * @param {any} page
 * @returns {Promise<ProductSurfaceStatus[]>}
 */
export async function detectGeminiProductSurfaces(page) {
    return [
        await detectByText(page, 'gemini-deep-research', ['Deep Research', 'Start research']),
        await detectBySelector(page, 'canvas', [
            'canvas-panel',
            '[aria-label*="Canvas" i]',
            'div[class*="canvas" i]',
        ]),
    ];
}

/**
 * @param {any} page
 * @param {ProductSurfaceId} id
 * @param {string[]} texts
 * @returns {Promise<ProductSurfaceStatus>}
 */
async function detectByText(page, id, texts) {
    const evidence = [];
    for (const text of texts) {
        const locator = page.getByText?.(text, { exact: false });
        const found = locator ? await locator.first().isVisible().catch(() => false) : false;
        if (found) evidence.push(text);
    }
    return { id, available: evidence.length > 0, evidence, mutationAllowed: false };
}

/**
 * @param {any} page
 * @param {ProductSurfaceId} id
 * @param {string[]} selectors
 * @returns {Promise<ProductSurfaceStatus>}
 */
async function detectBySelector(page, id, selectors) {
    const evidence = [];
    for (const selector of selectors) {
        const found = await page.locator(selector).first().isVisible().catch(() => false);
        if (found) evidence.push(selector);
    }
    return { id, available: evidence.length > 0, evidence, mutationAllowed: false };
}

// --- Chat / Work surface radio detector (04 section 2.1) ---
// Pure read-only detector. No click/press/hover/focus/fill/evaluate mutations.
// Consumes CHATGPT_SURFACE_RADIO_SELECTOR from chatgpt-model.mjs.

/**
 * @typedef {'chat'|'work'} ComposerSurface
 * @typedef {'toggle'|'legacy'} ComposerUiKind
 * @typedef {{
 *   ui: ComposerUiKind,
 *   surface: ComposerSurface | 'ambiguous' | null,
 *   evidence: { chat: { visible: boolean, checked: boolean|null, dataState: string|null } | null, work: { visible: boolean, checked: boolean|null, dataState: string|null } | null },
 * }} ComposerSurfaceDetection
 */

/**
 * Read the exact role=radio Chat/Work header buttons and return a fail-closed
 * detection result.
 *
 * Contract (04 section 2.1):
 *  1. Both radios absent -> {ui:'legacy', surface:null}.
 *  2. Both visible, exactly one active with consistent aria-checked + data-state -> surface.
 *  3. Attribute mismatch / one-sided / both-active / both-inactive -> 'ambiguous'.
 *  4. No mutations.
 *
 * @param {any} page  Playwright-like page handle.
 * @returns {Promise<ComposerSurfaceDetection>}
 */
export async function detectChatGptComposerSurface(page) {
    const { CHATGPT_SURFACE_RADIO_SELECTOR } = await import('./chatgpt-model.mjs');
    const radios = page.locator(CHATGPT_SURFACE_RADIO_SELECTOR);
    const count = await radios.count().catch(() => 0);

    if (count === 0) {
        return { ui: 'legacy', surface: null, evidence: { chat: null, work: null } };
    }

    /** @type {{ text: string, checked: boolean|null, dataState: string|null, visible: boolean }[]} */
    const entries = [];
    for (let i = 0; i < count; i++) {
        const el = radios.nth(i);
        const visible = await el.isVisible().catch(() => false);
        const text = (await el.textContent().catch(() => '') || '').trim();
        const checked = await el.getAttribute('aria-checked').catch(() => null);
        const dataState = await el.getAttribute('data-state').catch(() => null);
        entries.push({
            text,
            checked: checked === 'true' ? true : checked === 'false' ? false : null,
            dataState,
            visible,
        });
    }

    const chat = entries.find((e) => /^chat$/i.test(e.text)) || null;
    const work = entries.find((e) => /^work$/i.test(e.text)) || null;

    if (!chat && !work) {
        return { ui: 'legacy', surface: null, evidence: { chat: null, work: null } };
    }

    const chatEvid = chat ? { visible: chat.visible, checked: chat.checked, dataState: chat.dataState } : null;
    const workEvid = work ? { visible: work.visible, checked: work.checked, dataState: work.dataState } : null;

    if (!chat || !work || !chat.visible || !work.visible) {
        return { ui: 'toggle', surface: 'ambiguous', evidence: { chat: chatEvid, work: workEvid } };
    }

    const chatActive = chat.checked === true && chat.dataState === 'on';
    const chatInactive = chat.checked === false && chat.dataState === 'off';
    const workActive = work.checked === true && work.dataState === 'on';
    const workInactive = work.checked === false && work.dataState === 'off';

    if (chatActive && workInactive) {
        return { ui: 'toggle', surface: 'chat', evidence: { chat: chatEvid, work: workEvid } };
    }
    if (workActive && chatInactive) {
        return { ui: 'toggle', surface: 'work', evidence: { chat: chatEvid, work: workEvid } };
    }

    return { ui: 'toggle', surface: 'ambiguous', evidence: { chat: chatEvid, work: workEvid } };
}

/**
 * Read the raw radio state for both Chat and Work buttons.
 * @param {any} page
 * @returns {Promise<ComposerSurfaceDetection['evidence']>}
 */
export async function readChatGptSurfaceRadio(page) {
    const detection = await detectChatGptComposerSurface(page);
    return detection.evidence;
}

/**
 * Check whether the Work surface radio is visible (available to click).
 * `available` is independent of whether Work is currently active.
 * No mutations.
 * @param {any} page
 * @returns {Promise<{ available: boolean, active: boolean, evidence: ComposerSurfaceDetection }>}
 */
export async function detectChatGptWorkAvailability(page) {
    const detection = await detectChatGptComposerSurface(page);
    const available = detection.evidence.work?.visible === true;
    const active = detection.surface === 'work';
    return { available, active, evidence: detection };
}

// Canonical definition lives in chatgpt-model.mjs (04 ownership table);
// re-exported here to preserve existing import paths.
export { workSurfaceUnsupportedError } from './chatgpt-model.mjs';

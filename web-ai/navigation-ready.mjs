// @ts-check
const CONVERSATION_URL_PATTERN = /\/c\/[a-f0-9-]+/;
const ASSISTANT_SELECTOR = '[data-message-author-role="assistant"]';

const PROVIDER_HOSTS = new Set([
    'chatgpt.com', 'chat.openai.com',
    'gemini.google.com',
    'grok.com',
]);

/**
 * @param {any} page
 * @param {string|null|undefined} url
 */
export async function waitForConversationReady(page, url) {
    const finalUrl = page.url();
    const checkUrl = finalUrl || url;
    if (CONVERSATION_URL_PATTERN.test(checkUrl || '')) {
        await page.locator(ASSISTANT_SELECTOR).first()
            .waitFor({ state: 'attached', timeout: 10_000 })
            .catch(() => undefined);
    }
    let previous = -1;
    let stableReads = 0;
    const deadline = Date.now() + 8_000;
    while (Date.now() < deadline) {
        const count = await page.locator(ASSISTANT_SELECTOR).count().catch(() => 0);
        if (count === previous) stableReads++;
        else stableReads = 0;
        previous = count;
        if (stableReads >= 2) return;
        await page.waitForTimeout(500).catch(() => undefined);
    }
}

/**
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function isProviderUrl(url) {
    if (!url) return false;
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        return PROVIDER_HOSTS.has(host);
    } catch { return false; }
}

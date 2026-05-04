export const EVAL_TARGET_INTENTS = [
    'composer.fill',
    'upload.open',
    'send.click',
    'copy.click',
];

export function probeEvalTargetIntentFromHtml(html, { provider = 'chatgpt', intent, variant = 'baseline' } = {}) {
    if (!EVAL_TARGET_INTENTS.includes(intent)) {
        return {
            status: 'unsupported',
            refId: null,
            selector: null,
            confidence: 0,
            evidence: { provider, intent, variant },
            error: `unsupported eval intent: ${intent}`,
        };
    }
    const selector = `[data-eval-intent="${intent}"]`;
    const marker = `data-eval-intent="${escapeRegExp(intent)}"`;
    const matches = [...String(html).matchAll(new RegExp(marker, 'g'))];
    if (matches.length === 1) {
        const tagMatch = String(html).match(new RegExp(`<[^>]*data-eval-intent="${escapeRegExp(intent)}"[^>]*>`, 'i'));
        const refIdMatch = tagMatch?.[0]?.match(/\bdata-eval-ref="([^"]+)"/i);
        return {
            status: 'resolved',
            refId: refIdMatch?.[1] || null,
            selector,
            confidence: 1,
            evidence: { provider, intent, variant, matches: matches.length },
            error: null,
        };
    }
    if (matches.length > 1) {
        return {
            status: 'ambiguous',
            refId: null,
            selector,
            confidence: 0.2,
            evidence: { provider, intent, variant, matches: matches.length },
            error: `ambiguous eval target: ${intent}`,
        };
    }
    return {
        status: 'missing',
        refId: null,
        selector,
        confidence: 0,
        evidence: { provider, intent, variant, matches: 0 },
        error: `missing eval target: ${intent}`,
    };
}

export async function probeEvalTargetIntent(pageOrHtml, options = {}) {
    if (typeof pageOrHtml === 'string') return probeEvalTargetIntentFromHtml(pageOrHtml, options);
    const html = typeof pageOrHtml?.content === 'function'
        ? await pageOrHtml.content()
        : String(pageOrHtml || '');
    return probeEvalTargetIntentFromHtml(html, options);
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

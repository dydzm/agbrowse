// @ts-check
/**
 * G02 — observe-actions: ranked candidate-action API derived from a web-AI
 * accessibility snapshot. Pure function: takes the snapshot output of
 * `buildWebAiSnapshot()` plus an optional natural-language instruction, returns
 * a confidence-ranked list of structured action candidates that a planner can
 * validate before executing.
 *
 * Forbidden scope (per gate:no-cloud-claims): no hosted/cloud, no stealth,
 * no CAPTCHA bypass, no external CDP. Pure local heuristic over locally-built
 * snapshot data.
 */

/**
 * @typedef {Object} InteractiveRef
 * @property {string} role
 * @property {string} [name]
 * @property {number} [occurrenceIndex]
 * @property {boolean} [disabled]
 * @property {boolean} [readonly]
 * @property {boolean} [required]
 * @property {boolean} [checked]
 * @property {boolean} [selected]
 */

/**
 * @typedef {Object} WebAiSnapshotLike
 * @property {string} [snapshotId]
 * @property {string|null} [url]
 * @property {Record<string, InteractiveRef>} refs
 */

/**
 * @typedef {Object} ActionCandidate
 * @property {string} ref           Snapshot ref (e.g., "@e3")
 * @property {string} role          Accessibility role
 * @property {string} name          Accessible name (truncated upstream)
 * @property {'click'|'type'|'select'|'submit'|'check'|'read'} action
 * @property {string} method        Underlying primitive (e.g., 'browser_click_ref')
 * @property {Record<string, string>} args  Suggested args for that primitive
 * @property {number} confidence    0..1
 * @property {string[]} signals     Why this candidate ranked here
 * @property {string[]} riskFlags   ['destructive'|'crossOrigin'|'requiresAuth'|'fileUpload']
 * @property {number} [occurrenceIndex]
 */

const CLICKABLE_ROLES = new Set(['button', 'link', 'menuitem', 'tab', 'option', 'switch']);
const TYPABLE_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton']);
const CHECKABLE_ROLES = new Set(['checkbox', 'radio']);
const SELECTABLE_ROLES = new Set(['listbox', 'combobox']);
const READABLE_ROLES = new Set(['heading', 'paragraph', 'text', 'cell', 'row']);

const DESTRUCTIVE_PATTERNS = [
    /\b(delete|remove|drop|destroy|erase|wipe)\b/i,
    /\b(sign\s*out|log\s*out|disconnect)\b/i,
    /\b(cancel\s+subscription|unsubscribe)\b/i,
];
const AUTH_PATTERNS = [/\bpassword\b/i, /\b2fa\b/i, /\botp\b/i, /\bverification\s+code\b/i];
const UPLOAD_PATTERNS = [/\b(upload|attach|choose\s*file|browse)\b/i];

/** @param {string} s */
function tokenize(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 2);
}

/**
 * @param {string} role
 * @param {string} name
 * @returns {ActionCandidate['action']}
 */
function defaultActionForRole(role, name) {
    if (CHECKABLE_ROLES.has(role)) return 'check';
    if (role === 'listbox' || role === 'combobox') return 'select';
    if (TYPABLE_ROLES.has(role)) return 'type';
    if (CLICKABLE_ROLES.has(role)) {
        if (/\bsubmit\b/i.test(name) || /^submit$/i.test(name)) return 'submit';
        return 'click';
    }
    if (READABLE_ROLES.has(role)) return 'read';
    return 'click';
}

/**
 * @param {string} role
 * @param {string} name
 * @returns {string[]}
 */
function riskFlagsFor(role, name) {
    /** @type {string[]} */
    const flags = [];
    if (DESTRUCTIVE_PATTERNS.some((p) => p.test(name))) flags.push('destructive');
    if (role === 'link') flags.push('crossOrigin');
    if (AUTH_PATTERNS.some((p) => p.test(name))) flags.push('requiresAuth');
    if (UPLOAD_PATTERNS.some((p) => p.test(name))) flags.push('fileUpload');
    return flags;
}

/**
 * @param {string} ref
 * @param {InteractiveRef} info
 * @param {Set<string>} instructionTokens
 * @returns {ActionCandidate|null}
 */
function buildCandidate(ref, info, instructionTokens) {
    const role = String(info.role || '');
    if (!role) return null;
    const name = String(info.name || '');
    const action = defaultActionForRole(role, name);
    const signals = [];
    let confidence = 0;

    if (CLICKABLE_ROLES.has(role)) {
        confidence += 0.35;
        signals.push(`role:${role}`);
    } else if (TYPABLE_ROLES.has(role)) {
        confidence += 0.3;
        signals.push(`role:${role}`);
    } else if (CHECKABLE_ROLES.has(role) || SELECTABLE_ROLES.has(role)) {
        confidence += 0.25;
        signals.push(`role:${role}`);
    } else if (READABLE_ROLES.has(role)) {
        confidence += 0.1;
        signals.push(`role:${role}(readable)`);
    } else {
        confidence += 0.15;
        signals.push(`role:${role}(generic)`);
    }

    if (name) {
        confidence += 0.15;
        signals.push('has-name');
    }

    const nameTokens = new Set(tokenize(name));
    if (instructionTokens.size > 0 && nameTokens.size > 0) {
        let overlap = 0;
        for (const t of instructionTokens) if (nameTokens.has(t)) overlap += 1;
        if (overlap > 0) {
            const ratio = overlap / instructionTokens.size;
            confidence += Math.min(0.45, ratio * 0.6);
            signals.push(`instruction-overlap:${overlap}/${instructionTokens.size}`);
        }
    }

    if (info.disabled) {
        confidence -= 0.4;
        signals.push('disabled');
    }
    if (info.readonly && action === 'type') {
        confidence -= 0.3;
        signals.push('readonly');
    }
    if (info.required) signals.push('required');

    confidence = Math.max(0, Math.min(1, Number(confidence.toFixed(3))));

    /** @type {Record<string, string>} */
    const args = { snapshotId: '__SNAPSHOT_ID__', ref };
    /** @type {string} */
    let method;
    switch (action) {
        case 'click':
        case 'submit':
            method = 'browser_click_ref';
            break;
        case 'type':
            method = 'agbrowse type'; // CLI today (browser_type_ref deferred per G04)
            break;
        case 'check':
            method = 'agbrowse check';
            break;
        case 'select':
            method = 'agbrowse select';
            break;
        case 'read':
        default:
            method = 'browser_snapshot (text from ref)';
            break;
    }

    return {
        ref,
        role,
        name,
        action,
        method,
        args,
        confidence,
        signals,
        riskFlags: riskFlagsFor(role, name),
        ...(typeof info.occurrenceIndex === 'number' ? { occurrenceIndex: info.occurrenceIndex } : {}),
    };
}

/**
 * @param {WebAiSnapshotLike} snapshot
 * @param {string} [instruction]
 * @param {{ topN?: number, includeDisabled?: boolean }} [options]
 * @returns {{ snapshotId: string|null, instruction: string, candidates: ActionCandidate[] }}
 */
export function buildObserveActions(snapshot, instruction = '', options = {}) {
    const topN = Number.isFinite(options.topN) && /** @type {number} */ (options.topN) > 0
        ? /** @type {number} */ (options.topN)
        : 8;
    const includeDisabled = options.includeDisabled === true;
    const instructionTokens = new Set(tokenize(instruction));
    const refs = snapshot && snapshot.refs ? snapshot.refs : {};
    /** @type {ActionCandidate[]} */
    const candidates = [];
    for (const [ref, info] of Object.entries(refs)) {
        const cand = buildCandidate(ref, info || /** @type {InteractiveRef} */ ({}), instructionTokens);
        if (!cand) continue;
        if (!includeDisabled && cand.signals.includes('disabled')) continue;
        candidates.push(cand);
    }
    candidates.sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return a.ref.localeCompare(b.ref, undefined, { numeric: true });
    });
    const top = candidates.slice(0, topN);
    const snapId = snapshot && snapshot.snapshotId ? snapshot.snapshotId : null;
    if (snapId) {
        for (const c of top) c.args.snapshotId = snapId;
    }
    return {
        snapshotId: snapId,
        instruction: String(instruction || ''),
        candidates: top,
    };
}

/**
 * @param {ReturnType<typeof buildObserveActions>} result
 * @returns {string}
 */
export function formatObserveActions(result) {
    if (!result.candidates.length) return 'observe-actions: no candidates from snapshot';
    const lines = [`observe-actions: ${result.candidates.length} candidate(s) for ${JSON.stringify(result.instruction)}`];
    for (const c of result.candidates) {
        const risk = c.riskFlags.length ? ` [${c.riskFlags.join(',')}]` : '';
        lines.push(`  ${c.ref}  conf=${c.confidence.toFixed(2)}  ${c.action}  role=${c.role}  name=${JSON.stringify(c.name)}${risk}`);
    }
    return lines.join('\n');
}

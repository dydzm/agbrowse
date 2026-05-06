// @ts-check
/**
 * G10 — claim-audit
 *
 * Scans repo marketing/claim surfaces for forbidden positioning terms outside
 * an explicitly experimental/deferred/out-of-scope section.
 *
 * agbrowse is a LOCAL Chrome/CDP runtime. It is not a hosted/cloud browser,
 * does not bypass CAPTCHA/Cloudflare, does not run stealth, and does not
 * expose a remote CDP server. Public claims must reflect that.
 *
 * Pure function; no IO side effects beyond fs.readFile of the listed targets.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Files to audit for cloud/stealth/external-CDP positioning.
 * Each entry: { file, sectionMode }
 *   sectionMode='ready'   → only flag matches inside non-experimental sections
 *   sectionMode='strict'  → flag every match anywhere in the file
 */
const TARGETS = [
    { file: 'README.md', sectionMode: 'ready' },
    { file: 'docs/comparison.md', sectionMode: 'ready' },
    { file: 'docs/production-readiness.md', sectionMode: 'ready' },
    { file: 'structure/phase_status.md', sectionMode: 'ready' },
    { file: 'skills/browser/SKILL.md', sectionMode: 'ready' },
    { file: 'skills/web-ai/SKILL.md', sectionMode: 'ready' },
];

/**
 * Forbidden positioning terms. Matched only outside an experimental /
 * deferred / out-of-scope / forbidden section.
 *
 * Each term is a plain regex run with the `i` flag.
 */
const FORBIDDEN = [
    { term: 'hosted browser', re: /hosted\s+browser/i, why: 'agbrowse runs local Chrome only' },
    { term: 'cloud browser', re: /cloud\s+browser/i, why: 'no managed/cloud browser runtime' },
    { term: 'cloud runtime', re: /cloud\s+runtime/i, why: 'no managed/cloud runtime' },
    { term: 'cloud agent', re: /cloud\s+agent/i, why: 'no hosted agent service' },
    { term: 'remote CDP', re: /remote[-\s]+cdp/i, why: 'remote CDP is deferred (docs/EXTERNAL_CDP.md)' },
    { term: 'external CDP', re: /external[-\s]+cdp/i, why: 'external CDP is deferred (docs/EXTERNAL_CDP.md)' },
    { term: 'stealth', re: /\bstealth\b/i, why: 'no stealth/anti-detection support' },
    { term: 'CAPTCHA bypass', re: /captcha\s+bypass/i, why: 'no CAPTCHA bypass' },
    { term: 'Cloudflare bypass', re: /cloudflare\s+bypass/i, why: 'no Cloudflare bypass' },
    { term: 'leaderboard', re: /leaderboard/i, why: 'no benchmark leaderboard claim' },
];

/**
 * Section header text that flips the file into "experimental/deferred"
 * mode where forbidden terms are *expected*.
 */
const EXPERIMENTAL_HEADERS = [
    /experimental/i,
    /deferred/i,
    /out\s+of\s+scope/i,
    /forbidden/i,
    /not\s+implemented/i,
    /known\s+gaps/i,
    /comparison\s+rules/i,
    /mirror\s+rules/i,
    /known\s+limitations/i,
    /comparison(\s+(boundary|vs|with|against|table))?/i,
    /^current\s+positioning/i,
    /^positioning/i,
    /support\s+labels?/i,
    /public\s+claim\s+gate/i,
    /^status$/i,
    /^phase\s+status/i,
    /claim[-\s]*audit/i,
    /boundary/i,
];

/**
 * Per-line negation markers. If a line contains both a forbidden term AND any
 * of these markers, treat the term as a boundary description (allowed).
 */
const NEGATION_MARKERS = [
    /\bno\b/i,
    /\bnot\b/i,
    /\bdeferred\b/i,
    /\bdeferral\b/i,
    /\bdo(?:es)?\s+not\b/i,
    /\bwon['’]t\b/i,
    /\bnever\b/i,
    /\bout\s+of\s+scope\b/i,
    /\bexperimental\b/i,
    /\bforbidden\b/i,
    /\bdeprecated\b/i,
    /\bn\/?a\b/i,
    /\bpending\b/i,
    /\bdeliberately\b/i,
    /\bdoes\s+not\s+offer\b/i,
];

/**
 * @param {string} text
 * @returns {Array<{ start: number, end: number, head: string, isExperimental: boolean }>}
 */
function partitionSections(text) {
    const lines = text.split('\n');
    /** @type {Array<{ start: number, end: number, head: string, isExperimental: boolean }>} */
    const sections = [];
    /** @type {{ start: number, head: string, isExperimental: boolean } | null} */
    let cur = { start: 0, head: '(prologue)', isExperimental: false };
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const m = /^#{1,6}\s+(.+?)\s*$/.exec(line);
        if (m) {
            if (cur) sections.push({ start: cur.start, end: i, head: cur.head, isExperimental: cur.isExperimental });
            const head = m[1];
            const isExp = EXPERIMENTAL_HEADERS.some((re) => re.test(head));
            cur = { start: i + 1, head, isExperimental: isExp };
        }
    }
    if (cur) sections.push({ start: cur.start, end: lines.length, head: cur.head, isExperimental: cur.isExperimental });
    return sections;
}

/**
 * @param {{ repoRoot: string }} opts
 * @returns {{ ok: boolean, scanned: string[], offending: Array<{ file: string, line: number, term: string, why: string, section: string }> }}
 */
export function auditClaims({ repoRoot }) {
    /** @type {Array<{ file: string, line: number, term: string, why: string, section: string }>} */
    const offending = [];
    const scanned = [];
    for (const target of TARGETS) {
        const abs = path.join(repoRoot, target.file);
        if (!fs.existsSync(abs)) continue;
        scanned.push(target.file);
        const text = fs.readFileSync(abs, 'utf8');
        const sections = partitionSections(text);
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            // skip inline-code-only lines (often examples)
            const trimmed = line.trim();
            if (trimmed.startsWith('```') || trimmed.startsWith('//')) continue;
            const sec = sections.find((s) => i >= s.start && i < s.end);
            const inExperimental = !!(sec && sec.isExperimental);
            if (target.sectionMode === 'ready' && inExperimental) continue;
            // Per-line negation: a line that says "no X", "X is deferred",
            // "X out of scope" is a boundary description, not a claim.
            const lineHasNegation = NEGATION_MARKERS.some((re) => re.test(line));
            // Look back up to 3 non-empty lines for a paragraph-level marker
            // like "Experimental or deferred surfaces:" introducing a bullet
            // list of forbidden terms.
            let paragraphHasNegation = false;
            for (let j = i - 1, scanned = 0; j >= 0 && scanned < 3; j -= 1) {
                const back = lines[j].trim();
                if (!back) continue;
                scanned += 1;
                if (NEGATION_MARKERS.some((re) => re.test(back))) {
                    paragraphHasNegation = true;
                    break;
                }
            }
            for (const f of FORBIDDEN) {
                if (f.re.test(line)) {
                    if (lineHasNegation || paragraphHasNegation) continue;
                    offending.push({
                        file: target.file,
                        line: i + 1,
                        term: f.term,
                        why: f.why,
                        section: sec ? sec.head : '(unknown)',
                    });
                }
            }
        }
    }
    return { ok: offending.length === 0, scanned, offending };
}

/**
 * @param {{ ok: boolean, scanned: string[], offending: Array<{ file: string, line: number, term: string, why: string, section: string }> }} report
 * @returns {string}
 */
export function formatClaimAuditReport(report) {
    const lines = [];
    lines.push(`claim-audit: scanned ${report.scanned.length} file(s)`);
    for (const f of report.scanned) lines.push(`  - ${f}`);
    if (report.ok) {
        lines.push('result: PASS — no forbidden cloud/stealth/external-CDP claims in non-experimental sections');
    } else {
        lines.push(`result: FAIL — ${report.offending.length} offending hit(s)`);
        for (const o of report.offending) {
            lines.push(`  ${o.file}:${o.line}  [${o.term}]  section="${o.section}"  reason=${o.why}`);
        }
    }
    return lines.join('\n');
}

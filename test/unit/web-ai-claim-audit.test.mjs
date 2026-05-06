// @ts-check
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { auditClaims, formatClaimAuditReport } from '../../web-ai/claim-audit.mjs';

/** @returns {string} */
function makeTmpRepo() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agbrowse-claim-audit-'));
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'structure'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'skills/browser'), { recursive: true });
    return dir;
}

describe('claim-audit', () => {
    /** @type {string} */
    let repo;
    beforeEach(() => { repo = makeTmpRepo(); });
    afterEach(() => { fs.rmSync(repo, { recursive: true, force: true }); });

    it('passes on a clean local-only README', () => {
        fs.writeFileSync(path.join(repo, 'README.md'), '# agbrowse\n\nLocal Chrome control.\n');
        const r = auditClaims({ repoRoot: repo });
        expect(r.ok).toBe(true);
        expect(r.offending).toHaveLength(0);
    });

    it('flags hosted/cloud claim in a ready section', () => {
        fs.writeFileSync(
            path.join(repo, 'README.md'),
            '# agbrowse\n\n## Ready\n\nWe ship a hosted browser runtime today.\n',
        );
        const r = auditClaims({ repoRoot: repo });
        expect(r.ok).toBe(false);
        expect(r.offending.some((o) => o.term === 'hosted browser')).toBe(true);
    });

    it('does not flag forbidden terms inside an Experimental section', () => {
        fs.writeFileSync(
            path.join(repo, 'README.md'),
            '# agbrowse\n\n## Experimental / Deferred\n\nremote CDP, hosted browser, stealth — all deferred.\n',
        );
        const r = auditClaims({ repoRoot: repo });
        expect(r.ok).toBe(true);
    });

    it('flags external-CDP / leaderboard / CAPTCHA bypass in ready sections', () => {
        fs.writeFileSync(
            path.join(repo, 'docs/comparison.md'),
            '# Compare\n\n## Production\n\nWe outperform on the leaderboard and provide CAPTCHA bypass.\n',
        );
        const r = auditClaims({ repoRoot: repo });
        expect(r.ok).toBe(false);
        const terms = r.offending.map((o) => o.term);
        expect(terms).toContain('leaderboard');
        expect(terms).toContain('CAPTCHA bypass');
    });

    it('formats a human-readable report', () => {
        fs.writeFileSync(path.join(repo, 'README.md'), '# x\n\n## Ready\n\nstealth mode active.\n');
        const r = auditClaims({ repoRoot: repo });
        const text = formatClaimAuditReport(r);
        expect(text).toContain('FAIL');
        expect(text).toContain('stealth');
    });
});

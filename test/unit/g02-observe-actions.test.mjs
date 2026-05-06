// @ts-check
import { describe, it, expect } from 'vitest';
import { buildObserveActions, formatObserveActions } from '../../web-ai/observe-actions.mjs';

const fixtureSnapshot = {
    snapshotId: 'snap-fixture-1',
    url: 'https://example.com/login',
    refs: {
        '@e1': { role: 'heading', name: 'Sign in to your account' },
        '@e2': { role: 'textbox', name: 'Email', required: true },
        '@e3': { role: 'textbox', name: 'Password', required: true },
        '@e4': { role: 'checkbox', name: 'Remember me' },
        '@e5': { role: 'button', name: 'Sign in' },
        '@e6': { role: 'link', name: 'Forgot password?' },
        '@e7': { role: 'button', name: 'Delete account', disabled: false },
        '@e8': { role: 'button', name: 'Disabled action', disabled: true },
        '@e9': { role: 'button', name: 'Upload file' },
        '@e10': { role: 'combobox', name: 'Country' },
    },
};

describe('G02 — observe-actions candidate-action API', () => {
    it('returns ranked candidates with snapshotId propagated to args', () => {
        const r = buildObserveActions(fixtureSnapshot, '');
        expect(r.snapshotId).toBe('snap-fixture-1');
        expect(r.candidates.length).toBeGreaterThan(0);
        for (const c of r.candidates) {
            expect(c.args.snapshotId).toBe('snap-fixture-1');
        }
        const confs = r.candidates.map((c) => c.confidence);
        const sorted = [...confs].sort((a, b) => b - a);
        expect(confs).toEqual(sorted);
    });

    it('boosts confidence for candidates whose name overlaps the instruction', () => {
        const r = buildObserveActions(fixtureSnapshot, 'click sign in');
        expect(r.candidates[0].ref).toBe('@e5');
        expect(r.candidates[0].action).toBe('click');
        expect(r.candidates[0].signals.some((s) => s.startsWith('instruction-overlap'))).toBe(true);
    });

    it('flags destructive, requiresAuth, fileUpload, and crossOrigin risks', () => {
        const r = buildObserveActions(fixtureSnapshot, '', { topN: 20, includeDisabled: true });
        const map = Object.fromEntries(r.candidates.map((c) => [c.ref, c]));
        expect(map['@e3'].riskFlags).toContain('requiresAuth');
        expect(map['@e7'].riskFlags).toContain('destructive');
        expect(map['@e9'].riskFlags).toContain('fileUpload');
        expect(map['@e6'].riskFlags).toContain('crossOrigin');
    });

    it('infers correct primitive method per role', () => {
        const r = buildObserveActions(fixtureSnapshot, '', { topN: 20 });
        const map = Object.fromEntries(r.candidates.map((c) => [c.ref, c]));
        expect(map['@e2'].action).toBe('type');
        expect(map['@e4'].action).toBe('check');
        expect(map['@e5'].action).toBe('click');
        expect(map['@e5'].method).toBe('browser_click_ref');
        expect(map['@e10'].action).toBe('select');
    });

    it('omits disabled candidates by default and includes them when requested', () => {
        const off = buildObserveActions(fixtureSnapshot, '', { topN: 20 });
        expect(off.candidates.some((c) => c.ref === '@e8')).toBe(false);
        const on = buildObserveActions(fixtureSnapshot, '', { topN: 20, includeDisabled: true });
        expect(on.candidates.some((c) => c.ref === '@e8')).toBe(true);
    });

    it('formatObserveActions produces a readable summary', () => {
        const r = buildObserveActions(fixtureSnapshot, 'sign in');
        const text = formatObserveActions(r);
        expect(text).toMatch(/observe-actions: \d+ candidate/);
        expect(text).toMatch(/@e\d+\s+conf=/);
    });

    it('handles empty snapshot without throwing', () => {
        const r = buildObserveActions({ snapshotId: null, url: null, refs: {} }, 'anything');
        expect(r.candidates).toEqual([]);
        expect(formatObserveActions(r)).toMatch(/no candidates/);
    });
});

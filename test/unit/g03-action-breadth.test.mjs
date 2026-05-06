// @ts-check
import { describe, it, expect } from 'vitest';
import {
    BROWSER_PRIMITIVES,
    listPrimitiveCommands,
    primitivesByCategory,
    auditPrimitiveCoverage,
    BROWSER_PRIMITIVE_SCHEMA_VERSION,
} from '../../web-ai/action-breadth.mjs';

describe('G03 — action breadth catalog', () => {
    it('exposes a non-empty frozen primitive list', () => {
        expect(Array.isArray(BROWSER_PRIMITIVES)).toBe(true);
        expect(BROWSER_PRIMITIVES.length).toBeGreaterThanOrEqual(18);
        expect(() => { /** @type {any} */(BROWSER_PRIMITIVES).push({}); }).toThrow();
    });

    it('includes the form primitives demanded by G03', () => {
        const cmds = new Set(listPrimitiveCommands());
        for (const c of ['select', 'check', 'uncheck', 'upload', 'drag', 'scroll', 'wait-for']) {
            expect(cmds.has(c)).toBe(true);
        }
    });

    it('every primitive has a category and description', () => {
        for (const p of BROWSER_PRIMITIVES) {
            expect(p.command).toBeTruthy();
            expect(p.category).toBeTruthy();
            expect(p.description).toBeTruthy();
            expect(Array.isArray(p.args)).toBe(true);
        }
    });

    it('groups primitives by category', () => {
        const groups = primitivesByCategory();
        expect(groups.form && groups.form.length).toBeGreaterThanOrEqual(4);
        expect(groups.wait && groups.wait.length).toBeGreaterThanOrEqual(4);
        expect(groups.pointer && groups.pointer.length).toBeGreaterThanOrEqual(2);
    });

    it('audit reports all wired when source has every case', () => {
        const fakeSource = BROWSER_PRIMITIVES.map(p => `case '${p.command}':\n`).join('');
        const r = auditPrimitiveCoverage(fakeSource);
        expect(r.ok).toBe(true);
        expect(r.missing.length).toBe(0);
        expect(r.found.length).toBe(BROWSER_PRIMITIVES.length);
    });

    it('audit reports missing when a case is absent', () => {
        const partial = BROWSER_PRIMITIVES.slice(0, 3).map(p => `case '${p.command}':\n`).join('');
        const r = auditPrimitiveCoverage(partial);
        expect(r.ok).toBe(false);
        expect(r.missing.length).toBeGreaterThanOrEqual(1);
    });

    it('schema version is v1', () => {
        expect(BROWSER_PRIMITIVE_SCHEMA_VERSION).toBe('browser-primitives-v1');
    });
});


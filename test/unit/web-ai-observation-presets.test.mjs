import { describe, expect, it } from 'vitest';
import { CHATGPT_MODEL_SELECTOR_OBSERVATION } from '../../web-ai/capability-observation-presets.mjs';
import { CHATGPT_EDITOR_CONTRACT } from '../../web-ai/vendor-editor-contract.mjs';
import { featureDefinitionsForVendor } from '../../web-ai/doctor.mjs';
import { lookupCapability } from '../../web-ai/capability-registry.mjs';

describe('web-ai observation presets (GPT-5.6 contract)', () => {
    describe('CHATGPT_MODEL_SELECTOR_OBSERVATION', () => {
        it('has composer-scoped trigger as first selector candidate', () => {
            const first = CHATGPT_MODEL_SELECTOR_OBSERVATION.selectorCandidates[0];
            expect(first).toContain('form:has(');
            expect(first).toContain('button[aria-haspopup="menu"]');
        });

        it('includes composer-intelligence-picker-content testid', () => {
            const found = CHATGPT_MODEL_SELECTOR_OBSERVATION.selectorCandidates.some(
                s => s.includes('composer-intelligence-picker-content'),
            );
            expect(found).toBe(true);
        });

        it('includes menu-item-submenu-chevron testid', () => {
            const found = CHATGPT_MODEL_SELECTOR_OBSERVATION.selectorCandidates.some(
                s => s.includes('menu-item-submenu-chevron'),
            );
            expect(found).toBe(true);
        });

        it('preserves legacy model-switcher-* as fallback candidates', () => {
            const legacy = CHATGPT_MODEL_SELECTOR_OBSERVATION.selectorCandidates.filter(
                s => s.includes('model-switcher'),
            );
            expect(legacy.length).toBeGreaterThanOrEqual(5);
        });

        it('places new selectors before legacy fallbacks', () => {
            const candidates = CHATGPT_MODEL_SELECTOR_OBSERVATION.selectorCandidates;
            const firstLegacyIdx = candidates.findIndex(s => s.includes('model-switcher'));
            const pickerIdx = candidates.findIndex(s => s.includes('composer-intelligence-picker-content'));
            expect(pickerIdx).toBeLessThan(firstLegacyIdx);
        });

        it('textCandidates include GPT-5.6 tier and family labels', () => {
            const tc = CHATGPT_MODEL_SELECTOR_OBSERVATION.textCandidates;
            expect(tc).toContain('Intelligence');
            expect(tc).toContain('Instant');
            expect(tc).toContain('Medium');
            expect(tc).toContain('High');
            expect(tc).toContain('Extra High');
            expect(tc).toContain('Pro');
            expect(tc).toContain('GPT-5.6 Sol');
            expect(tc).toContain('GPT-5.5');
        });

        it('textCandidates do not include removed labels', () => {
            const tc = CHATGPT_MODEL_SELECTOR_OBSERVATION.textCandidates;
            expect(tc).not.toContain('Latest');
            expect(tc).not.toContain('Fast');
            expect(tc).not.toContain('Thinking');
            expect(tc).not.toContain('Heavy');
            expect(tc).not.toContain('Configure...');
        });

        it('activationPath starts with Chat surface confirmation', () => {
            expect(CHATGPT_MODEL_SELECTOR_OBSERVATION.activationPath[0]).toContain('Chat surface');
        });

        it('activeStateSignals include surface radio and exact label', () => {
            const signals = CHATGPT_MODEL_SELECTOR_OBSERVATION.activeStateSignals;
            expect(signals.some(s => s.includes('Chat surface radio'))).toBe(true);
            expect(signals.some(s => s.includes('menuitemradio exact label'))).toBe(true);
        });

        it('notes document that model-switcher-* is legacy fallback and Work slider is not Chat success', () => {
            const notes = CHATGPT_MODEL_SELECTOR_OBSERVATION.notes;
            expect(notes.some(n => n.includes('model-switcher-* candidates are legacy fallback'))).toBe(true);
            expect(notes.some(n => n.includes('composer-model-picker-slider-*'))).toBe(true);
        });
    });

    describe('capability-registry commandBehavior update', () => {
        it('chatgpt-model-selection describes 2-axis family+tier selection', () => {
            const entry = lookupCapability('chatgpt-model-selection');
            expect(entry.commandBehavior).toContain('--family');
            expect(entry.commandBehavior).toContain('Intelligence picker');
            expect(entry.commandBehavior).toContain('legacy aliases');
        });
    });

    describe('doctor feature definitions', () => {
        it('chatgpt includes work-surface feature after model-picker', () => {
            const features = featureDefinitionsForVendor('chatgpt');
            const names = features.map(f => f.feature);
            expect(names).toContain('work-surface');
            const pickerIdx = names.indexOf('model-picker');
            const workIdx = names.indexOf('work-surface');
            expect(workIdx).toBe(pickerIdx + 1);
        });

        it('model-picker uses observation preset selectors', () => {
            const features = featureDefinitionsForVendor('chatgpt');
            const picker = features.find(f => f.feature === 'model-picker');
            expect(picker.selectors).toContain(CHATGPT_MODEL_SELECTOR_OBSERVATION.selectorCandidates[0]);
            expect(picker.selectors.length).toBe(CHATGPT_MODEL_SELECTOR_OBSERVATION.selectorCandidates.length);
        });

        it('work-surface includes surface radio and Work picker marker selectors', () => {
            const features = featureDefinitionsForVendor('chatgpt');
            const work = features.find(f => f.feature === 'work-surface');
            expect(work.selectors.length).toBe(2);
            expect(work.selectors[0]).toContain('role="radio"');
            expect(work.selectors[1]).toContain('composer-model-picker-slider');
        });
    });

    describe('vendor-editor-contract modelPicker update', () => {
        it('modelPicker names include exact tier labels before generic names', () => {
            const mp = CHATGPT_EDITOR_CONTRACT.semanticTargets.modelPicker;
            expect(mp.names.length).toBeGreaterThanOrEqual(5);
            // First name should match exact tier labels.
            expect(mp.names[0].test('Instant')).toBe(true);
            expect(mp.names[0].test('Pro')).toBe(true);
            expect(mp.names[0].test('High')).toBe(true);
            // Second name should match family labels.
            expect(mp.names[1].test('GPT-5.6 Sol')).toBe(true);
            expect(mp.names[1].test('o3')).toBe(true);
        });

        it('modelPicker names include intelligence and legacy patterns', () => {
            const mp = CHATGPT_EDITOR_CONTRACT.semanticTargets.modelPicker;
            expect(mp.names.some(n => n.test('Intelligence'))).toBe(true);
            expect(mp.names.some(n => n.test('model'))).toBe(true);
            expect(mp.names.some(n => n.test('GPT'))).toBe(true);
        });

        it('modelPicker excludeNames prevent false positives', () => {
            const mp = CHATGPT_EDITOR_CONTRACT.semanticTargets.modelPicker;
            expect(mp.excludeNames).toBeDefined();
            expect(mp.excludeNames.some(n => n.test('search'))).toBe(true);
            expect(mp.excludeNames.some(n => n.test('upload'))).toBe(true);
        });
    });
});

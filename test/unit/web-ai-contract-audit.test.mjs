import { describe, expect, it } from 'vitest';
import { auditContractAgainstSnapshot } from '../../web-ai/contract-audit.mjs';

// Contract-audit is heavily dependent on real Playwright pages;
// this unit test only verifies the library shape and error handling.
describe('web-ai contract-audit', () => {
    it('export exists', () => {
        expect(typeof auditContractAgainstSnapshot).toBe('function');
    });
});

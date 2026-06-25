import { describe, expect, it } from 'vitest';
import { fetchViaCamoufox } from '../../skills/browser/adaptive-fetch/camoufox-session.mjs';

// Parity catalog 203.3 (P2): Camoufox stealth-browser fallback.
describe('adaptive fetch camoufox session', () => {
    it('bails to null before spawning when the signal is already aborted', async () => {
        // Guaranteed-safe path: an aborted signal short-circuits before any python/camoufox
        // spawn. (The unavailable-binary no-op is covered by the faithful mirror + design,
        // not asserted here to avoid spawning a real browser if camoufox happens to exist.)
        const controller = new AbortController();
        controller.abort();
        const result = await fetchViaCamoufox('https://example.com/', { signal: controller.signal });
        expect(result).toBeNull();
    });
});

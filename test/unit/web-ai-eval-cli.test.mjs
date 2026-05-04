import { describe, expect, it, vi } from 'vitest';
import { runWebAiCli } from '../../web-ai/cli.mjs';

describe('web-ai eval cli', () => {
    it('runs eval without requiring browser deps', async () => {
        const deps = { getPage: vi.fn(() => { throw new Error('browser should not be used'); }) };
        const result = await runWebAiCli(['eval', '--vendor', 'chatgpt', '--fixtures', 'test/fixtures/provider-dom', '--variant', 'baseline', '--json'], deps);
        expect(result.ok).toBe(true);
        expect(deps.getPage).not.toHaveBeenCalled();
    });

    it('prints eval help surface', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            await runWebAiCli(['--help']);
            expect(spy.mock.calls.map((call) => call.join(' ')).join('\n')).toContain('web-ai eval');
        } finally {
            spy.mockRestore();
        }
    });
});

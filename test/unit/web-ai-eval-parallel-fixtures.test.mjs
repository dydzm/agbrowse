import { describe, expect, it } from 'vitest';
import { runWebAiEval } from '../../web-ai/eval-runner.mjs';

describe('web-ai eval parallel fixture isolation', () => {
    it('runs configured fixtures with bounded concurrency and no marker bleed', async () => {
        const result = await runWebAiEval({
            config: 'test/fixtures/provider-dom/parallel-eval.json',
            concurrency: 4,
        });
        expect(result.ok).toBe(true);
        expect(result.results.map((entry) => entry.fixturePath)).toEqual([
            expect.stringMatching(/chatgpt-parallel-a\.html$/),
            expect.stringMatching(/chatgpt-parallel-b\.html$/),
            expect.stringMatching(/gemini-parallel-a\.html$/),
        ]);
        expect(result.results.every((entry) => entry.status === 'pass')).toBe(true);
    });

    it('rejects invalid fixture concurrency before execution', async () => {
        await expect(runWebAiEval({
            config: 'test/fixtures/provider-dom/parallel-eval.json',
            concurrency: 9,
        })).rejects.toThrow(/fixture concurrency/);
    });
});

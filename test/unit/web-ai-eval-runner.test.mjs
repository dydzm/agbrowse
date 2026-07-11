import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { rejectNetworkFixtureHtml, runBounded, runOneFixture, runWebAiEval } from '../../web-ai/eval-runner.mjs';

import { EVAL_TARGET_INTENTS } from '../../web-ai/eval/provider-targets.mjs';

describe('web-ai eval runner', () => {
    it('emits schemaVersion 1 and passes baseline fixture', async () => {
        const result = await runWebAiEval({ vendor: 'chatgpt', fixtures: 'test/fixtures/provider-dom', variants: ['baseline'] });
        expect(result.schemaVersion).toBe(1);
        expect(result.ok).toBe(true);
        expect(result.results[0]).toMatchObject({ provider: 'chatgpt', variant: 'baseline', status: 'pass' });
        expect(result.results[0].metrics.composerFill.value).toBe(1);
    });

    it('fails closed for breaking fixtures with mutationAllowed false errors', async () => {
        const result = await runWebAiEval({ vendor: 'chatgpt', fixtures: 'test/fixtures/provider-dom', variants: ['breaking'] });
        expect(result.ok).toBe(false);
        expect(result.results[0].status).toBe('fail');
        expect(result.results[0].errors.some((error) => error.mutationAllowed === false)).toBe(true);
    });

    it('propagates fixture safety failures to top-level ok/status and CLI exit code', async () => {
        const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agbrowse-eval-bad-fixture-'));
        const htmlPath = path.join(fixtureDir, 'bad-network.html');
        const configPath = path.join(fixtureDir, 'config.json');
        await fs.writeFile(htmlPath, validTargetFixture('<img src="https://example.test/pixel.png">'));
        await fs.writeFile(configPath, JSON.stringify({
            schemaVersion: 1,
            fixtures: [{ id: 'bad-network', vendor: 'chatgpt', htmlPath: 'bad-network.html' }],
        }));
        const result = await runWebAiEval({ config: configPath });
        expect(result.ok).toBe(false);
        expect(result.status).toBe('fail');
        expect(result.summary.failCount).toBe(1);
        expect(result.results[0].errors[0]).toMatchObject({ errorCode: 'eval.network-blocked', mutationAllowed: false });

        const cli = spawnSync(process.execPath, ['scripts/run-web-ai-eval.mjs', '--config', configPath, '--json'], {
            cwd: process.cwd(),
            encoding: 'utf8',
        });
        expect(cli.status).toBe(1);
        expect(JSON.parse(cli.stdout).ok).toBe(false);
    });

    it('propagates scrub and isolation failures to top-level failure', async () => {
        const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agbrowse-eval-bad-isolation-'));
        const scrubPath = path.join(fixtureDir, 'bad-scrub.html');
        const bleedPath = path.join(fixtureDir, 'bad-bleed.html');
        const configPath = path.join(fixtureDir, 'config.json');
        await fs.writeFile(scrubPath, validTargetFixture('alice@example.com'));
        await fs.writeFile(bleedPath, validTargetFixture('OTHER_FIXTURE_MARKER'));
        await fs.writeFile(configPath, JSON.stringify({
            schemaVersion: 1,
            fixtures: [
                { id: 'bad-scrub', vendor: 'chatgpt', htmlPath: 'bad-scrub.html' },
                { id: 'bad-bleed', vendor: 'chatgpt', htmlPath: 'bad-bleed.html', mustNotContain: ['OTHER_FIXTURE_MARKER'] },
            ],
        }));
        const result = await runWebAiEval({ config: configPath, concurrency: 2 });
        expect(result.ok).toBe(false);
        expect(result.status).toBe('fail');
        expect(result.summary.failCount).toBe(2);
        expect(result.results.flatMap((entry) => entry.errors).map((error) => error.errorCode)).toEqual(expect.arrayContaining([
            'eval.fixture-not-scrubbed',
            'eval.fixture-isolation-leak',
        ]));
    });

    it('rejects external network-capable fixture HTML', () => {
        expect(() => rejectNetworkFixtureHtml('<img src="https://example.com/x.png">')).toThrow(/external network/);
        expect(() => rejectNetworkFixtureHtml('<script src="//example.com/x.js"></script>')).toThrow(/external network/);
    });

    it('does not mutate durable session, tab metadata, or pool files', async () => {
        const home = await fs.mkdtemp(path.join(os.tmpdir(), 'agbrowse-eval-home-'));
        const files = ['web-ai-sessions.json', 'tabs.json', 'web-ai-tab-pool.json'];
        for (const file of files) await fs.writeFile(path.join(home, file), '{"stable":true}\n');
        process.env.BROWSER_AGENT_HOME = home;
        await runWebAiEval({ vendor: 'chatgpt', fixtures: 'test/fixtures/provider-dom', variants: ['baseline'] });
        for (const file of files) {
            expect(await fs.readFile(path.join(home, file), 'utf8')).toBe('{"stable":true}\n');
        }
    });

    it('keeps bounded parallel results in deterministic input order', async () => {
        const seen = [];
        const results = await runBounded([0, 1, 2, 3], 2, async (item) => {
            seen.push(item);
            return item;
        });
        expect(results).toEqual([0, 1, 2, 3]);
        expect(seen).toHaveLength(4);
    });

    it('runs one explicit fixture from config path', async () => {
        const result = await runOneFixture({
            vendor: 'gemini',
            variant: 'parallel-a',
            fixturePath: path.resolve('test/fixtures/provider-dom/gemini-parallel-a.html'),
            configPath: path.resolve('test/fixtures/provider-dom/parallel-eval.json'),
            mustContain: ['GEMINI_PARALLEL_A_OK'],
        });
        expect(result.status).toBe('pass');
        expect(result.provider).toBe('gemini');
    });

    it('runs GPT-5.6 Chat fixture with full default intents and passes', async () => {
        const result = await runWebAiEval({
            config: 'test/fixtures/provider-dom/chatgpt-gpt56-eval.json',
            concurrency: 2,
        });
        expect(result.ok).toBe(true);
        expect(result.results.map(entry => [entry.variant, entry.status])).toEqual([
            ['gpt56-chat', 'pass'],
            ['gpt56-work', 'pass'],
        ]);
    });

    it('GPT-5.6 Chat fixture resolves all 4 target intents', async () => {
        const result = await runOneFixture({
            vendor: 'chatgpt',
            variant: 'gpt56-chat',
            fixturePath: path.resolve('test/fixtures/provider-dom/chatgpt-gpt56-chat.html'),
        });
        expect(result.status).toBe('pass');
        expect(result.metrics.targetResolution.value).toBe(1);
        for (const intent of EVAL_TARGET_INTENTS) {
            if (intent === 'copy.click') continue;
            expect(result.probes[intent].status).toBe('resolved');
        }
    });

    it('GPT-5.6 Work fixture passes with requiredIntents=[composer.fill] only', async () => {
        const result = await runOneFixture({
            vendor: 'chatgpt',
            variant: 'gpt56-work',
            fixturePath: path.resolve('test/fixtures/provider-dom/chatgpt-gpt56-work.html'),
            requiredIntents: ['composer.fill'],
        });
        expect(result.status).toBe('pass');
        expect(result.probes['composer.fill'].status).toBe('resolved');
        expect(result.probes['send.click'].status).toBe('missing');
        expect(result.probes['copy.click'].status).toBe('missing');
        expect(result.metrics.targetResolution.value).toBe(1);
        expect(result.metrics.uploadOpen.threshold).toBeUndefined();
        expect(result.metrics.copyExactness.threshold).toBeUndefined();
        expect(result.errors).toEqual([]);
    });

    it('GPT-5.6 Work fixture fails with default intents (no send.click)', async () => {
        const result = await runOneFixture({
            vendor: 'chatgpt',
            variant: 'gpt56-work',
            fixturePath: path.resolve('test/fixtures/provider-dom/chatgpt-gpt56-work.html'),
        });
        expect(result.status).toBe('fail');
        expect(result.errors.some(e => e.errorCode === 'eval.target-resolution-failed')).toBe(true);
    });
});

function validTargetFixture(extraBody = '') {
    return `<!doctype html>
<html>
  <body>
    <textarea data-eval-intent="composer.fill">Prompt</textarea>
    <button data-eval-intent="upload.open">Upload</button>
    <button data-eval-intent="send.click">Send</button>
    <button data-eval-intent="copy.click">Copy</button>
    <p>${extraBody}</p>
  </body>
</html>`;
}

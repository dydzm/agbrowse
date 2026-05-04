import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { rejectNetworkFixtureHtml, runBounded, runOneFixture, runWebAiEval } from '../../web-ai/eval-runner.mjs';

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

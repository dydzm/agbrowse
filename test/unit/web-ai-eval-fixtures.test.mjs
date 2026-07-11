import { describe, expect, it } from 'vitest';
import { discoverProviderFixtures, loadFixtureConfig, readFixtureHtml, resolveFixturePath, sha256File } from '../../web-ai/eval/fixtures.mjs';

const fixtureDir = 'test/fixtures/provider-dom';

describe('web-ai eval fixtures', () => {
    it('discovers known provider fixtures', async () => {
        const fixtures = await discoverProviderFixtures({ fixtureDir, vendor: 'chatgpt', variants: ['baseline'] });
        expect(fixtures).toHaveLength(1);
        expect(fixtures[0]).toMatchObject({ vendor: 'chatgpt', variant: 'baseline' });
        expect(await sha256File(fixtures[0].fixturePath)).toMatch(/^[a-f0-9]{64}$/);
    });

    it('loads fixture HTML under the fixture root', async () => {
        const html = await readFixtureHtml(fixtureDir, 'chatgpt-baseline.html');
        expect(html).toContain('CHATGPT_BASELINE_OK');
    });

    it('rejects path traversal', () => {
        expect(() => resolveFixturePath(fixtureDir, '../package.json')).toThrow(/escapes fixture directory/);
    });

    it('loads explicit parallel fixture config', async () => {
        const config = await loadFixtureConfig('test/fixtures/provider-dom/parallel-eval.json');
        expect(config.fixtures).toHaveLength(3);
        expect(config.fixtures[0].fixturePath).toMatch(/chatgpt-parallel-a\.html$/);
    });

    it('loads GPT-5.6 eval config with two fixtures and requiredIntents', async () => {
        const config = await loadFixtureConfig('test/fixtures/provider-dom/chatgpt-gpt56-eval.json');
        expect(config.fixtures).toHaveLength(2);
        expect(config.fixtures.map(entry => entry.variant)).toEqual(['gpt56-chat', 'gpt56-work']);
        expect(config.fixtures[0].fixturePath).toMatch(/chatgpt-gpt56-chat\.html$/);
        expect(config.fixtures[1].fixturePath).toMatch(/chatgpt-gpt56-work\.html$/);
        expect(config.fixtures[1].requiredIntents).toEqual(['composer.fill']);
        expect(config.fixtures[0].requiredIntents).toBeUndefined();
    });

    it('GPT-5.6 Chat fixture file is accessible and non-empty', async () => {
        const html = await readFixtureHtml('test/fixtures/provider-dom', 'chatgpt-gpt56-chat.html');
        expect(html).toContain('data-provider="chatgpt"');
        expect(html).toContain('data-variant="gpt56-chat"');
    });

    it('GPT-5.6 Work fixture file is accessible and non-empty', async () => {
        const html = await readFixtureHtml('test/fixtures/provider-dom', 'chatgpt-gpt56-work.html');
        expect(html).toContain('data-provider="chatgpt"');
        expect(html).toContain('data-variant="gpt56-work"');
    });
});

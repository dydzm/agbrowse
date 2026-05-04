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
});

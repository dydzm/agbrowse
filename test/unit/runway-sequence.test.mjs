import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractRunwayLastFrame } from '../../skills/browser/runway-sequence.mjs';

describe('extractRunwayLastFrame', () => {
    it('extracts from one second before the end and verifies output bytes', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'runway-sequence-test-'));
        const input = join(dir, 'shot.mp4');
        const output = join(dir, 'frame.png');
        let args = [];
        await writeFile(input, 'fake mp4');

        const result = await extractRunwayLastFrame(input, output, {
            execFile: async (_bin, nextArgs) => {
                args = nextArgs;
                await writeFile(output, 'fake png');
            },
        });

        expect(result.ok).toBe(true);
        expect(args).toContain('-sseof');
        expect(args).toContain('-1');
        expect(args).toContain('-update');
        expect(args).toContain('1');
    });

    it('fails when ffmpeg exits without writing a frame', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'runway-sequence-test-'));
        const input = join(dir, 'shot.mp4');
        const output = join(dir, 'frame.png');
        await writeFile(input, 'fake mp4');

        const result = await extractRunwayLastFrame(input, output, {
            execFile: async () => undefined,
        });

        expect(result.ok).toBe(false);
        expect(result.error).toContain('produced no output');
    });
});

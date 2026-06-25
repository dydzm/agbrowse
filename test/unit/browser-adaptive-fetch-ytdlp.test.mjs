import { describe, expect, it } from 'vitest';
import { extractSubtitleText, formatYtdlpEvidence } from '../../skills/browser/adaptive-fetch/ytdlp-reader.mjs';

// Parity catalog 203.2 (P2): yt-dlp media/transcript reader (pure surfaces).
describe('adaptive fetch yt-dlp reader', () => {
    it('extractSubtitleText strips WEBVTT header, timestamp cues, and inline tags', () => {
        const raw = [
            'WEBVTT',
            'Kind: captions',
            '',
            '00:00:01.000 --> 00:00:04.000',
            'Hello <c>world</c>',
            '',
            '00:00:04.000 --> 00:00:06.000',
            'second line',
        ].join('\n');
        expect(extractSubtitleText(raw)).toBe('Hello world second line');
    });

    it('formatYtdlpEvidence renders title/uploader/duration and an optional transcript', () => {
        const meta = {
            title: 'My Video', uploader: 'Channel', duration: 125, view_count: 1234,
            upload_date: '20260101', description: 'a description', tags: [], categories: [],
            thumbnail: '', webpage_url: '',
        };
        const out = formatYtdlpEvidence(meta, 'the transcript body');
        expect(out).toMatch(/Title: My Video/);
        expect(out).toMatch(/Uploader: Channel/);
        expect(out).toMatch(/Duration: 2m5s/);
        expect(out).toMatch(/Views:/);
        expect(out).toMatch(/Upload: 20260101/);
        expect(out).toMatch(/Transcript:\nthe transcript body/);
    });

    it('formatYtdlpEvidence omits absent optional fields', () => {
        const out = formatYtdlpEvidence({
            title: '', uploader: '', duration: 0, view_count: 0, upload_date: '', description: '',
            tags: [], categories: [], thumbnail: '', webpage_url: '',
        });
        expect(out).toMatch(/Title: N\/A/);
        expect(out).not.toMatch(/Duration:/);
        expect(out).not.toMatch(/Transcript:/);
    });
});

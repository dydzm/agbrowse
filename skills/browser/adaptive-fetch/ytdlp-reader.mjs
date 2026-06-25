// @ts-check

// Parity catalog 203.2 (P2): yt-dlp media/transcript reader. Adds an audio/video/caption
// extraction lane agbrowse lacked. Reverse port of cli-jaw adaptive-fetch/ytdlp-reader.ts.
// Spawn-based metadata/subtitle fetch (no-op without yt-dlp); extractSubtitleText +
// formatYtdlpEvidence are pure.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateFetchUrl } from './safety.mjs';

const execFileAsync = promisify(execFile);

/** @type {string|null|undefined} */
let cachedBinary;

/** @returns {Promise<string|null>} */
async function detectYtdlp() {
    if (cachedBinary !== undefined) return cachedBinary;
    for (const name of ['yt-dlp', 'youtube-dl']) {
        try {
            await execFileAsync('which', [name]);
            cachedBinary = name;
            return name;
        } catch { /* not found */ }
    }
    cachedBinary = null;
    return null;
}

/**
 * @typedef {Object} YtdlpMetadata
 * @property {string} title
 * @property {string} description
 * @property {number} duration
 * @property {number} view_count
 * @property {string} upload_date
 * @property {string} uploader
 * @property {string[]} tags
 * @property {string[]} categories
 * @property {string} thumbnail
 * @property {string} webpage_url
 * @property {Record<string, Array<{ ext: string, url: string }>>} [subtitles]
 * @property {Record<string, Array<{ ext: string, url: string }>>} [automatic_captions]
 */

/**
 * @param {string} url
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<YtdlpMetadata|null>}
 */
export async function ytdlpMetadata(url, options) {
    const binary = await detectYtdlp();
    if (!binary) return null;
    const timeout = Math.ceil((options?.timeoutMs || 30_000) / 1000);
    try {
        const { stdout } = await execFileAsync(binary, [
            '--dump-json', '--no-download', '--no-warnings',
            '--socket-timeout', String(timeout),
            url,
        ], { timeout: (timeout + 10) * 1000, maxBuffer: 10_000_000 });
        return JSON.parse(stdout);
    } catch {
        return null;
    }
}

/**
 * @param {string} url
 * @param {string} [lang]
 * @param {{ timeoutMs?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<string|null>}
 */
export async function ytdlpSubtitles(url, lang = 'en', options) {
    const meta = await ytdlpMetadata(url, options);
    if (!meta) return null;
    const captions = meta.automatic_captions?.[lang] || meta.subtitles?.[lang];
    if (!Array.isArray(captions) || captions.length === 0) return null;
    const vttEntry = captions.find((e) => e.ext === 'vtt') || captions[0];
    if (!vttEntry?.url) return null;
    try {
        validateFetchUrl(vttEntry.url);
        const fetchFn = options?.fetchImpl || fetch;
        const response = await fetchFn(vttEntry.url, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) return null;
        return extractSubtitleText(await response.text());
    } catch {
        return null;
    }
}

/**
 * Strip WEBVTT header, timestamp cues, and inline tags into a single transcript line.
 * @param {string} raw
 * @returns {string}
 */
export function extractSubtitleText(raw) {
    return raw
        .replace(/WEBVTT[\s\S]*?\n\n/, '')
        .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}.*\n/g, '')
        .replace(/<[^>]+>/g, '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ');
}

/**
 * @param {YtdlpMetadata} meta
 * @param {string|null} [subtitles]
 * @returns {string}
 */
export function formatYtdlpEvidence(meta, subtitles) {
    const lines = [
        `Title: ${meta.title || 'N/A'}`,
        `Uploader: ${meta.uploader || 'N/A'}`,
        meta.duration ? `Duration: ${Math.floor(meta.duration / 60)}m${Math.round(meta.duration % 60)}s` : null,
        meta.view_count ? `Views: ${meta.view_count.toLocaleString()}` : null,
        meta.upload_date ? `Upload: ${meta.upload_date}` : null,
        meta.description ? `Description: ${meta.description.slice(0, 500)}` : null,
        subtitles ? `\nTranscript:\n${subtitles.slice(0, 3000)}` : null,
    ].filter((v) => v != null);
    return lines.join('\n');
}

export { detectYtdlp };

import { describe, expect, it } from 'vitest';
import { runAdaptiveFetch } from '../../skills/browser/adaptive-fetch/index.mjs';
import { getIdentityHeaders } from '../../skills/browser/adaptive-fetch/fetcher.mjs';
import { extractFeedUrls, extractMetadataFromHtml, extractOembedUrls } from '../../skills/browser/adaptive-fetch/metadata.mjs';
import { dedupeCandidateUrls, htmlToReadableText } from '../../skills/browser/adaptive-fetch/transforms.mjs';

describe('adaptive fetch transforms and metadata', () => {
    it('extracts readable text without script/style noise', () => {
        const text = htmlToReadableText('<style>.x{}</style><script>alert(1)</script><article><h1>Hello</h1><p>World&nbsp;now</p></article>');
        expect(text).toContain('Hello');
        expect(text).toContain('World now');
        expect(text).not.toContain('alert');
    });

    it('extracts OGP, canonical, and JSON-LD metadata', () => {
        const meta = extractMetadataFromHtml(`
            <title>Fallback title</title>
            <link rel="canonical" href="/article">
            <link rel="alternate" type="application/rss+xml" href="/feed.xml">
            <link rel="alternate" type="application/json+oembed" href="/oembed.json">
            <meta property="og:title" content="OG title">
            <meta name="description" content="Summary">
            <script type="application/ld+json">{"@type":"Article","headline":"JSON title"}</script>
        `, 'https://example.com/base');
        expect(meta.title).toBe('OG title');
        expect(meta.metadata.canonicalUrl).toBe('https://example.com/article');
        expect(meta.metadata.feedUrls).toEqual(['https://example.com/feed.xml']);
        expect(meta.metadata.oEmbedUrls).toEqual(['https://example.com/oembed.json']);
        expect(meta.metadata.jsonLd[0].headline).toBe('JSON title');
    });

    it('extracts RSS and Atom alternate feeds regardless of attribute order', () => {
        expect(extractFeedUrls(`
            <link href="/rss.xml" type="application/rss+xml" rel="alternate">
            <link rel="alternate" href="https://example.com/atom.xml" type="application/atom+xml">
            <link rel="stylesheet" href="/style.css">
        `, 'https://example.com/articles')).toEqual([
            'https://example.com/rss.xml',
            'https://example.com/atom.xml',
        ]);
    });

    it('extracts oEmbed alternates regardless of attribute order', () => {
        expect(extractOembedUrls(`
            <link href="/embed.json" type="application/json+oembed" rel="alternate">
            <link rel="alternate" href="https://example.com/embed.xml" type="text/xml+oembed">
            <link rel="alternate" href="/feed.xml" type="application/rss+xml">
        `, 'https://example.com/articles')).toEqual([
            'https://example.com/embed.json',
            'https://example.com/embed.xml',
        ]);
    });

    it('deduplicates valid candidate URLs and drops invalid values', () => {
        expect(dedupeCandidateUrls(['https://example.com/a', 'https://example.com/a', 'not-url'])).toEqual(['https://example.com/a']);
    });

    it('runAdaptiveFetch returns a strong fetch result with injected fetch implementation', async () => {
        const result = await runAdaptiveFetch({
            url: 'https://example.com/article',
            publicEndpoints: false,
            trace: true,
        }, {
            fetch: async () => new Response('<article><h1>Title</h1><p>Readable body '.repeat(120) + '</p></article>', {
                status: 200,
                headers: { 'content-type': 'text/html' },
            }),
        });
        expect(result.ok).toBe(true);
        expect(result.verdict).toBe('strong_ok');
        expect(result.source).toBe('fetch');
        expect(result.content).toContain('Readable body');
        expect(result.attempts.some(a => a.source === 'fetch')).toBe(true);
    });

    it('discovers RSS/Atom feeds from weak HTML and scores them as public endpoints', async () => {
        const result = await runAdaptiveFetch({
            url: 'https://example.com/article',
            browserMode: 'never',
            trace: true,
        }, {
            fetch: async (url) => {
                if (String(url).endsWith('/feed.xml')) {
                    return new Response(`<rss><channel><title>Feed</title><item><title>Long story</title><description>${'Readable feed body '.repeat(140)}</description></item></channel></rss>`, {
                        status: 200,
                        headers: { 'content-type': 'application/rss+xml' },
                    });
                }
                return new Response('<title>Weak</title><link rel="alternate" type="application/rss+xml" href="/feed.xml"><p>Short</p>', {
                    status: 200,
                    headers: { 'content-type': 'text/html' },
                });
            },
        });
        expect(result.ok).toBe(true);
        expect(result.source).toBe('public_endpoint');
        expect(result.finalUrl).toBe('https://example.com/feed.xml');
        expect(result.attempts.some(a => a.url === 'https://example.com/feed.xml')).toBe(true);
    });

    it('discovers generic oEmbed links from weak HTML and scores them as public endpoints', async () => {
        const result = await runAdaptiveFetch({
            url: 'https://example.com/media',
            browserMode: 'never',
            trace: true,
        }, {
            fetch: async (url) => {
                if (String(url).endsWith('/oembed.json')) {
                    return new Response(JSON.stringify({
                        title: 'Embedded title',
                        author_name: 'Author',
                        html: '<blockquote>' + 'Readable embedded body '.repeat(120) + '</blockquote>',
                    }), {
                        status: 200,
                        headers: { 'content-type': 'application/json' },
                    });
                }
                return new Response('<title>Weak</title><link rel="alternate" type="application/json+oembed" href="/oembed.json"><p>Short</p>', {
                    status: 200,
                    headers: { 'content-type': 'text/html' },
                });
            },
        });
        expect(result.ok).toBe(true);
        expect(result.source).toBe('public_endpoint');
        expect(result.finalUrl).toBe('https://example.com/oembed.json');
        expect(result.attempts.some(a => a.url === 'https://example.com/oembed.json')).toBe(true);
    });

    it('auto identity sends browser-grade headers with Sec-Fetch-*', () => {
        const headers = getIdentityHeaders('auto');
        expect(headers['User-Agent']).toContain('Chrome/');
        expect(headers['Sec-Fetch-Dest']).toBe('document');
        expect(headers['Sec-Fetch-Mode']).toBe('navigate');
        expect(headers['Accept-Language']).toContain('en-US');
    });

    it('minimal identity sends bare accept header without Sec-Fetch', () => {
        const headers = getIdentityHeaders('minimal');
        expect(headers['Accept']).toBeDefined();
        expect(headers['Sec-Fetch-Dest']).toBeUndefined();
        expect(headers['User-Agent']).toBeUndefined();
    });

    it('chrome identity sends browser-grade headers', () => {
        const headers = getIdentityHeaders('chrome');
        expect(headers['User-Agent']).toContain('Chrome/');
        expect(headers['Sec-Fetch-Dest']).toBe('document');
    });

    it('identity option flows through to fetch result', async () => {
        let capturedHeaders;
        const result = await runAdaptiveFetch({
            url: 'https://example.com/article',
            publicEndpoints: false,
            identity: 'auto',
        }, {
            fetch: async (_url, init) => {
                capturedHeaders = init?.headers;
                return new Response('<article><h1>Title</h1><p>Body ' + 'x'.repeat(500) + '</p></article>', {
                    status: 200,
                    headers: { 'content-type': 'text/html' },
                });
            },
        });
        expect(result.ok).toBe(true);
        expect(result.identity).toBe('auto');
        expect(capturedHeaders?.['Sec-Fetch-Dest']).toBe('document');
    });
});

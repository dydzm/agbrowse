// @ts-check

// Parity catalog 203.6 (P3): structured table/heading extractor. agbrowse defuddle-
// extractor.mjs yields readable prose only; this extracts the structured grid —
// headings, tables (caption/headers/rows), lists, code blocks, JSON-LD. Reverse port of
// cli-jaw adaptive-fetch/structured-extractor.ts. Pure.

/**
 * @typedef {Object} StructuredTable
 * @property {string} [caption]
 * @property {string[]} headers
 * @property {string[][]} rows
 *
 * @typedef {Object} StructuredHeading
 * @property {number} level
 * @property {string} text
 *
 * @typedef {Object} StructuredContent
 * @property {StructuredHeading[]} headings
 * @property {StructuredTable[]} tables
 * @property {Array<{ type: 'ordered'|'unordered', items: string[] }>} lists
 * @property {Array<{ language: string, code: string }>} codeBlocks
 * @property {unknown[]} jsonLd
 * @property {string} mainText
 * @property {number} wordCount
 */

const MAX_TABLE_ROWS = 50;

/**
 * @param {string} html
 * @returns {StructuredContent}
 */
export function extractStructuredContent(html) {
    return {
        headings: extractHeadings(html),
        tables: extractTables(html),
        lists: extractLists(html),
        codeBlocks: extractCodeBlocks(html),
        jsonLd: extractJsonLd(html),
        mainText: '',
        wordCount: 0,
    };
}

/** @param {string} html @returns {StructuredHeading[]} */
function extractHeadings(html) {
    /** @type {StructuredHeading[]} */
    const headings = [];
    const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match;
    while ((match = re.exec(html)) !== null) {
        const text = stripTags(match[2] ?? '').trim();
        if (text) headings.push({ level: Number(match[1]), text });
    }
    return headings;
}

/** @param {string} html @returns {StructuredTable[]} */
function extractTables(html) {
    /** @type {StructuredTable[]} */
    const tables = [];
    const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    while ((tableMatch = tableRe.exec(html)) !== null) {
        const tableHtml = tableMatch[1] ?? '';
        const caption = extractFirst(tableHtml, /<caption[^>]*>([\s\S]*?)<\/caption>/i);
        /** @type {string[]} */
        const headers = [];
        const headerRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
        let hm;
        while ((hm = headerRe.exec(tableHtml)) !== null) {
            headers.push(stripTags(hm[1] ?? '').trim());
        }
        /** @type {string[][]} */
        const rows = [];
        const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;
        while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
            /** @type {string[]} */
            const cells = [];
            const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            let cellMatch;
            while ((cellMatch = cellRe.exec(rowMatch[1] ?? '')) !== null) {
                cells.push(stripTags(cellMatch[1] ?? '').trim());
            }
            if (cells.length > 0 && rows.length < MAX_TABLE_ROWS) rows.push(cells);
        }
        if (headers.length > 0 || rows.length > 0) {
            /** @type {StructuredTable} */
            const entry = { headers, rows };
            if (caption) entry.caption = caption;
            tables.push(entry);
        }
    }
    return tables;
}

/** @param {string} html @returns {Array<{ type: 'ordered'|'unordered', items: string[] }>} */
function extractLists(html) {
    /** @type {Array<{ type: 'ordered'|'unordered', items: string[] }>} */
    const lists = [];
    const listRe = /<(ol|ul)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = listRe.exec(html)) !== null) {
        const type = (match[1] ?? '').toLowerCase() === 'ol' ? 'ordered' : 'unordered';
        /** @type {string[]} */
        const items = [];
        const itemRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let im;
        while ((im = itemRe.exec(match[2] ?? '')) !== null) {
            const text = stripTags(im[1] ?? '').trim();
            if (text) items.push(text);
        }
        if (items.length > 0) lists.push({ type, items });
    }
    return lists;
}

/** @param {string} html @returns {Array<{ language: string, code: string }>} */
function extractCodeBlocks(html) {
    /** @type {Array<{ language: string, code: string }>} */
    const blocks = [];
    const re = /<pre[^>]*>[\s\S]*?<code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi;
    let match;
    while ((match = re.exec(html)) !== null) {
        const code = decodeEntities(stripTags(match[2] ?? '')).trim();
        if (code) blocks.push({ language: match[1] || '', code });
    }
    return blocks;
}

/** @param {string} html @returns {unknown[]} */
function extractJsonLd(html) {
    /** @type {unknown[]} */
    const results = [];
    const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = re.exec(html)) !== null) {
        try {
            results.push(JSON.parse(match[1] ?? ''));
        } catch { /* malformed JSON-LD */ }
    }
    return results;
}

/** @param {string} html @returns {string} */
function stripTags(html) {
    return html.replace(/<[^>]+>/g, '');
}

/** @param {string} text @returns {string} */
function decodeEntities(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'");
}

/** @param {string} html @param {RegExp} re @returns {string} */
function extractFirst(html, re) {
    const m = re.exec(html);
    return m ? stripTags(m[1] ?? '').trim() : '';
}

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

const DEFAULT_HOME = process.env.BROWSER_AGENT_HOME || join(homedir(), '.browser-agent');
const CACHE_FILE = 'action-cache.json';
const SCHEMA_VERSION = 1;
const STALE_MS = 30 * 86_400_000;

export function cacheKey({ provider, urlHost, intent, actionKind, domHashPrefix, axHashPrefix }) {
    return [
        'v1',
        provider || '*',
        urlHost || '*',
        intent || '*',
        actionKind || '*',
        domHashPrefix || '*',
        axHashPrefix || '*',
    ].join('|');
}

export function loadActionCache(homeDir = DEFAULT_HOME) {
    const path = join(homeDir, CACHE_FILE);
    if (!existsSync(path)) return { schemaVersion: SCHEMA_VERSION, entries: {} };
    try {
        const raw = JSON.parse(readFileSync(path, 'utf8'));
        if (raw.schemaVersion !== SCHEMA_VERSION) return { schemaVersion: SCHEMA_VERSION, entries: {} };
        const now = Date.now();
        const entries = {};
        for (const [key, entry] of Object.entries(raw.entries || {})) {
            const lastValidated = entry.stats?.lastValidatedAt ? new Date(entry.stats.lastValidatedAt).getTime() : 0;
            if (now - lastValidated < STALE_MS) {
                entries[key] = entry;
            }
        }
        return { schemaVersion: SCHEMA_VERSION, entries };
    } catch {
        return { schemaVersion: SCHEMA_VERSION, entries: {} };
    }
}

export function saveActionCache(cache, homeDir = DEFAULT_HOME) {
    mkdirSync(homeDir, { recursive: true });
    const path = join(homeDir, CACHE_FILE);
    const tmpPath = path + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(cache, null, 2));
    renameSync(tmpPath, path);
}

export function getCachedTarget(cache, { provider, intent, actionKind, urlHost, fingerprint }) {
    if (!cache?.entries) return null;
    const key = cacheKey({
        provider,
        urlHost,
        intent,
        actionKind,
        domHashPrefix: fingerprint?.domHashPrefix || null,
        axHashPrefix: fingerprint?.axHashPrefix || null,
    });
    const entry = cache.entries[key];
    if (!entry) return null;
    return { target: entry.target, key, entry };
}

export function updateCacheEntry(cache, ctx, resolvedTarget, fingerprint) {
    if (!cache || !resolvedTarget?.selector) return;
    const { provider, intent, actionKind, urlHost } = ctx;
    const key = cacheKey({
        provider,
        urlHost,
        intent,
        actionKind,
        domHashPrefix: fingerprint?.domHashPrefix || null,
        axHashPrefix: fingerprint?.axHashPrefix || null,
    });
    const existing = cache.entries[key];
    cache.entries[key] = {
        schemaVersion: SCHEMA_VERSION,
        provider,
        intent,
        actionKind,
        urlHost: urlHost || null,
        pageFingerprint: fingerprint || {},
        target: {
            selector: resolvedTarget.selector,
            role: resolvedTarget.role || null,
            nameHash: resolvedTarget.name ? hashField(resolvedTarget.name) : null,
            nameChars: resolvedTarget.name ? String(resolvedTarget.name).length : 0,
            signatureHash: signatureHash({ provider, intent, actionKind, role: resolvedTarget.role, selector: resolvedTarget.selector }),
        },
        stats: {
            hitCount: (existing?.stats?.hitCount || 0) + 1,
            lastValidatedAt: new Date().toISOString(),
        },
    };
}

function hashField(value) {
    return `sha256:${createHash('sha256').update(String(value)).digest('hex').slice(0, 12)}`;
}

function signatureHash({ provider, intent, actionKind, role, selector }) {
    const input = [provider, intent, actionKind, role, selector].join('|');
    return `sha256:${createHash('sha256').update(input).digest('hex').slice(0, 16)}`;
}

export function createActionCacheHandle(homeDir = DEFAULT_HOME) {
    const cache = loadActionCache(homeDir);
    return {
        get(lookupCtx) {
            return getCachedTarget(cache, lookupCtx);
        },
        update(ctx, resolvedTarget, fingerprint) {
            updateCacheEntry(cache, ctx, resolvedTarget, fingerprint);
        },
        save() {
            saveActionCache(cache, homeDir);
        },
        raw() {
            return cache;
        },
    };
}

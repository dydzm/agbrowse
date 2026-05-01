import { WebAiError } from './errors.mjs';

export function createRefRegistry(snapshot) {
    return {
        snapshotId: snapshot?.snapshotId || null,
        axHash: snapshot?.axHash || null,
        domHash: snapshot?.domHash || null,
        refs: { ...(snapshot?.refs || {}) },
        createdAt: Date.now(),
        stale: false,
        invalidatedAt: null,
    };
}

export async function resolveRef(page, registry, ref, {
    expectedSnapshotId = null,
    currentDomHash = null,
    currentAxHash = null,
    allowStale = false,
} = {}) {
    void page;
    const normalized = normalizeRef(ref);
    if (!allowStale) {
        assertRegistryFresh(registry, { expectedSnapshotId, currentDomHash, currentAxHash, ref: normalized });
    }
    const entry = registry?.refs?.[normalized];
    if (!entry) {
        throw new WebAiError({
            errorCode: 'snapshot.ref-not-found',
            stage: 'snapshot-ref-resolve',
            retryHint: 're-snapshot',
            message: `ref ${normalized} not found in current snapshot registry`,
            evidence: { ref: normalized, snapshotId: registry?.snapshotId || null },
        });
    }
    return entry;
}

export function invalidateRefsOnDomChange(registry, { domHash = null, axHash = null } = {}) {
    if (!registry) return false;
    const changed = (domHash && registry.domHash && domHash !== registry.domHash)
        || (axHash && registry.axHash && axHash !== registry.axHash);
    if (!changed) return false;
    registry.refs = {};
    registry.domHash = domHash || registry.domHash;
    registry.axHash = axHash || registry.axHash;
    registry.stale = true;
    registry.invalidatedAt = Date.now();
    return true;
}

export function isRegistryStale(registry, {
    expectedSnapshotId = null,
    currentDomHash = null,
    currentAxHash = null,
} = {}) {
    if (!registry || registry.stale === true) return true;
    if (expectedSnapshotId && registry.snapshotId !== expectedSnapshotId) return true;
    if (currentDomHash && registry.domHash && currentDomHash !== registry.domHash) return true;
    if (currentAxHash && registry.axHash && currentAxHash !== registry.axHash) return true;
    return false;
}

function assertRegistryFresh(registry, context = {}) {
    if (!isRegistryStale(registry, context)) return;
    throw new WebAiError({
        errorCode: 'snapshot.ref-stale',
        stage: 'snapshot-ref-resolve',
        retryHint: 're-snapshot',
        message: `ref ${context.ref || ''} belongs to a stale snapshot registry`.trim(),
        evidence: {
            snapshotId: registry?.snapshotId || null,
            expectedSnapshotId: context.expectedSnapshotId || null,
            domHash: registry?.domHash || null,
            currentDomHash: context.currentDomHash || null,
            axHash: registry?.axHash || null,
            currentAxHash: context.currentAxHash || null,
        },
    });
}

function normalizeRef(ref) {
    const value = String(ref || '').trim();
    if (!value) return value;
    if (value.startsWith('@')) return value;
    return `@${value}`;
}

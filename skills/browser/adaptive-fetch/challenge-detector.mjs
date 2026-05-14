// @ts-check

import { findBoundaryMarkers } from './validators.mjs';

/**
 * @param {{ url?: string, status?: number, text?: string, title?: string }} input
 */
export function detectChallengeMarkers(input = {}) {
    return findBoundaryMarkers(`${input.url || ''}\n${input.status || ''}\n${input.title || ''}\n${input.text || ''}`);
}

/**
 * @param {{ kind: string }[]} markers
 */
export function classifyAccessBoundary(markers = []) {
    if (markers.some(marker => marker.kind === 'auth')) return 'auth_required';
    if (markers.some(marker => marker.kind === 'paywall')) return 'paywall';
    if (markers.some(marker => marker.kind === 'challenge')) return 'challenge';
    return null;
}


# 40 — Cycle 4: R6 Wiring + R7 Guards (agbrowse + cli-jaw)

> Part of [00_plan.md](00_plan.md) · **Status: IN PROGRESS**

## R7: cli-jaw guard fixes (3 files)

### R7a: DR symmetric guard (`chatgpt-deep-research.ts`)
- `researchActivityObserved` only set by progress selector (lines 225, 239, 249)
- Not set on `autoConfirmPlan` success (line 207) or mode activation
- Fix: set `researchActivityObserved = true` after successful `autoConfirmPlan`

### R7b: AX subtree + empty→unavailable (`ax-snapshot.ts`)
- `cdpNodesToAxTree` returns empty `{ role: 'document', name: '', children: [] }` on empty CDP result (line 313)
- Fix: throw `WebAiError({ errorCode: 'snapshot.unavailable' })` when CDP returns 0 nodes

### R7c: Lease dead-PID pruning (`tab-lease-store.ts`)
- `assertActiveCapacity` (line 197-200) counts dead-PID active leases toward capacity
- Fix: filter out leases where `pidAlive(lease.ownerPid)` returns false before counting

## R6: agbrowse 203.x wiring (`adaptive-fetch/index.mjs`)

Wire the 6 standalone modules at their natural ladder phases:

1. **candidate-discovery** — after Phase 1 initial fetch, extract candidate URLs from the
   fetched text for potential alternate/canonical sources
2. **feed-parser** — in Phase 1b (discovered feeds), parse feed items into evidence instead
   of just fetching the raw feed URL
3. **ytdlp-reader** — new Phase 1c: detect media URLs, try yt-dlp metadata/subtitles
4. **camoufox-session** — Phase 04c: after TLS-impersonation, before CDP browser escalation
5. **bm25-filter** — Phase 5 (post-selection): when a `query` option is provided, trim the
   winning candidate's text to the most query-relevant paragraphs
6. **structured-extractor** — Phase 5b: extract structured tables/headings from HTML when
   available, append to evidence

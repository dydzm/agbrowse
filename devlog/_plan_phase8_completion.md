# Phase 8 Completion Plan

## Part 1: Summary

Finish Phase 8 (Self-healing selectors + action cache) by:
1. Committing all Phase 6–8 implementation files that are currently untracked/modified.
2. Writing unit tests for the three new Phase 8 modules (`self-heal`, `action-cache`, `action-trace`) with 100% branch coverage on validation/cache/trace logic.
3. Reviewing and fixing the issues found in `self-heal.mjs` (semantic match ordering, click enablement check, redundant role+name fallback).
4. Verifying all existing tests still pass and new tests are green.

**File change map:**
- 8 untracked files (Phase 6–8 modules)
- 8 modified files (integration wiring + tests)
- 3 NEW test files (Phase 8 unit tests)

## Part 2: Detailed Plan

### Step 1: Commit Phase 6–8 Implementation

**Commit scope:** All untracked + modified files in `web-ai/` and `devlog/`.

**Files to stage:**
- `web-ai/watcher.mjs` (Phase 6)
- `web-ai/ax-snapshot.mjs` (Phase 7)
- `web-ai/observe-targets.mjs` (Phase 7)
- `web-ai/ref-registry.mjs` (Phase 7)
- `web-ai/self-heal.mjs` (Phase 8 PR1)
- `web-ai/action-cache.mjs` (Phase 8 PR2)
- `web-ai/action-trace.mjs` (Phase 8 PR2)
- `web-ai/browser-primitives.mjs` (+trace wrappers)
- `web-ai/session.mjs` (+hash/trace fields)
- `web-ai/cli.mjs` (+watch/snapshot commands)
- `web-ai/cli-sessions.mjs` (extracted sessions logic)
- `web-ai/doctor.mjs` (+snapshot mode)
- `web-ai/churn-log.mjs` (+healing field)
- `web-ai/types.mjs` (type updates)
- `web-ai/vendor-editor-contract.mjs` (semantic targets)
- `test/unit/web-ai-sessions-command.test.mjs` (updated assertions)
- `devlog/07_phase6_watcher.md` (docs)
- `devlog/08_phase7_snapshot_substrate.md` (docs)
- `devlog/09_phase8_self_healing.md` (docs)
- `devlog/00_index.md` (index update)

**Commit message:** `feat(web-ai): Phase 6–8 — watcher, snapshot substrate, self-healing selectors + action cache`

### Step 2: Write Unit Tests for Phase 8 Modules

#### NEW `test/unit/web-ai-self-heal.test.mjs`

**Scope:** `resolveActionTarget`, `validateResolvedTarget`, `locatorForResolvedTarget`, `resolveIntentFeature`

**Test cases:**
1. `resolveIntentFeature` maps known intents to feature keys; returns null for unknown.
2. `resolveActionTarget` returns cache hit when cache handle provides valid entry and validation passes.
3. `resolveActionTarget` falls through cache→snapshot→css→observe when each layer fails.
4. `validateResolvedTarget` rejects invisible elements (mustBeVisible=true).
5. `validateResolvedTarget` rejects disabled elements for `actionKind='fill'`.
6. `validateResolvedTarget` accepts disabled elements for `actionKind='click'` if mustBeEnabled=false (edge case).
7. `validateResolvedTarget` performs semantic match via client-side JS when target lacks role/name.
8. `checkSemanticMatch` checks excludeNames BEFORE roles (fix ordering bug).
9. `locatorForResolvedTarget` returns Playwright locator for selector-based target.
10. `locatorForResolvedTarget` resolves ref via registry for ref-based target.
11. `resolveActionTarget` returns TARGET_UNRESOLVED when all layers fail.
12. `resolveActionTarget` populates `attempts` array with every tried source.

**Mock strategy:**
- Mock `page` object with `locator().count()`, `locator().isVisible()`, `locator().isEnabled()`, `locator().first()`, `url()`.
- Mock `cache` handle with `get()` returning `{ target, entry }`.
- Mock `registry` with `isRegistryStale` and `resolveRef`.
- Mock `observeProviderTargets` and `rankTargetCandidates` from `./observe-targets.mjs`.

#### NEW `test/unit/web-ai-action-cache.test.mjs`

**Scope:** `loadActionCache`, `saveActionCache`, `createActionCacheHandle`, `cacheKey`, `getCachedTarget`, `updateCacheEntry`

**Test cases:**
1. `cacheKey` builds deterministic composite key with all parts.
2. `loadActionCache` returns empty cache when file does not exist.
3. `loadActionCache` prunes entries older than 30 days.
4. `loadActionCache` resets cache on schema version mismatch.
5. `createActionCacheHandle.get` returns matching entry by composite key.
6. `createActionCacheHandle.get` returns null on miss.
7. `createActionCacheHandle.update` writes new entry with correct structure.
8. `createActionCacheHandle.update` increments hitCount on existing entry.
9. `createActionCacheHandle.save` writes valid JSON to disk atomically.
10. Cache entry contains `target.selector`, `target.role`, `target.nameHash`, `stats.hitCount`, `stats.lastValidatedAt`.

**Mock strategy:**
- Use `node:fs` in a temp directory under `os.tmpdir()`.
- Clean up temp files after each test.

#### NEW `test/unit/web-ai-action-trace.test.mjs`

**Scope:** `createTraceContext`, `recordTraceStep`, `getSessionTrace`, `summarizeTrace`

**Test cases:**
1. `createTraceContext` initializes with sessionId and empty steps.
2. `recordTraceStep` adds step with UUID, timestamp, action, target.
3. `recordTraceStep` enforces MAX_TRACE_STEPS limit (drops oldest).
4. `getSessionTrace` returns defensive copy of steps.
5. `summarizeTrace` counts unique resolution sources.
6. `summarizeTrace` counts errors (status !== 'ok').
7. `summarizeTrace` returns time range from first to last step.
8. Trace step supports `snapshotHashBefore` and `snapshotHashAfter` fields.

**Mock strategy:**
- Pure in-memory, no I/O mocks needed.

### Step 3: Review & Fix Issues

**Issue 1: `self-heal.mjs` `checkSemanticMatch` ordering**
- Current: checks `roles` first, returns true immediately; `excludeNames` checked only if roles don't match.
- Fix: check `excludeNames` FIRST, return false if name matches exclusion, then check roles.

**Issue 2: `self-heal.mjs` `validateResolvedTarget` click enablement**
- Current: `mustBeEnabled` defaults to true, but for `actionKind='click'` we should still validate `isEnabled()` per accessibility best practice.
- Fix: ensure `isEnabled()` is checked for clicks too, unless explicitly disabled.

**Issue 3: `self-heal.mjs` redundant role+name fallback**
- Current: lines 179-191 construct a locator via role+name but only validate, never use it for action.
- Fix: simplify — if selector validation fails, try role+name locator fallback directly in `locatorForResolvedTarget`.

**Issue 4: `action-cache.mjs` no auto-save**
- Current: callers must manually call `handle.save()` after `update()`.
- Fix: add optional `autoSave` parameter to `createActionCacheHandle`; if true, call `saveActionCache` on every `update`.

**Issue 5: `action-trace.mjs` orphan module**
- Current: no caller wires trace recording into browser-primitives.
- Fix: verify `browser-primitives.mjs` trace wrappers call `recordTraceStep`; if not, add the wiring.

### Step 4: Verification

**Run:**
- `npm test` — all 237 existing + new tests pass
- `npm run lint` — if available
- Check devlog structure counts match

### Exit Criteria

- [ ] Phase 6–8 files committed to main
- [ ] 3 new unit test files with ≥90% branch coverage on Phase 8 logic
- [ ] Known bugs from review fixed
- [ ] All tests passing (237 existing + new)
- [ ] No regressions in existing behavior

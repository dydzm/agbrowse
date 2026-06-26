# 30 — Cycle 3: R5 Lock Redesign (cli-jaw)

> Part of [00_plan.md](00_plan.md) · **Status: IN PROGRESS**

## Target
- **Repo:** cli-jaw
- **Severity:** P1 (concurrency)
- **Gate:** `npm test` + `npx tsc --noEmit`

## R5 problems (GPT-Pro #3/#4)

### session-store.ts `withStoreLock`
1. **Empty-file race:** `openSync('wx')` creates file, then `writeFileSync(fd, metadata)` follows. Between creation and write, another process reads an empty file → `JSON.parse` throws → `isStaleLock` returns true → deletes the active lock.
2. **No heartbeat:** `acquiredAt` is the only timestamp. Long operations (>5min, e.g. Pro model polling) get their lock incorrectly classified as stale and stolen.
3. **Blocking sleep:** `Atomics.wait` freezes the event loop during lock contention.

### watcher-lock.ts `acquireWatcherSessionLock`
4. **Missing-metadata race:** `mkdirSync` is atomic, but `writeWatcherLockMetadata` happens after → missing `metadata.json` → `readWatcherLockMetadata` returns null → `isWatcherLockStale(null)` returns true → racer `rmSync`s the lock dir.

## Fix

### session-store.ts

**Change 1 — Atomic metadata publish in `withStoreLock`:**
- Write metadata to a `.tmp` file, then `renameSync` to the lock path
- `isStaleLock` treats empty/unparseable files as NOT stale for a grace period (2s from mtime) instead of immediately stale

**Change 2 — Heartbeat in `withStoreLock`:**
- Start a `setInterval` heartbeat timer (60s) that updates `heartbeatAt` in the lock metadata
- Clear the timer in the finally block

**Change 3 — Non-blocking sleep replacement:**
- Replace `sleepBlockingMs` (`Atomics.wait`) with `await new Promise(r => setTimeout(r, ms))`
- `withStoreLock` becomes async

**Change 4 — Same for `withSessionCommandLock`:**
- Same atomic publish + heartbeat + async conversion

### watcher-lock.ts

**Change 5 — Atomic metadata in lock dir:**
- Write metadata to `metadata.json.tmp`, then rename to `metadata.json`
- `readWatcherLockMetadata` treats missing metadata as NOT stale for 2s from dir mtime

## Impact

- `withStoreLock` and `withSessionCommandLock` become async → callers already use them
  in async contexts (session-store operations). `withStoreLock` callers that are sync
  wrappers need `await` added — check all call sites.

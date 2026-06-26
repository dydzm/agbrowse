# 30 — Cycle 3: R5 Lock Redesign (cli-jaw)

> Part of [00_plan.md](00_plan.md) · **Status: ⬜ PENDING (stub)**

## Target
- **Repo:** cli-jaw
- **Severity:** P1 (concurrency)
- **Gate:** `npm test` + `npx tsc --noEmit`

## R5: atomic publish + heartbeat + grace window
- MODIFY `src/browser/web-ai/session-store.ts`: write-then-rename atomic publish, heartbeat timer, async retry
- MODIFY `src/browser/web-ai/watcher-lock.ts`: same atomic publish for metadata.json, decouple heartbeat from poll tick
- Test: multi-process stress test; empty-file race window

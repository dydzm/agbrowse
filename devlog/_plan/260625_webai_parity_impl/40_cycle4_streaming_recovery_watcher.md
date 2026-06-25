# 40 — Cycle (cli-jaw (.ts))

> Part of [00_plan.md](00_plan.md) · Goal `68727b6d-d01` · **Status: ⬜ PENDING (stub — diff-level detail filled at this cycle's P/B phase)**

## Target
- **Repo / lang:** cli-jaw (.ts)
- **Severity:** P1
- **Gate command:** `npm test + npx tsc --noEmit`

## Gaps in scope
101 #9 streaming false-complete fix (cff76ed: readStreaming/readFinished finality, responseStableMs, fragment dedupe) + watcher streaming-recovery; 105.5 persisted streaming-progress fields

## Build log

- **Wiring follow-ups (chatgpt.ts/capture-flow)** — ✅ DONE
  - 3.3 observer wired into `captureAssistantResponse` (`017b4a31`); 2.4 chatgpt-files capture
    on poll completion (`a460cd74`).
- **101 #9 streaming false-complete — CORE already satisfied by Cycle 3** — ✅ DONE + LOCKED — `db005fb7`
  - Root cause (cff76ed `00_repro_and_root_cause.md`): the **recovery path returned complete
    without re-checking `isStreaming`**. cli-jaw had NO recovery until Cycle 3; the recovery added
    in 3.2/3.3 is the **already-fixed** version — `recoverAssistantResponse` returns `streaming:true`
    when streaming, and `captureAssistantResponse` gates complete on `!recovered.streaming`. Plus
    3.1 top-level-dedup (no fragment false-reads) + the watcher (`watcher.ts:135`) trusts the
    now-correct `result.status` (a still-streaming page → `ok:false` → keeps polling).
  - Locked by integration test `BWAI-STREAM-001` (still-streaming fake page → `ok:false`, never the
    mid-stream fragment). Source unchanged (correct since Cycle 3).
- **105.5 persisted streaming-progress fields** — ⬜ **P2 follow-up** (NOT done).
  `envelopeSummary`/`lastDomHash`/`lastAxHash`/`lastStreamingState`/`lastResponseCharCount` for
  cross-process resume/progress. Needs the deferred-result + DOM/AX hashing infra (more than additive
  fields) — defer to a P2 enhancement slice.

**Cycle 4 gate:** full cli-jaw `npm test` → **4780 tests, 4762 pass, 0 fail**; tsc 0. ✅

## Verification
101 #9 core: BWAI-STREAM-001 + the watcher-trusts-result analysis above; wirings: full suite + RESP-005.

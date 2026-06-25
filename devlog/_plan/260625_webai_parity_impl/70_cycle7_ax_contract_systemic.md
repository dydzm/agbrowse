# 70 — Cycle (cli-jaw (.ts))

> Part of [00_plan.md](00_plan.md) · Goal `68727b6d-d01` · **Status: ✅ DONE (genuine non-derivative 105.x; CLI-flags 105.2 → Phase-4, checklist 105.6/.9 → Cycle 8 with their modules)**

## Target
- **Repo / lang:** cli-jaw (.ts)
- **Severity:** P2/P3
- **Gate command:** `npm test + npx tsc --noEmit`

## Gaps in scope
104.20-.22 occurrenceIndex / observation-bundle shape / contract-audit shared 7-feature contract; 105.1 error-code taxonomy, 105.2 CLI flag delta (inline --system/--context), 105.6 retryHint, 105.7 stage vocab, 105.8 selector member-arrays, 105.9 warning object-shape

> Note: 104.20/.21/.22 (occurrenceIndex / observation-bundle / contract-audit) were already completed in Cycle 6.

## Build log (cli-jaw branch `feat/webai-parity-100-260625`)

- **105.8 — selector member-array drift** — ✅ DONE — cli-jaw `ffcc402b`
  - `INPUT_SELECTORS` +bare `textarea:not([disabled])`; `SEND_BUTTON_SELECTORS` +`form button[type=submit]`
    +generic `button[aria-label*=Send i]`; `UPLOAD_BUTTON_SELECTORS` +`composer-plus-btn` +`Add files and more`
    +Korean `파일 추가 및 기타` (exported). Additive fallbacks, precision-first order preserved.
    Tests BWAI-SELDRIFT-001..003.
- **105.5 — persisted session streaming-progress fields** — ✅ DONE — cli-jaw `4aa9e977`
  - `WebAiSessionRecord`/`StoredSession` +`envelopeSummary`/`lastDomHash`/`lastAxHash`/`lastStreamingState`/
    `lastResponseCharCount`. `createSession` seeds (envelopeSummary = compact non-sensitive counts/flags),
    `updateSessionResult`/`updateSessionStatus` derive streaming-state + persist char-count, new
    `updateSessionProgress()` for the watcher (dom/ax hashes). Tests SESS-105.5-A..D.
- **105.7 + 105.1 (composer) — stage vocab + typed error codes** — ✅ DONE — cli-jaw `ec8dfef1`
  - `WebAiFailureStage` union + `KNOWN_STAGES` +6 core labels (`connect`/`poll`/`commit-verify`/
    `composer-prereq`/`context-preflight`/`attachment-verify`). The composer (104.12-ported) now EMITS
    typed `WebAiError`: `provider.composer-not-visible`/`composer-prereq` (findComposerCandidate) and
    `provider.commit-not-verified`/`commit-verify` (insert/verify) — codes already in cli-jaw's vocabulary,
    now actually thrown. Tests BWAI-COMPOSER-TYPEDERR-001..003.

**Gate (Cycle 7):** full cli-jaw `npm test` → **4843 tests, 4825 pass, 0 fail**; tsc 0. (The recurring
`PABCD state-machine` / `getState()=IDLE` failure is pre-existing test-isolation flakiness — passes on
re-run / in isolation; zero orchestrate/PABCD files touched this goal. Worth a separate fix, out of scope here.)

## Cycle-7 disposition (105 systemic surfaces)
- **Done:** 105.8 (P2), 105.5 (P2), 105.7 core + 105.1 composer adoption.
- **Already done:** 105.4 (tier-timeout) in Cycle 5.
- **Deferred by design:** 105.2 (CLI flag-surface, incl. inline `--system`/`--context` prompt-channel) →
  **Phase 4**, follows the module ports (flags are the surface, modules the substance). 105.6 (retryHint
  vocab) + 105.9 (`warning:` object-shape) + remaining 105.1 codes → **checklists that port WITH their
  Cycle-8 (102) modules** (chatgpt-archive, image-output, upload-surface, tab-inspect, nav-ready). 105.3
  (test-cov) informational.

## Verification
Per-item gates above; faithful mirror of agbrowse `chatgpt-composer.mjs`/`session.mjs`/`diagnostics`.
Live browser-context behavior (selector resilience on real layouts) deferred to the Cycle-12 GPT-Pro gate.

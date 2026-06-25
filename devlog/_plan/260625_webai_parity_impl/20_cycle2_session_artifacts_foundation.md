# 20 — Cycle (cli-jaw (.ts))

> Part of [00_plan.md](00_plan.md) · Goal `68727b6d-d01` · **Status: ⬜ PENDING (stub — diff-level detail filled at this cycle's P/B phase)**

## Target
- **Repo / lang:** cli-jaw (.ts)
- **Severity:** P0
- **Gate command:** `npm test + npx tsc --noEmit`

## Gaps in scope
101 #1 session-artifacts capture foundation + chatgpt-files upload-artifact capture

## Plan (mapped — integration points confirmed against live cli-jaw)

Scope exceeds one atomic commit (agbrowse `session-artifacts.mjs` 301L + `chatgpt-files.mjs` 429L). Slice it:

- **2.1 — session-artifacts foundation (P0 keystone).**
  - NEW `src/browser/web-ai/session-artifacts.ts` — strict-TS port of the 12 exports
    (`resolveArtifactsDir`, `saveTranscript`/`trySaveTranscript`, `saveReport`/`trySaveReport`,
    `saveImageArtifact`/`try…`, `saveFileArtifact`/`try…`, `saveDiagnosticsArtifact`/`try…`,
    `appendArtifactRecord`). FS layout under **`JAW_HOME`** (not agbrowse's `~/.browser-agent`):
    `resolveArtifactsDir = join(JAW_HOME, 'web-ai-artifacts', sanitize(sessionId))`. Keep the
    `sanitizeSegment` traversal guard. `ArtifactSaveResult` discriminated union mirrored.
  - `types.ts`: + `WebAiArtifactDescriptor` interface, + `artifacts?: WebAiArtifactDescriptor[]`
    on `WebAiSessionRecord` (additive optional — like the Cycle-1 `turns` field).
  - `session.ts`: + `appendSessionArtifact(sessionId, descriptor)` store-owner mutator
    (load → `getSession` → dedupe by `kind+path` → append → `savePersistentStore`). cli-jaw's
    store is a single `web-ai-sessions.json`; `getSession` (line 134) already exists.
  - Tests: `tests/unit/browser-web-ai-session-artifacts.test.ts` — `resolveArtifactsDir`
    sanitization, file ext/MIME fallback, `trySave*` round-trip under a temp `JAW_HOME`,
    `appendArtifactRecord` dedupe. Gate: `tsc --noEmit` + targeted test + full suite.
- **2.2 — chatgpt-files (P0, catalog #1).** NEW `chatgpt-files.ts` (URL allowlist
  `normalizeChatGptFileDownloadUrl`/`normalizeChatGptSandboxUrl`, `readAssistantDownloadableFiles`,
  `saveAssistantDownloadableFiles`, filename resolution). Pure-function tests first.
- **2.3 — wire deferred Cycle-1 saves.** multi-turn transcript-save (106.6) + DR report-save
  call `trySaveTranscript`/`trySaveReport` + `appendSessionArtifact` (remove the deferral notes).

Integration confirmed: cli-jaw home = `JAW_HOME` (`../../core/config.js`), store `web-ai-sessions.json`,
`getSession` exists, no current `artifacts` field on the record.

## Build log (cli-jaw branch `feat/webai-parity-100-260625`)

- **2.1 — session-artifacts foundation** — ✅ DONE — cli-jaw `98760f5b`
  - NEW `session-artifacts.ts` (FS under `JAW_HOME/web-ai-artifacts/<sid>`, traversal guard, `try*`
    discriminated-union result); `types.ts` + `WebAiArtifactDescriptor`/`artifacts[]`; `session.ts`
    + `appendSessionArtifact` (dedupe kind+path). Test BWAI-ARTIFACTS-001; tsc 0.
- **2.3 — wire deferred Cycle-1 saves** — ✅ DONE — cli-jaw `7fa38482`
  - multi-turn partial → `trySaveTranscript`+`appendSessionArtifact` (106.6); deep-research
    complete+timeout → `trySaveReport`+`appendSessionArtifact`. Test BWAI-MULTITURN-002 exercises
    the append path; mocks → context-scoped `t.mock.module`. tsc 0.
  - **Regression gate:** full cli-jaw `npm test` → **4767 tests, 4749 pass, 0 fail**.
- **2.2 — chatgpt-files (generic downloadable-file capture, P0)** — ⬜ PENDING (next).
  NEW `chatgpt-files.ts`: `normalizeChatGptFileDownloadUrl`/`normalizeChatGptSandboxUrl` allowlist,
  `readAssistantDownloadableFiles` (CDP DOM scan), `saveAssistantDownloadableFiles` (sequential
  download + `trySaveFileArtifact`). Pure URL/filename tests first.

## Verification
_A-phase audit result (advisory) + C-phase gate result._

# 30 — Cycle (cli-jaw (.ts))

> Part of [00_plan.md](00_plan.md) · Goal `68727b6d-d01` · **Status: ⬜ PENDING (stub — diff-level detail filled at this cycle's P/B phase)**

## Target
- **Repo / lang:** cli-jaw (.ts)
- **Severity:** P0
- **Gate command:** `npm test + npx tsc --noEmit`

## Gaps in scope
101 #2 response-observer (MutationObserver early-wake + 3rd-tier recovery); chatgpt-response-dom readTopLevelAssistantTexts; 106.13 descendant de-dup

## Build log (cli-jaw branch `feat/webai-parity-100-260625`)

- **3.1 — descendant-dedup reads (106.13)** — ✅ DONE — cli-jaw `a943ba84`
  - NEW `chatgpt-response-dom.ts` (`readTopLevelAssistantTexts` + locator fallback); `readAssistantTexts`
    now uses it (page.evaluate first, locator fallback), replacing the flat `captureTextBaseline`+`safeAll`
    path so a nested assistant match never double-counts its parent. Tests BWAI-RESPDOM-001/002.
- **3.2 — response-observer module (101 #2)** — ✅ DONE (capability) — cli-jaw `1517d1f0`
  - NEW `chatgpt-response-observer.ts`: `buildResponseObserverExpression` (MutationObserver short-circuit),
    `observeAssistantResponse` (early-wake), `recoverAssistantResponse` (3rd-tier last-turn re-read,
    injected `isFinalAnswer`). Tests BWAI-OBS-001..005.
- **Cycle 3 gate:** full cli-jaw `npm test` → **4779 tests, 4761 pass, 0 fail**; tsc 0. ✅

## Verification
A-phase audit (Cycle 1) confirmed 101 #2 ABSENT + 106.13 flat. C-phase: gate green above; regression
on `browser-web-ai-response-capture` (the `readAssistantTexts` consumer) clean.

## TRACKED follow-up (wiring) — see consolidated note in 00_plan
**3.3 — wire the observer into the capture poll loop** (NOT yet done). agbrowse weaves
`observeAssistantResponse` (early-wake) + `recoverAssistantResponse` (timeout recovery) into
`chatgpt.mjs:364/549` with an observer budget; cli-jaw's authoritative loop is `captureAssistantResponse`
(`chatgpt-response.ts`), a different structure. Behavior-changing capture-path integration → dedicated
wiring pass with an integration test, grouped with follow-up 2.4 (chatgpt-files).

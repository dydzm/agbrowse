# 100 — Cycle (agbrowse (.mjs))

> Part of [00_plan.md](00_plan.md) · Goal `68727b6d-d01` · **Status: ⬜ PENDING (stub — diff-level detail filled at this cycle's P/B phase)**

## Target
- **Repo / lang:** agbrowse (.mjs)
- **Severity:** P2
- **Gate command:** `npm run gate:typecheck && npm run gate:tests && npm run docs:drift && npm run docs:counts`

## Gaps in scope
201 #1 declarative capability-registry (+ #1a types, #2 observation presets, #8 observed-tool entries) + #3 annotated-screenshot + #4 interstitial detector + #5 product-surfaces. (#6 diagnostics-enrich, #7 provider-adapter, #9 freshness-gate → Cycle 11 with the 202/203 remainder.)

## Plan (P-phase 2026-06-26)
Reverse port cli-jaw `src/browser/web-ai/{capability-registry,capability-types,capability-observation-presets,capability-observed-tool-entries,interstitial,product-surfaces,annotated-screenshot}.ts` → agbrowse `web-ai/*.mjs` (`.ts`→`.mjs` + JSDoc typedefs). agbrowse `capability.mjs` is runtime probes only; this adds the declarative inventory + gating model alongside it. `requireCapabilityOrFailClosed` throws agbrowse's `WebAiError` (`capability.unsupported`) rather than cli-jaw's `BrowserCapabilityError`. All NEW files (none pre-exist in agbrowse). On branch `feat/webai-parity-200-260625`.

| NEW agbrowse file | 201 item | Pri | Pure/testable surface |
|---|---|---|---|
| `web-ai/interstitial.mjs` | #4 | P1 | `classifyInterstitial` (signals→kind/retryHint), `isPageDeathError` |
| `web-ai/capability-types.mjs` | #1a | P1 | JSDoc typedef substrate |
| `web-ai/capability-observation-presets.mjs` | #2 | P1 | curated frontend observation data |
| `web-ai/capability-observed-tool-entries.mjs` | #8 | P2 | observed-tool backlog data |
| `web-ai/capability-registry.mjs` | #1 | P1 | REGISTRY + lookup/list/isEnabled/requireOrFailClosed/schema rows |
| `web-ai/product-surfaces.mjs` | #5 | P2 | detectChatGpt/GeminiProductSurfaces (non-mutating) |
| `web-ai/annotated-screenshot.mjs` | #3 | P1 | hashImageBytes, summarizeScreenshotForDoctor, buildAnnotatedScreenshot |

## Build log (B-phase — branch `feat/webai-parity-200-260625`)
| Commit | Items | Tests |
|---|---|---|
| `1c9bdb2` | #4 interstitial | 8 |
| `398d29b` | #1+#1a+#2+#8 registry cluster | 7 |
| `29902da` | #3 annotated-screenshot + #5 product-surfaces | 8 |
| (count sync) | str_func.md web-ai aggregate 109 files | — |

23 new unit tests. Adaptations: JSDoc typedefs (no TS types); `WebAiError` capability fail-close; capability-freshness re-export dropped (#9 → Cycle 11).

## Verification
- **A-phase:** 201 #1–#5/#8 re-confirmed absent in live agbrowse — `web-ai/` had `capability.mjs` (runtime probes) + `observation-bundle.mjs` only; no capability-registry/interstitial/product-surfaces/annotated-screenshot.
- **C-phase (gate):** full agbrowse gate green — `gate:typecheck` PASS, `gate:tests` PASS (unit+MCP+source-audit+trace-policy), `docs:drift` 144, `docs:counts` 63. 23/23 new tests pass.

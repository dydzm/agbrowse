# 106 — Deep-Research / Multi-Turn / Tooling / Tab-Lease Drift (agbrowse → cli-jaw)

Date: 2026-06-25 · Parent: [100](100_agbrowse_to_clijaw_overview.md) · **Convergence Pass 4**
Source: agbrowse `web-ai/*.mjs` · Target: cli-jaw `src/browser/web-ai/*.ts`

Pass 4 line-diffed the modules cli-jaw **ported but never had line-audited** (deep-research, multi-turn) plus composer-tooling and the tab-lease store. The headline: cli-jaw's deep-research and multi-turn are **materially behind** — they can persist a non-report as a report and drop conversation history. All 100-direction (agbrowse → cli-jaw). All grep-verified.

> **Direction note:** the Pass-4 agent labeled the chatgpt-tools / tab-lease / response-dom rows "200" — that was wrong. In every one agbrowse **has** the behavior and cli-jaw **lacks** it, so they are **100**-direction (cli-jaw mirrors agbrowse). Corrected below.

## chatgpt-deep-research (cli-jaw ported but behind)

| # | Gap | agbrowse file:symbol | cli-jaw status | Pri |
| --- | --- | --- | --- | --- |
| 106.1 | **"Deep-research-not-started" guard** — track `researchActivityObserved`; if no DR activity seen, a normal chat reply is NOT captured as a report (`warnings:['deep-research-not-started']`) | `chatgpt-deep-research.mjs:sendDeepResearch` (`researchActivityObserved` :242/280/296/306, guard :308-321) | `chatgpt-deep-research.ts:sendDeepResearch` — no activity tracking; **any** stable assistant text → `status:'complete'` (:238/250) | **P1** |
| 106.2 | **Incomplete-report rejection** — planning/progress/<120-char text not saved as the final report | `chatgpt-deep-research-report.mjs:chooseDeepResearchReportRead`/`isIncompleteDeepResearchText`; consumed in `chatgpt-deep-research.mjs:extractResearchReport` | absent — `extractResearchReport` returns raw text, no `completed` flag (:121-147) | **P1** |
| 106.3 | **`resumeDeepResearch`** — rebind to a saved DR tab and collect the report without re-prompting | `chatgpt-deep-research.mjs:resumeDeepResearch` (:403-464) | absent | P2 |
| 106.4 | DR report **artifact persistence** on complete & timeout | `chatgpt-deep-research.mjs:trySaveReport`+`appendArtifactRecord` (:341/375) | absent — only `updateSessionResult`, no artifact saved | P2 |

## chatgpt-multi-turn (cli-jaw ported but behind)

| # | Gap | agbrowse file:symbol | cli-jaw status | Pri |
| --- | --- | --- | --- | --- |
| 106.5 | **Prior-turn merge** — `existingTurns=session.turns`, `turnIndex=existingTurns.length`, transcript = `[...existingTurns, ...turns]` | `chatgpt-multi-turn.mjs:sendMultiTurn` (:138-139/165/190) | `chatgpt-multi-turn.ts:sendMultiTurn` — `turnIndex=0` (:111), transcript = new turns only → **drops history + corrupts indices on resume** | **P1** |
| 106.6 | Multi-turn transcript **artifact on partial failure** | `chatgpt-multi-turn.mjs:trySaveTranscript`+`appendArtifactRecord` (:204-208) | absent | P2 |

## chatgpt-tools (composer tooling)

| # | Gap | agbrowse file:symbol | cli-jaw status | Pri |
| --- | --- | --- | --- | --- |
| 106.7 | Plugin **"더 보기 / More" submenu hover-expand** — plugins behind More are reachable | `chatgpt-tools.mjs:selectMoreComposerMenuItem` (:149-160) | `chatgpt-tools.ts:findPluginMenuItem` single-pass (:159-167) → plugins behind More fail | P2 |
| 106.8 | **`aria-checked` idempotency** — don't re-click an already-active tool (re-click toggles it OFF) | `chatgpt-tools.mjs:checkedState` (:159/207) | `chatgpt-tools.ts` always clicks (:204-206) | P2 |
| 106.9 | Plus-menu **keyboard fallback** (`Meta/Ctrl+U`) when the button click fails | `chatgpt-tools.mjs:openComposerPlusMenu` (:176-178) | returns `composer-plus-button-not-found`, gives up (:187-198) | P3 |

## tab-lease-store

| # | Gap | agbrowse file:symbol | cli-jaw status | Pri |
| --- | --- | --- | --- | --- |
| 106.10 | **Active-tab capacity enforcement** (per-key/global) on lease record | `tab-lease-store.mjs:ProviderActiveCapacityError`/`assertActiveCapacity` (:75-88/254/493-524) | `recordActiveLease` — no capacity check (:226-255) | P2 |
| 106.11 | **Dead-owner-PID reclamation** of orphaned active leases | `tab-lease-store.mjs:cleanupLeasedTabs` (`ownerPid`+`isPidAlive`→`owner-pid-dead`, :367-385) | `cleanupLeasedTabs` — pooled overflow/expiry only (:405-419) | P2 |
| 106.12 | `cleanupLeasedTabs` honors **active-command targets** + `completedSessions` (avoid closing in-use tabs) | `tab-lease-store.mjs:cleanupLeasedTabs` (`activeCommandTargetIds`/`completedSessions`, :372/382/391) | absent (:405-419) | P3 |

## response-DOM

| # | Gap | agbrowse file:symbol | cli-jaw status | Pri |
| --- | --- | --- | --- | --- |
| 106.13 | **Descendant de-dup** when reading assistant turns — nested matches don't double-count text | `chatgpt-response-dom.mjs:readTopLevelAssistantTexts`/`isInsideAnotherMatchedNode` (:28-73) | `chatgpt-response.ts:readAssistantTexts` flat (:113-128) | P2 |

## Confirmed (elevated from Pass-3 "secondary")

Both verified REAL in Pass 4 (cited lines), promoted to firm P2 rows — they were the secondary notes under [104.19–104.22](104_webai_shared_module_divergences.md):

| # | Gap | agbrowse file:symbol | cli-jaw status | Pri |
| --- | --- | --- | --- | --- |
| 106.14 | self-heal **`aria-labelledby` name resolution** (`getElementById().textContent`) + **`input[type=text]` role guard** | `self-heal.mjs:runValidationContract` (:344/351-353) | `self-heal.ts:runValidationContract` — `tag==='input'?'textbox'` (:369, all inputs), no labelledby (:370) → non-text inputs misclassify during live scoring | P2 |
| 106.15 | session-target-guard preserves **`session.deadlineAt`** in candidates | `session-target-guard.mjs:sanitizeSessionCandidate` (:38 `session?.deadlineAt||null`) | `session-target-guard.ts:31` hardcodes `deadlineAt:null` — `types.ts:154` defines it, so value silently dropped | P2 |

## Notes
- **106.1/106.2/106.5 are P1 correctness bugs**, not missing niceties: cli-jaw can return a non-report as a deep-research "report" and silently drop multi-turn history. These are the strongest agbrowse→cli-jaw finds since the 101 stability patches.
- `product-surfaces`/`interstitial` exist only in cli-jaw (200-dir, already in [201](201_webai_capability_registry_and_tools.md)) — no agbrowse→cli-jaw gap.

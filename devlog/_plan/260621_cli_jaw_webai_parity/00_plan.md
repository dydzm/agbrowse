# 260621 cli-jaw Web-AI Parity Mirror

## Objective

Bring cli-jaw's `src/browser/web-ai/` TypeScript modules to functional parity
with agbrowse's `web-ai/` JavaScript modules for the core command surface.
agbrowse owns evolution; cli-jaw mirrors stabilized pieces.

## 2026-06-25 — Bidirectional parity (numbered docs)

This folder is now the **bidirectional** agbrowse↔cli-jaw parity tracker. A
2026-06-25 cross-repo gap analysis (3 independent read-only analyzers) split the
work into two numbered series. **Docs-only — no code changes in either repo, no push.**

| Series | Direction | Docs |
| --- | --- | --- |
| **100** | agbrowse → cli-jaw (cli-jaw mirrors agbrowse) | [100 overview](100_agbrowse_to_clijaw_overview.md) · [101 stability patches 31–35](101_webai_stability_patches.md) · [102 remaining modules + OOS](102_webai_remaining_modules.md) · [103 search: cli-jaw should leverage agbrowse research](103_search_agbrowse_research_for_clijaw.md) |
| **200** | cli-jaw → agbrowse (reverse — deliberate agbrowse evolution) | [200 overview](200_clijaw_to_agbrowse_overview.md) · [201 capability-registry + tools](201_webai_capability_registry_and_tools.md) · [202 search discipline → research](202_search_discipline_to_agbrowse.md) |

**Top of each backlog:** 100 → P0 `session-artifacts` foundation, then `chatgpt-files` + response-observer; 200 → P1 declarative capability-registry cluster + annotated-screenshot + interstitial detector.

### Convergence log (analysis exhaustiveness)

The gap analysis is driven to **convergence**: parallel cross-repo sub-agent passes run repeatedly until 2 consecutive passes surface nothing new (the analysis "admits" exhaustion), capped at 5 passes. Each pass widens scope beyond the prior one.

| Pass | Scope/lens | New gaps found | Dry? |
| --- | --- | --- | --- |
| 0 | initial 3-agent analysis (web-ai modules + search), both directions | 100: 31–35 + remaining modules; 200: capability-registry cluster + 3 tools; search both ways | — |
| 0b | known-missing sweep (WIP that landed mid-analysis) | +101 #9 streaming false-complete + watcher streaming-recovery (cff76ed) | — |
| 1 | 3 agents: shared-module **line-diff** + adjacent layers (skills/browser, adaptive-fetch) + non-ChatGPT vendors | **~27 new** → [104](104_webai_shared_module_divergences.md) (18 shared/vendor, 100-dir) + [203](203_adaptive_fetch_and_misc.md) (9 fetch-ladder/misc, 200-dir) | **No** |
| 2 | 2 agents: remaining-modules sweep + completeness critic ("what did 0–1 miss?") | **2 systemic surfaces** → [105](105_systemic_parity_surfaces.md) (error-code taxonomy 33v15 + CLI flag delta 73v37 incl. inline prompt-channel); remaining-modules **near-dry** (resolved/upgraded [102](102_webai_remaining_modules.md) "verify" rows: navigation-ready→P1, tab-inspect/candidate-reconcile/session-doctor/control-summary confirmed — enrichment, ~0 brand-new) | **No** |
| 3 | 2 agents: module **dry-check** (try to break the "parity" clearance) + 2nd systemic lens | **~7 new** → [104](104_webai_shared_module_divergences.md).19–.22 (AX CDP-fallback P1, occurrenceIndex, contract-audit 7-feat, observation-bundle shape — **corrects the wrong line-44 parity clearance**) + [105](105_systemic_parity_surfaces.md).4–.6 (tier→timeout table **P1 bug**, persisted streaming fields, retryHint 34v22) | **No** |
| 4 | 2 agents: dry-check the **last un-diffed modules** (deep-research/multi-turn/tools/tab-lease/response-dom) + 3rd systemic lens | **~15 new** → [106](106_deep_research_multiturn_tooling_drift.md) (13 module gaps + 2 confirmed secondaries; **2× P1 correctness bugs** — DR saves non-reports as reports, multi-turn drops history) + [105](105_systemic_parity_surfaces.md).7–.8 (stage vocab 34v32, selector member-array drift) | **No** |
| 5 (cap) | 2 agents: **file-coverage sweep** (every file named?) + systemic **meta-sweep** (9th surface? blind spot?) | **file coverage EXHAUSTIVE / dry** (0 dark files, all 102 ABSENT claims hold, 3 doc-hygiene symbol fixes) + **1 new P3** ([105](105_systemic_parity_surfaces.md).9 `warning:` object-shape) + **named blind spot** (AbortSignal/cancellation — cli-jaw 0 hits vs agbrowse observer×6/files×1) | **Near-dry** (file-coverage dry; systemic 1 derivative P3) |

Convergence = 2 consecutive passes with **0 new gaps after dedup**. **Loop terminated at the 5-pass cap** (the user-set bound) — see Final Verdict below.

> **Pass 1 takeaway:** the initial analysis was NOT exhaustive — line-diffing shared modules surfaced 18 agbrowse→cli-jaw behavioral gaps the spot-check missed (session/model/code-mode/composer/attachments/watcher/vendor probes), and the adjacent-layer lens surfaced a whole cli-jaw→agbrowse **fetch-ladder** dimension (TLS-impersonation, yt-dlp, camoufox, feed-parser, BM25). Not converged; continue.

> **Pass 2 takeaway:** the *module* well is drying — Agent D found ~0 brand-new modules (only resolved/enriched existing 102 "verify" rows). But the completeness critic found a new *axis*: **cross-cutting contract surfaces** (error-code vocabulary, CLI flag surface) that no per-module doc tracked. Verified by direct count (agbrowse 33 codes/73 flags vs cli-jaw 15/37; the agent's flag count was corrected down — ~15 of the 36 flag-deltas are eval/policy/trace OOS). Mostly derivative of documented module gaps, but the inline `--system`/`--context` prompt-channel + `cdp.headless`/`cdp.unreachable` codes are genuinely new. Not converged (found a new surface class); Pass 3 must check for *more* systemic surfaces before declaring dry.

> **Pass 3 takeaway (important):** "dry" was premature. The module dry-check, aimed at the modules earlier passes *cleared as parity*, **falsified that clearance** — `ax-snapshot`/`observation-bundle`/`contract-audit`/`self-heal` carry real gaps, the worst being cli-jaw's missing **AX-tree CDP fallback** (throws on Playwright ≥1.55, P1) and a missing **model-tier→timeout table** (deep-research times out at 20 min not 60, P1). Both verified by grep. Lesson: a spot-check "parity" verdict is itself a claim that needs adversarial re-checking — each deeper lens still finds real bugs. New gaps per pass: 27 → 2 → 7 (non-monotone because each pass changes lens/depth, not just re-runs). Not converged. Continue; if Pass 4–5 keep finding, accept the 5-pass cap with an honest "deeper line-audit still productive" note rather than a false "admit".

> **Pass 4 takeaway (the count went UP — 27→2→7→~15):** Pass 4 finally line-diffed the modules cli-jaw **ported but never had audited** (`chatgpt-deep-research.ts`, `chatgpt-multi-turn.ts`) and found **two P1 correctness bugs** (DR persists a non-report as a "report"; multi-turn drops prior turns + corrupts indices on resume), plus tooling/tab-lease/response-dom drift and 2 more systemic vocabularies (stage, selector-arrays). **This is the honest headline: the analysis is NOT converging by the "2 dry passes" definition** — each new lens keeps surfacing real gaps because the surface is two parallel ~5–6k-line web-ai trees. The per-pass count is lens-driven, not a sign of approaching exhaustion. **Plan:** run the capped Pass 5 (a final breadth sweep of anything still un-diffed), then **stop at the cap with an explicit "exhaustion NOT proven — deeper line-audit remained productive through Pass 5" verdict**, rather than fabricate an "admit". The deliverable is then the *accumulated, verified gap catalog* (101/102/104/105/106 + 201/202/203) and an honest convergence verdict — which is the truthful answer to "are both parities fully captured?": **no, but here is the deepest catalog 5 capped passes produced, all grep-verified.**

> **Pass 5 takeaway (the well finally ran near-dry):** the file-coverage sweep came back **exhaustive** — every web-ai file on both sides is named in some doc (covered/parity/OOS), zero dark files, and all 102 "ABSENT" claims re-verified intact (only 3 stale *symbol names* fixed, no verdicts changed). The systemic meta-sweep found just **one** new surface — the P3 `warning:` object-shape vocab (105.9), itself derivative — and otherwise confirmed the 8 known surfaces hold. Most valuably, it **named the catalog's one true blind spot** (below). Pass 5 is the first pass that did NOT surface a new *module* or *correctness* gap. Per-pass: **27 → 2 → 7 → 15 → ~1**.

## Final Verdict — convergence loop terminated at the 5-pass cap (2026-06-25)

**Formally converged? NO** (the bar was 2 consecutive 0-new passes; Pass 5 still added 105.9). **Practically near-exhausted? YES** — file coverage is provably exhaustive, the module/correctness well went dry at Pass 5, and the only Pass-5 find was one derivative P3 vocabulary. The honest reading: 5 capped passes drove the analysis from "spot-check" to a **grep-verified catalog of ~60 gaps** across both directions; a 6th pass would most likely only mine the named blind spot, not new modules.

**The named blind spot (the one class no pass audited in depth):**
- **Cooperative cancellation / `AbortSignal` propagation.** cli-jaw `src/browser/web-ai/*.ts` has **0** `AbortSignal`/`AbortController`/`signal` hits; agbrowse threads `signal` through `chatgpt-response-observer.mjs` (6) + `chatgpt-files.mjs` (1). No doc audited mid-operation cancellation. *Low-confidence on severity* — partly an artifact of the two modules cli-jaw lacks entirely (observer + chatgpt-files), so it may resolve when those port. A dedicated timing/cancellation lens is the one remaining productive direction.

**Catalog summary (grep-verified, both directions):**
- **100 (agbrowse → cli-jaw):** [101](101_webai_stability_patches.md) stability 31–35 + streaming-recovery · [102](102_webai_remaining_modules.md) remaining modules (images/archive/project-sources/upload-surface/navigation-ready/tab-inspect/…) · [104](104_webai_shared_module_divergences.md) shared-module line-diff (.1–.18) + AX/observation/contract pipeline (.19–.22) · [105](105_systemic_parity_surfaces.md) 9 systemic surfaces · [106](106_deep_research_multiturn_tooling_drift.md) DR/multi-turn **P1 correctness bugs** + tooling/tab-lease/response-dom.
- **200 (cli-jaw → agbrowse):** [201](201_webai_capability_registry_and_tools.md) capability-registry cluster + tools · [202](202_search_discipline_to_agbrowse.md) search discipline · [203](203_adaptive_fetch_and_misc.md) fetch ladder (TLS-impersonation, yt-dlp, camoufox, BM25, feed-parser).
- **Highest-severity (fix first if cli-jaw acts):** 106.1/106.2/106.5 (DR/multi-turn correctness, P1), 104.19 (AX CDP fallback, P1), 105.4 (tier→timeout early-timeout, P1).

> Note: the original Phase 1–4 scope below predates the analysis. cli-jaw now
> **has** `chatgpt-tools.ts`, `chatgpt-deep-research.ts`, `chatgpt-multi-turn.ts`,
> `chatgpt-model.ts`, `cli-sessions.ts` — so those items are largely done (deep-research
> is now BEHIND, not absent; model is BEHIND on pill-wait/retry). The current,
> authoritative gap is the 100/200 series above; the section below is kept as the
> original seed.

## Scope

### Phase 1: chatgpt-model i18n + session-target-guard (C1)

**chatgpt-model.ts** — add Korean labels to `CHATGPT_SIMPLIFIED_INTELLIGENCE_OPTIONS`.
agbrowse has `['Instant', '즉시']`, `['Medium', '중간']`, `['High', '높음']`,
`['Extra High', '매우 높음']`, `['Pro Extended', 'Pro 확장', '프로 확장']`.
cli-jaw has English-only arrays.

**session-target-guard.ts** — new file. Port from agbrowse `session-target-guard.mjs`:
- `normalizeWebAiVendor()`
- `sanitizeSessionCandidate()`
- `activeProviderSessionCandidates()`
- `resolveImplicitSessionSelection()`
- `ambiguousSessionTargetError()`
- `sessionPollRecoveryCommand()` (adapted for cli-jaw CLI)
- `buildTargetMismatchResult()`

### Phase 2: chatgpt-tools + chatgpt-deep-research (C2)

**chatgpt-tools.ts** — new file. Port from agbrowse `chatgpt-tools.mjs`:
- `TOOL_ALIASES`, `TOOL_LABELS`, `PLUGIN_LABELS`
- `resolveChatGptComposerToolRequests()`
- `selectChatGptComposerTools()`
- Intent heuristics (`looksLikeImageGeneration`, `looksLikeDeepResearch`, etc.)

**chatgpt-deep-research.ts** — new file. Port from agbrowse `chatgpt-deep-research.mjs`:
- `DEEP_RESEARCH_SELECTORS`
- `autoConfirmPlan()`
- `sendDeepResearch()`
- Helper functions (countAssistants, readLatestAssistant, isStreaming, etc.)

### Phase 3: chatgpt-multi-turn (C1)

**chatgpt-multi-turn.ts** — new file. Port from agbrowse `chatgpt-multi-turn.mjs`:
- `sendMultiTurn()`
- `renderMultiTurnTranscript()`
- Types: `TurnResult`, `MultiTurnResult`

### Phase 4: CLI surface + integration (C2)

**bin/commands/browser-web-ai.ts** — no new CLI commands yet (agbrowse-owned
surfaces like `snapshot`, `eval`, `mcp-server` stay agbrowse-only). Only wire
existing `send`/`query` to use the new modules when flags are provided:
- `--tool <name>` / `--auto-tools` flags → chatgpt-tools
- `--research deep` flag → chatgpt-deep-research
- `--follow-up <text>` flag → chatgpt-multi-turn
- Implicit session resolution via session-target-guard on `poll`/`stop`

## Out of Scope

- chatgpt-attachments multi-file batch (PRD32.7 Phase B — deferred, agbrowse-owned)
- code-mode is already mirrored in cli-jaw
- eval, mcp-server, project-sources commands (agbrowse-only)
- policy/, trace/, claim-audit (agbrowse-only infrastructure)
- No git push

## Verification

- `npx tsc --noEmit` in cli-jaw
- Run existing unit tests: `npm test -- tests/unit/browser-web-ai-*.test.ts`
- New unit tests for session-target-guard, chatgpt-tools resolver, chatgpt-model i18n

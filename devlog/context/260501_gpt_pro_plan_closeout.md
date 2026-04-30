Reviewed updated devlog and prior source bundle.  

## Phase 1 — Sessions

* **Mirror correctness:** Mostly correct. cli-jaw already has `createSession`, `getSession`, `findSessionByTarget`, `listSessions`, `updateSessionStatus`, `updateSessionResult`, `assertSameTarget`, and `WrongTargetError`, but it uses `randomUUID()`, not ULID. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/session.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/session.ts)]
* **Mirror correction:** cli-jaw has `sessions`, `watch`, `watchers`, `notifications`, and `capabilities` CLI commands, plus `--session`; it does **not** have `resume`, `reattach`, `prune`, `--deadline`, or `--navigate`. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/bin/commands/browser-web-ai.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/bin/commands/browser-web-ai.ts)]
* **Mirror correction:** HTTP has `/web-ai/sessions`, `/web-ai/watch`, `/web-ai/watchers`, `/web-ai/notifications`, but no `/sessions/prune` route. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts)]
* **Sequencing under dual-repo:** agbrowse-first still works, but Phase 1 should explicitly say “agbrowse ports/adapts cli-jaw’s session model,” not greenfield; cli-jaw PR1 only adds lock/prune/sort/fallback gaps.
* **Single-line risk:** Concurrent session writes clobber JSON; catch with 25 parallel create/update calls against a temp store.

## Phase 2 — Errors

* **Mirror correctness:** Correct direction. cli-jaw currently uses `stageError(...)` in `chatgpt.ts` and `toWebAiHttpError(e)` in `routes/browser.ts`; replacing those with `WebAiError.toJSON()` is the right mirror. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/chatgpt.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/chatgpt.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts)]
* **Mirror correction:** Preserve cli-jaw’s existing structured errors, not just `stageError`: `WrongTargetError`, `BrowserCapabilityError`, and `ProviderRuntimeDisabledError` should become distinct `errorCode`s. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/session.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/session.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/primitives.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/primitives.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/provider-adapter.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/provider-adapter.ts)]
* **Mirror correction:** cli-jaw also has `toWebAiErrorEnvelope` in diagnostics; Phase 2 should either delete it after `WebAiError` lands or make it delegate to the new serializer. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/diagnostics.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/diagnostics.ts)]
* **Sequencing under dual-repo:** agbrowse-first is correct for PR1; before cli-jaw PR1, align `WebAiError.stage` with cli-jaw’s `WebAiFailureStage` names so HTTP parity is painless.
* **Single-line risk:** HTTP and CLI emit different error shapes; catch with one forced wrong-tab failure through agbrowse CLI and cli-jaw `/api/browser/web-ai/status`.

## Phase 3 — Capabilities

* **Mirror correctness:** cli-jaw is the leader here. `capability-registry.ts`, `capability-types.ts`, schema rows, `listCapabilitySchemas`, `lookupCapability`, and `requireCapabilityOrFailClosed` exist. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/capability-registry.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/capability-registry.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/capability-types.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/capability-types.ts)]
* **Mirror correction:** The phase still has ID drift: agbrowse plan proposes dot IDs like `chatgpt.model.alias-selectable`; cli-jaw registry uses hyphenated IDs like `chatgpt-model-selection`, `chatgpt-active-tab-verification`, `web-ai-session-lifecycle`. Pick cli-jaw’s IDs or add an explicit alias map; do not ship both. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/capability-registry.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/capability-registry.ts)]
* **Mirror correctness:** `/api/browser/web-ai/capabilities` exists and CLI has `capabilities`, `--family`, and `--frontend-status`; `status` does not yet embed `capabilities[]`, so that part is correctly marked as Phase 3 work. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/bin/commands/browser-web-ai.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/bin/commands/browser-web-ai.ts)]
* **Sequencing under dual-repo:** cli-jaw-first is correct; agbrowse should port the registry/schema shape before implementing provider probes.
* **Single-line risk:** Capability IDs diverge between repos; catch with a shared snapshot test of canonical IDs.

## Phase 4 — Diagnostics / Doctor

* **Mirror correctness:** cli-jaw already has `diagnostics.ts`, `captureWebAiDiagnostics`, `redactDiagnosticText`, `normalizeFailureStage`, and `toWebAiErrorEnvelope`; the phase correctly says “extend,” not “build from scratch.” [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/diagnostics.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/diagnostics.ts)]
* **Mirror correctness:** HTTP `/api/browser/web-ai/diagnose` and CLI `diagnose` exist. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/bin/commands/browser-web-ai.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/bin/commands/browser-web-ai.ts)]
* **Mirror correction:** Make the close-out decision now: keep `diagnose` as a deprecated alias and add `doctor`; do **not** rename-only.
* **Sequencing under dual-repo:** cli-jaw-first for report shape; agbrowse can implement `dom-hash.mjs` first, but final JSON schema should come from cli-jaw’s existing diagnostics contract.
* **Single-line risk:** Doctor leaks prompt/account text; catch with fake DOM containing emails/tokens and assert default report stays redacted and capped.

## Phase 5 — Adoption

* **Mirror correctness:** The runtime-owner claims are accurate at cli-jaw commit `3d54c1f`: `connection.ts` imports `createExternalBrowserRuntime`, `createJawOwnedBrowserRuntime`, tracks `runtimeOwner`, and starts `ensureIdleReaperStarted`; `runtime-owner.ts` defines the idle timeout and owner model. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/connection.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/connection.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/runtime-owner.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/runtime-owner.ts)]
* **Mirror correction:** `--port-strict` and `--reuse-foreign-chrome` do not yet exist in cli-jaw route parsing or CLI options; Phase 5 must add them to `resolveBrowserStartOptions`, browser-start command plumbing, and `launchChrome`. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/bin/commands/browser-web-ai.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/bin/commands/browser-web-ai.ts)]
* **Mirror correction:** Profile lock is not already solved by runtime-owner; runtime-owner is in-process/runtime-state, while `profile.lock` is the cross-process guard. Keep both.
* **Sequencing under dual-repo:** Phase 5 PR1 should start in cli-jaw because production runtime-owner/idle-reaper semantics are richer; churn-log PR2 can be agbrowse-first after doctor schema lands.
* **Single-line risk:** False-positive foreign-profile refusal breaks legitimate reuse; catch with fake CDP `/json/version` + persisted owner cases for same/foreign/override.

## Phase 6 — Watcher

* **Mirror correctness:** Correct: cli-jaw is source of truth. `watcher.ts` has `startWebAiWatcher`, `resumeStoredWebAiWatchers`, active watcher listing, serialized polling, stale-session handling, and completion persistence. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/watcher.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/watcher.ts)]
* **Mirror correctness:** Notifications exist through `notifications.ts` and `sendChannelOutput`; the wording “channel send endpoint” should be softened to “channel send helper/path” unless you separately cite the HTTP route. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/notifications.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/notifications.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/messaging/send.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/messaging/send.ts)]
* **Mirror correctness:** `/web-ai/watch` and `/web-ai/watchers` routes and CLI `watch`/`watchers` exist. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/routes/browser.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/bin/commands/browser-web-ai.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/bin/commands/browser-web-ai.ts)]
* **Sequencing under dual-repo:** cli-jaw-first is mandatory; agbrowse should probably not implement Phase 6 until real demand beats “cron calls `sessions resume`.”
* **Single-line risk:** Watcher loops poll two headed sessions concurrently and corrupt active tab state; catch with serialized `pollOnce` test like `WEB-AI-WATCH-007`. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/tests/unit/browser-web-ai-watcher.test.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/tests/unit/browser-web-ai-watcher.test.ts)]

## A. Plan close-out

* **Missing but non-blocking:** Phase 3 must lock canonical capability ID format; absorb in Phase 3 before PR1.
* **Missing but non-blocking:** Phase 4 must state `diagnose` remains as deprecated alias for `doctor`; absorb in Phase 4 PR2.
* **Missing but non-blocking:** Phase 5 must explicitly add cli-jaw browser-start route/CLI plumbing for `--port-strict` and `--reuse-foreign-chrome`; absorb in Phase 5 PR1.
* **Proceed:** none of these block Phase 2 PR1.

## B. First action of Phase 2 PR1

1. `web-ai/errors.mjs` — create `WebAiError`, `wrapError`, `providerError`, `contextError`, and `toErrorJson` with the Phase 2 catalog shape.
2. `web-ai/cli.mjs` — split `runWebAiCli` into wrapper + inner, import `wrapError`, emit JSON/human failure output, and set `err.alreadyReported`.
3. `bin/agbrowse.mjs` — update the top-level catch to suppress duplicate printing when `err.alreadyReported` is true.

## C. Cross-repo error-shape parity check

* **`WrongTargetError` → `session.target-mismatch` or `cdp.target-mismatch`:** preserve `expectedTargetId` and `actualTargetId`. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/session.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/session.ts)]
* **`BrowserCapabilityError` → `capability.unsupported`:** preserve `capabilityId`, `stage`, `mutationAllowed`, and `ownerPrd` when present. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/primitives.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/primitives.ts)] [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/capability-registry.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/capability-registry.ts)]
* **`ProviderRuntimeDisabledError` → `provider.runtime-disabled`:** preserve `vendor` and `stage`; this is not the same as a random internal error. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/provider-adapter.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/provider-adapter.ts)]
* **`toWebAiErrorEnvelope` is serializer parity, not a throw site:** convert it to delegate to `WebAiError.toJSON()` or delete after all HTTP routes use the new shape. [Source: [https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/diagnostics.ts](https://github.com/lidge-jun/cli-jaw/blob/3d54c1f/src/browser/web-ai/diagnostics.ts)]

## D. One-paragraph signoff

This plan is closed and Phase 2 starts on agbrowse `web-ai/errors.mjs` because the dual-repo mirror is now coherent enough: Phase 2 PR1 is low-risk, source-local, and creates the shared failure contract that Phase 1 sessions, Phase 3 capabilities, Phase 4 doctor, and cli-jaw HTTP parity all need. The only close-out edits are non-blocking devlog clarifications for later phases, not reasons to delay `WebAiError` core.

# 35 — Session Reattach Follow-up PABCD

Date: 2026-06-24 (agbrowse v0.1.15)
Status: PABCD plan — **impl-ready** (코드-진실 확인 완료)
Parent: [04_session_reattach.md](04_session_reattach.md) · Sibling: [31](31_chatgpt_downloadable_artifacts_pabcd.md) / [32](32_deep_research_session_followup_pabcd.md) / [33](33_response_capture_dualpath_pabcd.md) / [34](34_dom_diagnostics_pabcd.md)

## 2026-06-24 재감사 (v0.1.15)

`04_session_reattach.md`의 핵심 reattach/resume는 이미 구현됨 — 잔여 2개 OPEN 항목만 코드 대조로 확인:

- **이미 구현(재활용 대상)**: `sessions resume`(`web-ai/cli-sessions.mjs:91`, 표준 `pollFn` 재실행) / `sessions reattach`(`:114`, `resolveSessionPage` + `session.conversationUrl || session.originalUrl` `:119`, status `reattached`/`reattach-mismatch`/`reattach-failed`). `resolveSessionPage`/`withSessionPage`(`web-ai/tab-recovery.mjs`), session-store `conversationUrl`/`originalUrl` 영속(`web-ai/session-store.mjs:17-18`).
- **35.1 Sidebar 대화 검색-열기**: `openConversationFromSidebar`/sidebar-search → web-ai **0 hits**. conversationUrl 직접 nav가 대화를 못 띄울 때(드리프트/새 탭) sidebar에서 conversationId/prompt-preview로 검색-열기하는 fallback **부재**.
- **35.2 Deep Research reattach**: `researchMode: 'deep'`는 영속됨(`web-ai/chatgpt-deep-research.mjs:210` `updateSession(..., { researchMode:'deep' })`)지만, `resume`(`cli-sessions.mjs:91-113`)는 **모드 분기 없이** 항상 일반 `pollWebAi`를 돌린다 → 진행 중 Deep Research 리포트를 올바르게 캡처하지 못함. DR-aware resume 경로 **부재**.

> 04의 `SIGINT 시 Chrome 유지`는 connect-over-CDP 모델에서 대체로 무의미(web-ai가 Chrome 비소유) — 본 계획 범위 밖.

## Purpose

Oracle의 reattach는 (a) 대화가 열려있지 않으면 sidebar에서 검색-열기(retry 포함), (b) Deep Research 모드도 reattach해 진행 중 리포트를 캡처한다(`04` 원본 `reattach.ts`/`openConversationFromSidebarWithRetry`). agbrowse는 conversationUrl 기반 reattach/resume는 있으나 이 두 fallback이 없다. 이 계획은 **기존 `resolveSessionPage`/`resume`/`reattach`를 재사용**하면서 두 OPEN 항목만 보강한다. 신규 명령 표면은 추가하지 않는다.

## Priority Map

| ID | Priority | Outcome |
| --- | --- | --- |
| 35.1 | P1 | Sidebar conversationId 검색-열기 fallback (retry) — reattach/resume 복구 경로 |
| 35.2 | P1 | `resume`가 `researchMode:'deep'` 감지 시 DR-aware 캡처로 라우팅 (32.1 재사용) |

## P — Plan

### Part 1 — Easy Explanation

세션을 다시 이어붙일 때, 저장된 대화 URL로 바로 못 여는 경우가 있다(탭이 다른 대화로 바뀌었거나 닫힘). 그럴 때 ChatGPT 왼쪽 사이드바에서 그 대화를 conversationId/프롬프트 미리보기로 찾아 직접 연다(몇 번 재시도). 또한 Deep Research로 시작했던 세션을 resume하면, 일반 응답 대기가 아니라 Deep Research 리포트 캡처 경로로 이어받아야 한다.

### Part 2 — Diff-level Precision

## 35.1 — Sidebar Conversation Search-Open

#### NEW `web-ai/chatgpt-sidebar.mjs`

`cli-sessions.mjs`/`tab-recovery.mjs`를 키우지 말고 신규 모듈로 분리.

Exports:

```js
// conversationId 또는 prompt preview로 sidebar 항목을 찾는 순수-ish DOM 리더.
// 반환: { found: true, handle } | { found: false }
export async function findSidebarConversation(page, { conversationId, promptPreview } = {}) {}

// 위를 retry로 감싸 클릭-열기. 반환: { opened: true, conversationUrl } | { opened: false, reason }
export async function openConversationFromSidebar(page, { conversationId, promptPreview, timeoutMs = 15_000 } = {}) {}
```

Required behavior:

- sidebar nav 항목을 `href`의 conversationId 또는 표시 텍스트(prompt preview)로 매칭. ChatGPT sidebar 셀렉터는 코드에 없으므로 신규 정의(테스트는 fake DOM으로).
- `openConversationFromSidebar`는 bounded retry(예: 1.5s 간격, `timeoutMs` 데드라인) — 사이드바가 lazy-load/가상화될 수 있음.
- 열기 성공 시 URL이 대상 conversationId로 바뀌었는지 검증(`urlsCompatible` 재사용, `tab-recovery.mjs`).
- 절대 다른 대화를 열지 않음 — 매칭 실패 시 `{opened:false, reason:'conversation-not-in-sidebar'}` 반환(throw 아님).

#### MODIFY `web-ai/cli-sessions.mjs`

`reattach`(`:114`) / `resume`(`:91`)에서 `resolveSessionPage`가 `mismatch`/대화 부재를 반환할 때 fallback으로 `openConversationFromSidebar`를 시도(현재는 `--navigate`일 때만 nav).

Rules:

- fallback은 **명시 게이트** 하에서만(예: `--recover-sidebar` 또는 기존 `--navigate` 확장) — 기본은 fail-closed 유지.
- 성공 시 status `reattached`(via-sidebar), 실패 시 기존 `reattach-mismatch`/`reattach-failed` 보존.
- 32.3의 `isSafeChatGptConversationUrl` 가드와 충돌 없이 — 열린 URL이 저장 conversationId와 일치할 때만 수락.

#### NEW `test/unit/web-ai-chatgpt-sidebar.test.mjs`

- `findSidebarConversation`: conversationId href 매칭, promptPreview 텍스트 매칭, 미존재 시 found:false.
- `openConversationFromSidebar`: retry 후 성공, 데드라인 초과 시 opened:false, 매칭 실패 시 다른 대화 안 엶, throw 안 함.

## 35.2 — Deep Research Reattach

#### MODIFY `web-ai/cli-sessions.mjs` (`resume`, `:91-113`)

`getSession(id)` 직후 `session.researchMode === 'deep'`이면 일반 `pollFn` 대신 DR-aware 경로로 분기.

```js
if (session.researchMode === 'deep') {
  // withSessionCommandLock + withSessionPage 재사용, pollWebAi 대신
  // 32.1의 target-scoped 캡처로 진행 중/완료 리포트 수집
  return resumeDeepResearch(deps, id, input);
}
```

#### MODIFY `web-ai/chatgpt-deep-research.mjs`

`sendDeepResearch`(`:207`) 내부의 완료-대기/추출 로직(32.1에서 `extractResearchReport` 리팩터 대상)을 **resume에서도 호출 가능하게** 분리:

```js
// 새 프롬프트 전송 없이, 이미 진행 중인 Deep Research를 이어받아 리포트만 수집.
export async function resumeDeepResearch(deps, sessionId, input) {}
```

Rules:

- 새 프롬프트를 보내지 않는다 — 기존 대화의 진행 중/완료 리포트만 캡처.
- 32.1의 target-scope/incomplete-report 거부 규칙을 그대로 적용(둘은 같은 캡처 코어 공유).
- 완료 전이면 기존 `sendDeepResearch` 타임아웃 의미(`timeoutMs` 기본 1_200_000) 재사용.
- session artifact 저장 계약(`session-artifacts.mjs`) 보존.
- 32.1 미구현 상태에서 착수 시: 현재 `extractResearchReport`를 호출하는 thin resume를 먼저 만들고, 32.1 리팩터 후 캡처 코어를 공유하도록 좁힌다.

#### MODIFY `test/unit/web-ai-sessions-command.test.mjs` + `test/unit/web-ai-chatgpt-deep-research.test.mjs`

- `resume`가 `researchMode:'deep'` 세션에서 DR 경로로 분기(일반 `pollWebAi` 호출 안 함) — fake session.
- `resumeDeepResearch`가 새 프롬프트를 보내지 않고 리포트만 수집.
- 비-deep 세션 resume는 기존 동작 유지(회귀).

## A — Plan Audit Checklist

- sidebar fallback이 **다른 대화를 절대 열지 않음**(conversationId 일치 검증, fail-closed).
- 신규 명령 표면 없음 — 기존 `resume`/`reattach` 재사용.
- DR resume가 **새 프롬프트를 보내지 않음**(이중 실행 방지).
- 32.1/32.3과 캡처/가드 코어 공유 — 중복 구현 없음.
- 신규 모듈 < 500 lines; `cli-sessions.mjs`/`chatgpt-deep-research.mjs` 증가 통제.
- 비-deep resume·기존 reattach 동작 회귀 없음.

## B — Build Slices

1. `chatgpt-sidebar.mjs` 순수 매칭 + retry open + 테스트.
2. `reattach`/`resume`에 sidebar fallback 게이트 연결.
3. `chatgpt-deep-research.mjs`에 `resumeDeepResearch` 분리(32.1 캡처 코어 재사용/선행 thin 버전).
4. `resume`의 `researchMode:'deep'` 분기.
5. 포커스 테스트.
6. release gates + 타깃 테스트.

## C — Check

Minimum:

```bash
npx vitest run test/unit/web-ai-chatgpt-sidebar.test.mjs test/unit/web-ai-sessions-command.test.mjs test/unit/web-ai-chatgpt-deep-research.test.mjs
npm run test:release-gates
git diff --check
```

CLI help/플래그(`--recover-sidebar` 등) 표면이 바뀌면:

```bash
npm run gate:all
```

라이브 검증(수동): 진행 중 Deep Research 세션을 CLI 종료 후 `sessions resume <id>`로 리포트 회수; 대화 탭을 다른 대화로 바꾼 뒤 `reattach`가 sidebar로 복구.

## D — Done Criteria

- conversationUrl 직접 nav 실패 시 sidebar 검색-열기로 정확한 대화만 복구(fail-closed).
- `researchMode:'deep'` 세션 resume가 새 프롬프트 없이 Deep Research 리포트를 캡처.
- 기존 reattach/resume·비-deep 경로 회귀 없음.
- 신규 동작 단위 테스트 커버; 라이브 항목은 수동 프로토콜 명시.
- `structure/str_func.md` count snapshot 갱신, `bash structure/verify-counts.sh` 통과.
- 32.1(DR target-scope) 의존성 명시 — 독립 착수 가능하나 캡처 코어는 32.1과 합류 권장.

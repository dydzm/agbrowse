# 30 — Phase 20 구현 계획: web-AI 골든 시나리오 하드닝

status: DONE (2026-07-05) / work-phase: gapclose 기능 트랙 Phase 20

## A-audit 반영 (FAIL → 수정)

1. 파일명 컨벤션: `web-ai-golden-scenario.test.mjs` (기존 `web-ai-*` prefix 준수).
2. `createFakeChatGptPage`는 파일 로컬 — 리포 컨벤션대로 새 테스트 파일에
   로컬 복제 (helpers 승격은 비목표).
3. F1: `resolveChatGptComposerTarget`가 이미 `provider.composer-not-visible`
   / stage `composer-prereq`를 throw (`chatgpt.mjs:858-877`). fake page의
   `isVisible`을 toggle 가능하게 변형.
4. F2: `pollWebAi`는 async reject — `await expect(...).rejects` 사용.
5. F3: `applyRequiredSourceAudit` (cli.mjs:843 exported)를 직접 사용.
   기존 `web-ai-source-audit-enforcement.test.mjs`와 중복 금지 — 골든
   시나리오 맥락(완료 응답에 audit 적용) 통합 관점만 추가.
6. F4: timeout 브랜치 명시 — recovery 무산출 시 `ok:false, status:'timeout',
   recoverable:true, retryHint:'poll-or-resume'` (chatgpt.mjs:645-683)를
   계약으로 고정.

## Loop-spec

- Loop archetype: spec-satisfaction repair (verifier = vitest)
- Trigger: 06_gap_webai_showcase.md 결정 (코드/테스트 하드닝 파트)
- Goal: "ask → poll → audit → artifact" 골든 시나리오가 fixture 수준에서
  전 구간 재현 가능하고, 4대 실패 모드가 각각 명시적 envelope로 떨어짐을
  회귀 테스트로 고정.
- Non-goals: README/카피/데모 녹화 (런칭 트랙 100/110), 라이브 provider
  스모크 (로그인 세션 필요 — 기존 post-action/self-heal 스모크와 동일하게
  live-gated), provider selector 변경.
- Verifier: `npx vitest run test/integration/web-ai-golden-scenario.test.mjs`
  green + 기존 스위트 회귀 없음.
- Stop: 시나리오 + 실패 모드 4종 테스트 green. 동일 실패 2회 → root-cause.

## 현재 자산 (읽은 코드)

- `test/integration/web-ai-fake-chatgpt.test.mjs`: fake ChatGPT page fixture
  (createFakeChatGptPage) — queryWebAi 해피패스 검증 완료. 이걸 골든
  시나리오의 기반으로 재사용.
- `web-ai/failure-diagnostics.mjs`: 스테이지 taxonomy + typed envelope
  (`toWebAiErrorEnvelope`) — 단위 테스트 존재.
- `web-ai/source-audit.mjs` `auditSources` + cli.mjs `--require-source-audit`
  (fail-closed 경로 line 844+).
- `web-ai/answer-artifact.mjs` `withAnswerArtifact` / `artifactFromPollResult`.
- `web-ai/chatgpt.mjs` pollWebAi: baseline 없으면 `provider.poll-timeout`
  WebAiError, timeout 경로에 failure diagnostics 캡처.

## 파일 변경 맵

| 파일 | 변경 | 내용 |
| --- | --- | --- |
| `test/integration/web-ai-golden-scenario.test.mjs` | NEW | 골든 시나리오 E2E(fixture) + 실패 모드 4종 |
| `devlog/_plan/260705_gapclose/30_phase20_golden_impl.md` | THIS | 계획 + D 결과 |

프로덕션 코드는 원칙적으로 무변경 — 이 페이즈는 "이미 되는 것"을 계약으로
고정하는 하드닝이다. 테스트 작성 중 실제 갭이 드러나면 스코프 편차로
표면화하고 최소 수정.

## 골든 시나리오 (fixture 레벨)

```
1. ask    — queryWebAi(fake page): 프롬프트 전송, baseline 기록
2. poll   — 응답 안정화까지 관찰 (fake는 waitForTimeout에서 완료)
3. audit  — auditSources(answerText)로 소스 감사 (인라인 출처 유/무)
4. artifact — answerArtifact 필드 계약 (provider/text/exactness/stability)
```

## 실패 모드 계약 (각각 명시적 envelope)

| # | 실패 모드 | 기대 계약 |
| --- | --- | --- |
| F1 | send 실패 (composer 불가시) | WebAiError typed envelope, stage=composer-prereq, ok:false |
| F2 | poll baseline 없음/타임아웃 | errorCode `provider.poll-timeout`, retryHint 존재 |
| F3 | source audit 불통과 | `--require-source-audit` 경로 fail-closed (ok:false + audit 상세) |
| F4 | 응답 무JSON/무텍스트 산출물 | answerArtifact 부재 시 명시 status, 조용한 성공 금지 |

## 결과 (D에서 추기)

- 구현: `test/integration/web-ai-golden-scenario.test.mjs` — 골든 패스
  1개 + 실패 모드 4개, 5 테스트 green. 프로덕션 코드 무변경 (순수 하드닝).
- 골든 패스: queryWebAi(fake) → complete → `applyRequiredSourceAudit`
  통과 → answerArtifact/baseline/traceSummary 계약 검증.
- F1: composer 불가시 → `provider.composer-not-visible` / stage
  `composer-prereq` typed WebAiError, send 미발생 확인.
- F2 (계획 편차, 명시): "baseline 없음 reject" 대신 실제 도달 가능한
  브랜치인 conversation-mismatch 명시 envelope(ok:false, status:
  'conversation-mismatch', 경고 포함)를 계약으로 고정 — 골든 테스트가
  남긴 baseline 때문에 store가 비어있지 않은 것이 현실 조건이고, 어느
  쪽이든 "조용한 성공 금지"가 본질이다.
- F3: 무출처 완료 응답 → `source-audit.failed` / gaps에 unsourced-claims.
- F4: 무한 thinking → ok:false, status:'timeout', recoverable:true,
  retryHint:'poll-or-resume' (no-recovery 브랜치).
- 전체 스위트: 1207 passed | 5 skipped, 실패 2건은 기존 라이브 브라우저
  스모크(post-action/self-heal)로 본 변경과 무관 (Phase 10 D에서 검증됨).

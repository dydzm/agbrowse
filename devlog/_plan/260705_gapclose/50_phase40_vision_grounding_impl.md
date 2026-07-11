# 50 — Phase 40 구현: vision-click 좌표 grounding 보강 (DONE)

status: DONE / 작성: 2026-07-06 / 계획: `11_phase40_vision_click_grounding.md`

40-A(좌표 계약 하드닝)와 40-B(two-pass zoom refinement 기본화)를 구현하고,
canvas 전용 QA 픽스처로 실측 검증까지 마쳤다. 구현은 gpt-5.5 worker
서브에이전트, 독립 리뷰는 gpt-5.5 reviewer가 수행했고, 리뷰 FAIL 판정
2건(High/Medium)을 메인 세션에서 수정 후 재검증했다.

---

## 구현 내용

### 40-A 좌표 계약 하드닝

- `buildCoordPrompt`가 `options.imageSize {width,height}`를 받아 "이미지는
  정확히 WxH 픽셀, 그 좌표계(좌상단 0,0)로 답하라"를 프롬프트에 명시.
  모든 codexVision 호출(1-pass, verify-pass)이 imageSize를 전달한다.
  imageSize = (clip ? clip : viewport) × dpr — 스크린샷 파일의 실제 픽셀.
- `coordChain` 로깅: capture(path/viewport/dpr/clip/imageSize) → model
  (point/bbox/confidence) → refined(verify-pass 전 체인) → css → click.
  stderr에 `coord-chain: {json}` 한 줄로 항상 출력, `--json` 플래그면
  stdout 결과 객체에도 포함. offset 계열 버그가 재현 가능해졌다.

### 40-B two-pass zoom refinement 기본화

- verify crop pass(280x200 crop 재캡처 → 2차 좌표 → remap)가 **기본
  경로**. `--no-verify`로만 끌 수 있고, low-confidence(<0.75) 후보는
  `--no-verify`여도 클릭하지 않고 `LOW_CONFIDENCE_REQUIRES_VERIFY`로
  fail-closed.
- 실패 사유는 전부 기계 판독 가능 접두어: `VERIFY_MISMATCH:`,
  `INVALID_CANDIDATE:`, `LOW_CONFIDENCE_REQUIRES_VERIFY:`. 미검증 좌표로
  조용히 폴백하는 경로 없음.
- `--verify-before-click`은 deprecated no-op alias로 유지 (호환).

## QA — canvas 픽스처 실측

`test/fixtures/vision-qa/canvas-targets.html`: DOM ref가 전혀 없는 canvas에
ground-truth 타겟 8개(대형 버튼~18px 아이콘)를 그리고 클릭 명중을
`window.__lastHit`으로 판정. `run-qa.sh`가 루프 실행.

| 시점 | 결과 |
| --- | --- |
| 보강 전 (단일 pass, 검증 없음) | "green Play button" → (89,81) 클릭, **miss** (정답 160,140) |
| 보강 후 (two-pass 기본) | **8/8 명중** — play, stop, settings(44px), save, tiny-x(18px), zoom-in/out(32px), upload |

Retina DPR=2, 1280x701 viewport, file:// 로컬 페이지. 소요 ~20s/클릭
(codex 2회 호출). tiny-x 18px 타겟까지 명중한 것이 two-pass 효과의 직접
증거다.

## Computer Use 플러그인 비교 (참고 관측)

동일 픽스처를 Codex 앱 Computer Use 플러그인(macOS 접근성 트리 + 스크린샷
좌표 클릭)으로 4타겟 시도 → 4/4 명중 (play, settings, tiny-x, zoom-out).
관측된 차이:

- Computer Use는 스크린샷 픽셀 좌표를 받아 자체 좌표 변환으로 클릭 —
  좌표 공급자(호출자)가 grounding을 책임진다. canvas라 접근성 트리에는
  타겟이 안 잡혔고, 좌표 클릭 fallback만 유효했다.
- 앱/창 단위 타게팅이라 agbrowse CDP Chrome(별도 프로필)과 사용자 Chrome을
  구분하는 데 수동 조작이 필요했다 (중간에 사용자 Chrome pid로 붙어
  Passwords 앱 오픈 사고 1회). agbrowse의 탭/CDP 단위 타게팅이 브라우저
  자동화에서는 더 결정적이다.
- 결론: 브라우저 내부 클릭은 agbrowse 레인(ref 우선, vision-click
  fallback)이 우위. OS 네이티브 앱 조작은 Computer Use 소관 — 경쟁이
  아니라 상호보완으로 판정.

## 검증 기록

- `npx vitest run test/unit/vision-core.test.mjs` — 28/28 pass
  (imageSize 프롬프트, --no-verify/--json/--verify-before-click 파싱,
  computeImageSize 헬퍼 포함).
- `npx vitest run test/unit` — 1092/1092 pass (전 스위트 무회귀).
- `npm run typecheck:checkjs` — vision 파일 에러 0 (베이스라인 24는
  web-ai/chatgpt-model.mjs 기존 이슈, 이번 변경과 무관).
- 독립 리뷰(gpt-5.5): 최초 VERDICT FAIL — (H) coordChain null 추론으로
  typecheck 회귀, (M) validate throw가 coord-chain envelope 우회, (L)
  행동 계약 테스트 갭. H/M 수정 완료·재검증, L은 아래 잔여 항목.
- 라이브 QA: 위 8/8 표.

## 잔여 / 후속

- (L) `visionClick` 행동 계약 통합 테스트(mock codex로 VERIFY_MISMATCH,
  --json envelope 검증)는 미작성 — 다음 사이클 후보.
- 40-C SoM/ID overlay 실험 플래그는 착수 안 함 (계획대로 옵션).
- grounding 전용 모델 backend는 DEFER 유지 — 8/8 실측으로 재검토 트리거
  (10타겟 중 8+ 미달) 미발동.
- `.agents/skills/vision-click/` 미러 복사본은 리포보다 구세대 —
  스킬 배포 동기화는 별도 작업.

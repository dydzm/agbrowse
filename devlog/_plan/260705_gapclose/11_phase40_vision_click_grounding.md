# 11 — Phase 40 제안: vision-click 좌표 grounding 보강

status: PROPOSED / 작성: 2026-07-06 / 리서치: gpt-5.5 서브에이전트 1기
(공식 문서 + ScreenSpot leaderboard 원자료 검증) + 로컬 코드 리딩

vision-click(`skills/vision-click/`)은 현재 "스크린샷 → generic GPT vision에
`{found, x, y}` JSON 요구 → DPR 나누기 → 클릭" 구조다. 이 방식이 왜
부정확한지, 메이저 랩과 오픈소스는 어떻게 하는지 조사한 결과, **정확도
열위는 프롬프트 문제가 아니라 구조 문제**로 판정한다. 다만 backend 교체
없이도 닫을 수 있는 격차가 절반 이상이라 Phase 40으로 승격할 가치가 있다.

---

## 왜 지금 부정확한가 (진단)

1. **generic VLM의 raw 좌표 출력은 구조적으로 약하다.** ScreenSpot-v2에서
   GPT-4o는 20.1%, grounding 특화 모델(Qwen2.5-VL-7B 86.5%, OS-Atlas-7B
   83.3%, UGround-7B 76.3%)과 4배 이상 격차. 고해상도 ScreenSpot-Pro에서는
   GPT-4o 0.8%로 사실상 무작위. 🟢
   > 출처: [ScreenSpot-v2 leaderboard](https://gui-agent.github.io/grounding-leaderboard/results/screenspot_v2.json)
   > 출처: [ScreenSpot-Pro leaderboard](https://gui-agent.github.io/grounding-leaderboard/results/screenspot_pro.json)
2. **원인은 학계에서도 규명돼 있다.** coordinate-regression은 vision
   patch 단위와 dense 좌표 공간의 mismatch, 약한 spatial-semantic
   alignment 문제를 가진다 (GUI-Actor, MolmoPoint 분석). 🟢
   > 출처: [GUI-Actor (Microsoft Research)](https://www.microsoft.com/en-us/research/publication/gui-actor-coordinate-free-visual-grounding-for-gui-agents/)
   > 출처: [MolmoPoint-GUI-8B](https://huggingface.co/allenai/MolmoPoint-GUI-8B)
3. **좌표계 계약이 느슨하다.** 현재 프롬프트는 모델에게 이미지
   width/height를 알려주지 않고, codex CLI가 이미지를 내부적으로
   downscale하는지 여부도 통제/로깅하지 않는다. Anthropic·OpenAI 공식
   문서 둘 다 "모델이 본 이미지 좌표계와 클릭 좌표계의 일치"를 정확도의
   1번 조건으로 명시한다. 🟢
   > 출처: [Anthropic computer use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
   > 출처: [OpenAI computer use guide](https://platform.openai.com/docs/guides/tools-computer-use)

## 메이저 랩은 어떻게 하나 (공개된 구현 방식)

- **Anthropic computer-use**: 모델이 `tool_use`로 action+좌표를 내면
  클라이언트가 실행. 정확도 처방은 (a) 직접 resize하고
  `display_width_px/height_px`를 그 크기와 정확히 일치시켜 scale factor를
  클라이언트가 소유, (b) Retina는 2x 보정, (c) 빗나가면 `enable_zoom` /
  region crop. 즉 **controlled resize + zoom 2-pass**가 공식 레시피다. 🟢
  > 출처: [Anthropic computer use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
- **OpenAI CUA (`computer_use_preview`)**: pixel 좌표를 직접 출력하는
  전용 학습(RL) 모델. 스크린샷은 `detail: "original"`로 최대 10.24MP까지
  원본 유지 권장, downscale하면 좌표 remap 필수. 내부 grounding 학습
  세부는 비공개. 🟢
  > 출처: [OpenAI computer use guide](https://platform.openai.com/docs/guides/tools-computer-use)
  > 출처: [OpenAI Computer-Using Agent](https://openai.com/index/computer-using-agent/)
- **오픈소스 SOTA (2026-06 기준)**: grounding 전용 모델이 답이다 —
  UI-TARS-1.5 61.6%, GTA1-Qwen2.5VL-72B 58.4%, MolmoPoint-GUI-8B 61.1
  (ScreenSpot-Pro). 보조 파이프라인으로는 OmniParser v2(detect-then-choose),
  SoM overlay, RegionFocus류 zoom 2-pass가 공개 구현으로 존재. 🟢
  > 출처: [ScreenSpot-Pro leaderboard](https://gui-agent.github.io/grounding-leaderboard/)
  > 출처: [OmniParser v2](https://huggingface.co/microsoft/OmniParser-v2.0)
  > 출처: [Set-of-Mark prompting](https://arxiv.org/abs/2310.11441)

## Phase 40 범위 제안 (effort M, Phase 10~30과 독립)

backend를 유지한 채(codex CLI, 추가 의존성 0) 닫을 수 있는 것부터. 번호는
기능 트랙 연속인 40을 쓴다. 리포 페이즈 제안: Phase 28.

### 40-A. 좌표 계약 하드닝 (effort S) — 필수

- 프롬프트에 캡처 이미지의 실제 width/height를 명시: "이미지는
  {W}x{H}px다. 그 좌표계로 답하라."
- `--json` 로그에 capture size / viewport / dpr / clip / scale 전 체인
  기록. offset 계열 버그를 재현 가능하게 만든다.
- 캡처를 장변 1568px 이하로 명시적 downscale(sharp 없이 CDP
  `captureScreenshot` scale 옵션 활용 가능)하고 inverse mapping을 직접
  소유 — codex 내부의 암묵적 resize에 좌표계를 맡기지 않는다.

### 40-B. two-pass zoom refinement 기본화 (effort S~M) — 필수

- 현재 `--verify-before-click`은 opt-in 검증이지 refinement가 아니다.
  1-pass에서 rough region → 해당 crop을 원본 해상도로 재캡처(CDP clip은
  DPR 배율로 뜨므로 사실상 2x zoom) → 2-pass 좌표 → remap을 **기본
  경로**로 승격. Anthropic `enable_zoom`, RegionFocus(ScreenSpot-Pro
  61.6%)와 같은 방향.
  > 출처: [Visual Test-time Scaling for GUI Agent Grounding](https://arxiv.org/html/2505.00684v2)
- 실패 시 fail-closed: 2-pass 불일치가 크면 클릭하지 않고 명시적
  envelope로 반환 (조용한 오클릭 금지 — extract의 verdict 철학 재사용).

### 40-C. SoM/ID overlay 실험 플래그 (effort M) — 옵션

- `snapshot --interactive`가 이미 DOM ref를 주므로, vision-click 대상은
  ref 없는 canvas/iframe이다. 이 위에 CDP로 후보 영역(히트테스트 가능한
  노드, 또는 40-B 1-pass의 상위 k개 후보)을 numbered box로 그려 넣고
  모델에게 `{found, id}`를 고르게 한다. raw 좌표 hallucination을 선택
  문제로 치환.

### 명시적 비범위 (DEFER)

- **OmniParser v2 로컬 모델 / grounding 전용 backend(Qwen-VL,
  MolmoPoint)**: 정확도 상한은 가장 높지만 로컬 모델 의존성·배포 무게가
  agbrowse의 "npx 한 방" 포지셔닝과 충돌. 40-A/B 이후에도 실측 정확도가
  부족한 경우에만 재개봉. 재검토 트리거: 40-B 이후 스모크 셋 정확도가
  목표(예: 10타겟 중 8+ 명중) 미달.

## 완료 판정

- 좌표 체인(capture→model→css→click)이 로그로 전량 추적 가능.
- two-pass가 기본 경로이고, 불일치 시 fail-closed envelope.
- 재현 가능한 스모크: 고정 페이지(canvas 포함) 10타겟 명중률 측정
  스크립트가 리포에 존재, before/after 수치 기록.

## 의존/배치

- Phase 10/20/30(DONE/NOOP)과 write set 분리 — 언제든 착수 가능.
- 런칭 트랙 블로커 아님. vision-click은 데모 소재(110)로 가산점.

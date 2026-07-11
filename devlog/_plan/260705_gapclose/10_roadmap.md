# 10 — 실행 로드맵: 기능 트랙 Phase 10~30 / 런칭 트랙 Phase 100+

status: PROPOSED / 작성: 2026-07-05 / 개정: 같은 날 — 기능 트랙과 런칭
트랙을 분리. 10~30은 기능 격차만 담고, 포지셔닝·런칭은 100번대로 뺀다.

00~09가 "무엇을 닫고 무엇을 안 닫는가"의 결정이라면, 이 문서는 그 결정을
실행 순서로 배치한다. 번호는 10 단위로 띄워서 중간 삽입 여지를 남긴다.

트랙은 둘로 나눈다:

- **기능 트랙 (Phase 10~30)**: 제품 자체의 격차를 닫는 코드 작업.
  10~30 전부가 런칭의 전제는 아니다 — 각 페이즈는 독립적으로 가치가 있고
  독립적으로 출하한다.
- **런칭 트랙 (Phase 100+)**: 포지셔닝·문서·공개 런칭. 기능 트랙과 번호
  공간을 섞지 않는다. 기능이 준비되는 만큼 100번대가 소재를 가져다 쓴다.

리포 공식 페이즈 번호(`structure/phase_status.md`, 현재 11~22)와 충돌을
피하기 위해 여기 번호는 gapclose-local이다. 리포 페이즈로 승격할 때의
제안 매핑을 각 페이즈에 병기한다.

---

# 기능 트랙 (Phase 10~30)

## Phase 10 — Schema Extract CLI (effort M, 선행 조건 없음)

소스: `04_gap_schema_extract.md` / 리포 페이즈 제안: Phase 24

시리즈에서 유일한 필수 기능 격차. Stagehand 대비 수용 불가능한 열위를
"로컬 무료 Tier 1 + web-AI fallback" 범위로만 닫는다.

- `agbrowse extract --schema [--selector] [--instruction]` 커맨드 배선.
- Tier 1: adaptive-fetch → structured-extractor → schema 매핑 →
  `extract-schema.mjs` validate. LLM 0회, 실패 시 fail-closed verdict.
- Tier 2: `--escalate-web-ai` opt-in — 로그인된 web-AI 세션으로 JSON 생성
  후 동일 validator. API 비용 0이 차별점.
- CAPABILITY_TRUTH_TABLE에 extract 행 + 통합 테스트 + 문서.

완료 판정: 04번의 수용 기준 5개 전부. 특히 "조용한 실패 금지".

## Phase 20 — web-AI Golden Scenario 하드닝 (effort M, Phase 10과 병행 가능)

소스: `06_gap_webai_showcase.md` / 리포 페이즈 제안: Phase 25

경쟁 6종 중 아무도 없는 축을 재현 가능한 대표 시나리오로 굳힌다. 문서
카피가 아니라 **코드/테스트 측 하드닝**이 이 페이즈의 본체다. (README
배치·카피·데모 녹화는 런칭 트랙 100번대 소관.)

- "ask → poll → audit → artifact" 골든 시나리오 1개를 실행 가능한 스크립트
  + smoke 테스트로 고정 (provider UI drift 조기 감지).
- 시나리오 전 구간의 실패 모드 점검: send 실패, poll 타임아웃, source
  audit 불통과, artifact 저장 실패 각각이 명시적 envelope로 떨어지는지.
- streaming recovery / false-complete 방지 경로에 회귀 테스트 보강.

완료 판정: 골든 시나리오가 smoke로 반복 재현되고, 모든 실패 모드가
조용히 죽지 않는다.

## Phase 30 — Session Stability Pool (effort M, 조건부)

소스: `07_daemon_scope_decision.md` / 리포 페이즈 제안: Phase 27

범위가 결정된 페이즈. Rust daemon 추격이 아니라 web-AI long-run 안정성
한정. **트리거 발동 전에는 착수하지 않는다**: poll 실패율 실측 문제화,
또는 latency가 채택 기준이 되는 외부 신호.

- Node connection pool / keepalive로 30분+ 세션의 재접속 비용 절감.
- 측정 지표: poll 실패율, 세션 드랍률 (primitive 명령 총 시간 아님).

Phase 20의 smoke가 실측 데이터 소스가 된다 — 20이 먼저 도는 이유.

## 페이즈 없음 — Remote CDP (DEFERRED 유지)

소스: `08_defer_remote_cdp.md`. 로드맵에 넣지 않는 것이 결정이다.
재검토 트리거(08번)가 발동하면 그때 새 문서로 재개봉한다.

## Phase 40 — vision-click 좌표 grounding 보강 (effort M, 독립, PROPOSED)

소스: `11_phase40_vision_click_grounding.md` (2026-07-06 추가) /
리포 페이즈 제안: Phase 28

vision-click의 정확도 열위는 generic VLM raw 좌표 출력의 구조적 한계
(ScreenSpot-Pro에서 GPT-4o 0.8% vs grounding 특화 모델 30~60%대).
backend 교체 없이 닫는 범위만 담는다:

- 40-A 좌표 계약 하드닝 (S): 프롬프트에 이미지 크기 명시, 좌표 체인
  전량 로깅, controlled downscale + inverse mapping 소유.
- 40-B two-pass zoom refinement 기본화 (S~M): rough region → 원본
  해상도 crop 재캡처 → 2차 좌표 → remap. 불일치 시 fail-closed.
- 40-C SoM/ID overlay 실험 플래그 (M, 옵션).
- DEFER: OmniParser/grounding 전용 모델 backend — 40-B 이후 스모크
  정확도 미달 시에만 재개봉.

Phase 10~30과 write set 분리, 언제든 착수 가능. 런칭 블로커 아님.

---

# 런칭 트랙 (Phase 100+)

기능 번호 공간과 분리. 기능 트랙의 산출물을 소재로 소비하되, 기능
페이즈를 블로킹하지 않는다.

## Phase 100 — Positioning & Docs (effort S, 즉시 시작 가능)

소스: `05_gap_positioning_docs.md` / 리포 페이즈 제안: Phase 23

- README 리드 재작성: "proof layer for agent web research + drive your
  logged-in AI web UIs, no MCP server" 투톱 구도.
- `agbrowse search` 역할 고정 문서화 (`--stdin-results` enrich +
  `--verify` proof, discovery engine 아님 명시).
- evidence envelope 필드 스펙 독립 문서화 (외부 스킬 작성자용 파싱 계약).
- 에이전트 스킬 예제 스니펫 (cxc-search 패턴 참조).
- "이미 결제한 구독을 에이전트 도구로 — API 토큰 비용 0" 공식 카피화.
- ToS 프레임("본인 계정, 본인 구독, 로컬 Chrome") 정면 서술.

완료 판정: README 첫 화면에서 generic 브라우저 CLI로 읽히지 않는다.

## Phase 110 — Demo Assets (effort S, Phase 20 산출물 필요)

소스: `06_gap_webai_showcase.md`의 자산 파트

- Phase 20 골든 시나리오 녹화 (asciinema/영상): "쉘 종료 → poll 재개 →
  source audit 통과 → artifact 저장"이 한 화면에.
- 4열 비교표 (agent-browser / Playwright MCP / Stagehand / agbrowse —
  속도 열위 정직 표기 포함, 01·03번 데이터 재사용).
- extract 데모 (Phase 10 완료 시): 가격표 페이지 → `--schema` → JSON.

## Phase 120 — Public Launch (effort S~M, Phase 100+110 완료 후)

소스: `09_launch_awareness.md` / 리포 페이즈 제안: Phase 26

창이 열려 있을 때(카테고리에 Show HN이 먹히는 시기) 나간다.

- Reddit(r/ClaudeCode 등) 실전 워크플로 공유 먼저 → Show HN 순서.
- Show HN: web-AI 레인 리드, evidence envelope 세컨드.
- 런칭 주간 provider smoke 상시 확인.

완료 판정: 독립적 커뮤니티 언급 1건+, 월 npm DL 5,000+ (1개월),
외부 이슈/PR 첫 유입.

최소 런칭 게이트는 **Phase 100 + 110** (즉 기능 측은 Phase 20의 골든
시나리오만 필수). Phase 10 extract는 런칭에 실리면 좋은 가산점이지
블로커가 아니다 — 런칭이 기능 트랙을 기다리다 창을 놓치는 것이 최악.

---

## 의존 관계 요약

```
기능 트랙:  Phase 10 (extract, M) ∥ Phase 20 (골든 시나리오 하드닝, M)
                                        │ smoke 실측
                                        └──> Phase 30 (pool, 조건부)

런칭 트랙:  Phase 100 (포지셔닝, S) ──┐
            Phase 110 (데모, S) ←──── Phase 20 산출물
                              └───┴──> Phase 120 (런칭)
```

- 10과 20은 병행 가능 (extract vs web-ai 레인, write set 분리).
- 30은 시간이 아니라 트리거로 열린다 (20의 smoke가 데이터 소스).
- 100은 오늘이라도 시작 가능. 110은 20의 산출물 대기.
- 120 게이트는 100+110. extract(10)는 가산점, 블로커 아님.

## 지금 당장 시작한다면

기능 트랙 Phase 10의 Tier 1 (LLM 없는 extract 경로)부터. 병행 여력이
있으면 런칭 트랙 Phase 100 문서 작업을 사이드로.

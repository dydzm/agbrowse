# 260705 gapclose — 경쟁 격차 클로즈 시리즈 인덱스

2026-07-05 경쟁 리서치(병렬 서브에이전트 스웜 + GitHub/npm API 직접 검증)를
바탕으로, agbrowse가 지금 닫아야 할 격차와 닫지 말아야 할 격차를 문서로
고정한다. 260628 competitive_research 두 문서(agent-browser 분석, schema-bound
extraction 조사)의 후속이며, 그 문서들이 "무엇이 다른가"를 다뤘다면 이
시리즈는 "그래서 무엇을 하고 무엇을 안 하는가"를 결정한다.

핵심 판정 한 줄: agbrowse는 "더 넓은 브라우저 도구"가 아니라 **"로그인된
실제 AI 웹 UI + 원문 증거 검증을 MCP 없이 주는 유일한 CLI"**로 싸운다.
시장 바람(CLI > MCP 선호)은 지금 유리한 방향으로 불고 있고, 격차 중 반드시
메워야 하는 것은 schema extract 하나뿐이다.

---

## 문서 목록

| # | 문서 | 성격 | 결정 |
| --- | --- | --- | --- |
| 00 | 이 인덱스 | 네비게이터 | — |
| 01 | `01_market_snapshot.md` | 검증 데이터 | 경쟁 6종 stars/릴리스/다운로드 스냅샷 |
| 02 | `02_community_signal.md` | 검증 데이터 | CLI>MCP 프랙티셔너 흐름 + 신규 진입자 |
| 03 | `03_position_assessment.md` | 판정 | 상대별 우위/열위/차별점 (20-80 스케일) |
| 04 | `04_gap_schema_extract.md` | CLOSE (M) | validator → `agbrowse extract` CLI 승격 |
| 05 | `05_gap_positioning_docs.md` | CLOSE (S) | proof envelope 포지셔닝 문서화 |
| 06 | `06_gap_webai_showcase.md` | CLOSE (M) | web-AI 레인 대표 시나리오화 |
| 07 | `07_daemon_scope_decision.md` | SCOPE (M) | daemon화는 web-AI 세션 안정성 범위로만 |
| 08 | `08_defer_remote_cdp.md` | DEFER | Phase 19 remote CDP 계속 보류 |
| 09 | `09_launch_awareness.md` | CLOSE (S~M) | 인지도 격차 — 공개 런칭 준비 |
| 10 | `10_roadmap.md` | 실행 로드맵 | 기능 트랙 10~30 (extract/골든 시나리오/pool) + 런칭 트랙 100~120 분리 |
| 11 | `11_phase40_vision_click_grounding.md` | PLANNED | Phase 40 계획 — vision-click 좌표 grounding 보강 (좌표 계약 하드닝 + two-pass zoom) |
| 20 | `20_phase10_extract_impl.md` | DONE | `agbrowse extract` 구현 완료 (24 tests + live smoke) |
| 30 | `30_phase20_golden_impl.md` | DONE | web-AI 골든 시나리오 하드닝 (5 tests, 실패 모드 4종 계약) |
| 40 | `40_phase30_pool_trigger_eval.md` | DONE (NOOP) | pool 트리거 미발동 — 실측 근거로 착수 안 함 |
| 50 | `50_phase40_vision_grounding_impl.md` | DONE | Phase 40 구현 — 40-A/40-B 완료, canvas QA 8/8 명중, Computer Use 비교 관측 |

## 리서치 방법 요약

- 탐색: 병렬 explorer 서브에이전트 4레인 (agent-browser / Stagehand /
  MCP 진영 / 커뮤니티 신호) + gpt-5.5 심층 분석 1기.
- 검증: stars·릴리스·다운로드 수치는 `gh api` + npm downloads API로
  메인 세션에서 직접 재확인 (Tier 2 proof). 스니펫만 있는 주장은 각 문서에
  unverified lead로 표기.
- 로컬 근거: `structure/CAPABILITY_TRUTH_TABLE.md`, `web-ai/extract-schema.mjs`,
  `skills/browser/search.mjs`, `docs/EXTERNAL_CDP.md` 등 파일 인용.

## 상태

- 2026-07-05: 시리즈 작성. 전 문서 status: PLANNED (04~09), VERIFIED (01~03).
- 2026-07-05: `10_roadmap.md` 추가 후 같은 날 개정 — 기능 트랙(10 extract,
  20 골든 시나리오 하드닝, 30 조건부 pool)과 런칭 트랙(100 포지셔닝,
  110 데모, 120 런칭)으로 번호 공간 분리. 런칭 게이트는 100+110,
  extract는 가산점이지 블로커 아님.
- 2026-07-05: 기능 트랙 완주 (PABCD x3 cycles).
  Phase 10 DONE — `agbrowse extract` (Tier 1 LLM-free + Tier 2 opt-in,
  24 tests, w3schools live smoke, SoT sync).
  Phase 20 DONE — 골든 시나리오 하드닝 (golden path + F1~F4 실패 모드
  계약, 프로덕션 코드 무변경).
  Phase 30 DONE(NOOP) — 트리거 미발동 실측 판정 (0.11-0.27s/command,
  260628 추정 반증). 부산물 제안: poll 결과 카운터.
- 2026-07-06: `11_phase40_vision_click_grounding.md` 추가 — vision-click
  부정확 문제를 gpt-5.5 리서치(Anthropic/OpenAI 공식 문서 + ScreenSpot
  leaderboard 원자료)로 진단. generic VLM raw 좌표는 구조적 열위
  (ScreenSpot-Pro GPT-4o 0.8%). Phase 40 제안: 좌표 계약 하드닝(S) +
  two-pass zoom 기본화(S~M) + SoM overlay 실험(M). grounding 전용 모델
  backend는 DEFER.
- 2026-07-06: Phase 40 구현 완료 (`50_phase40_vision_grounding_impl.md`).
  40-A imageSize 프롬프트 계약 + coordChain 로깅 + --json, 40-B two-pass
  기본화 + fail-closed. canvas QA 픽스처 8/8 명중 (보강 전 1타겟 miss
  재현 후 개선 확인). 유닛 1092/1092, 독립 리뷰 H/M 지적 수정 완료.
  Computer Use 플러그인과 비교: 상호보완 판정 (브라우저 내부는 agbrowse
  우위, OS 앱은 Computer Use 소관).
- 2026-07-11: agent UX 라우팅 보강 — `skills/search/SKILL.md`와
  `skills/browser/SKILL.md` frontmatter에 Playwright/플레이라이트/browser
  QA/브라우저 QA/스모크/스크린샷 QA 트리거를 추가했다. 임시 URL 검증과
  페이지 QA는 agbrowse-first로 고정하고, 저장소가 이미 소유한 Playwright
  E2E 회귀 스위트는 실행·확장 대상으로 보존하는 경계를 본문에도 명시했다.
  영향은 번들 스킬 선택과 agent 자연어 라우팅에 한정되며 런타임 CLI 계약은
  바뀌지 않는다. 설치 산출물에 영문·한글·오타형 트리거와 E2E 보존 경계가
  남는지 `test/unit/skill-install.test.mjs`로 회귀 고정했다. 검증은 skill
  frontmatter validator, 구조 카운트, 문서 drift/release gate로 수행한다.

# 03 — 경쟁 위치 판정 (상대별 우위/열위/차별점)

gpt-5.5 심층 분석 에이전트의 로컬 코드 검토(파일 인용) + 검증된 외부
데이터(01, 02번)를 종합한 판정이다. 점수는 MLB 20-80 스카우팅 스케일
(20=최악, 50=평균, 60=plus, 70=plus-plus, 80=elite).

---

## 상대별 판정

| 상대 | agbrowse 위치 | 20-80 등급 |
| --- | --- | --- |
| Vercel agent-browser | 속도(Rust daemon warm vs per-command Node 재접속)와 remote-provider polish는 뒤짐. web-AI UI 레인, evidence-first fetch/search, npm skills 배포는 차별화. | 속도 45 / 증거 65 / web-AI 75 |
| Stagehand / Browserbase | schema extraction 뒤짐 — 현 `web-ai/extract-schema.mjs`는 fail-closed validator subset이고 CLI extraction loop 미완. 로그인된 ChatGPT/Gemini 세션 재활용 전략은 유니크. | schema 40 / 비용통제 65 / 로컬성 70 |
| Playwright MCP / Chrome DevTools MCP | MCP breadth는 의도적으로 뒤짐 (frozen narrow MCP: `browser_snapshot`, `browser_click_ref`, `web_ai_*`만 ready/beta — `web-ai/browser-tool-schema.mjs`). "MCP token tax 없는 CLI 우선"이 포지션. | breadth 35 / CLI 인체공학 65 / 안전경계 70 |
| browser-use | Python agent loop, cloud/production 내러티브, 인지도 모두 뒤짐. provider UI 자동화 + source-audit/failure envelope는 더 날카로운 틈새. | agent loop 45 / web-AI 75 / cloud 25 |

## agbrowse만 가진 것 (경쟁 6종 중 무보유)

1. **web-AI UI 자동화 레인**: ChatGPT/Gemini/Grok 웹 UI를
   `render/status/send/poll/query` + sessions + code zip + context package +
   `--require-source-audit`로 묶은 파이프라인 (`web-ai/cli.mjs`).
2. **evidence envelope**: adaptive fetch가 public endpoint → direct fetch →
   TLS/metadata → reader → browser → user session → human loop 순으로
   수렴하며 ok/verdict/source/evidence를 반환
   (`skills/browser/adaptive-fetch/index.mjs`).
3. **proof-of-known-URL**: `agbrowse search --verify`는 "다른 에이전트가
   찾은 URL을 원문 증거로 검증"에 특화 (`skills/browser/search.mjs`).
   단, 내부 candidate discovery는 Google 검색 URL 생성 수준 — discovery
   engine으로 과신 금지.

## 어디서 지고 있고, 어느 패배는 수용하는가

- **속도** (vs agent-browser): 진다. 부분 수용 — 07번 범위 결정 참조.
- **schema extraction** (vs Stagehand): 진다. 수용 불가 — 04번에서 닫는다.
- **MCP breadth** (vs DevTools MCP 45.9k): 진다. **전면 수용** — 이 게임에서
  이기려는 시도 자체가 포지션 훼손. frozen MCP 유지.
- **cloud/원격 브라우저** (vs Browserbase/browser-use cloud): 진다.
  **전면 수용** — 08번 defer 결정 참조.
- **인지도**: 진다. 수용 불가하나 기능이 아닌 배포/런칭 문제 — 09번.

## 이길 수 있는 문장

"Playwright MCP보다 많은 도구"가 아니라:

> **어떤 CLI 에이전트든 MCP 서버 없이, 로그인된 실제 AI 웹 UI와
> 원문 URL을 증거 봉투로 다루게 해준다.**

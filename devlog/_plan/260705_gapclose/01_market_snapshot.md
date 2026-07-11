# 01 — 시장 스냅샷 (2026-07-05, API 직접 검증)

경쟁 리포 6종의 규모와 활동성을 GitHub API와 npm downloads API로 직접
조회한 결과다. 서브에이전트 스니펫이 아니라 메인 세션에서 `gh api`로
원본을 확인했으므로 이 수치는 Tier 2 proof로 취급한다.

---

## GitHub 스냅샷

| 프로젝트 | Stars | Forks | 최신 릴리스 | 마지막 push | 언어 |
| --- | ---: | ---: | --- | --- | --- |
| browser-use/browser-use | 102,809 | 11,393 | v0.13.3 (2026-07-01) | 2026-07-03 | Python |
| ChromeDevTools/chrome-devtools-mcp | 45,912 | 2,988 | v1.5.0 (2026-07-03) | 2026-07-05 | TypeScript |
| vercel-labs/agent-browser | 37,865 | 2,432 | v0.31.1 (2026-06-26) | 2026-06-26 | Rust |
| microsoft/playwright-mcp | 34,719 | 2,877 | v0.0.77 (2026-06-29) | 2026-06-29 | TypeScript |
| browserbase/stagehand | 23,353 | 1,606 | browse@0.9.0 (2026-06-25) | 2026-07-03 | TypeScript |
| **lidge-jun/agbrowse** | **190** | **21** | v0.1.16 | 2026-07-02 | JavaScript |

> 출처: [GitHub API repos endpoint](https://api.github.com) 직접 조회 (2026-07-05, `gh api repos/<owner>/<repo>`)

## npm 월간 다운로드 (2026-06-05 ~ 07-04)

| 패키지 | 월간 DL |
| --- | ---: |
| agent-browser | 4,411,265 |
| agbrowse | 1,935 |

> 출처: [npm downloads API](https://api.npmjs.org/downloads/point/last-month/agbrowse) 직접 조회 (2026-07-05)

## 릴리스 방향 (서브에이전트 레인, 원문 오픈 확인)

- **agent-browser v0.31.0 (6/25)**: `--restore`/`--restore-save`, worktree 단위
  세션 ID, `session info`, `--namespace` — 세션 지속성/멀티 워크트리 방향.
  v0.31.1 (6/26)은 Next.js 16.3 Turbopack에서 React renderer 선택 버그 수정.
  > 출처: [agent-browser releases](https://github.com/vercel-labs/agent-browser/releases)
- **Stagehand**: v3 메이저 라인 (`stagehand.act()`/`observe()`로 시그니처 이동,
  `extract()`는 Zod/JSON schema 입력 + 타입 추론 반환 유지). `browse@0.9.0`
  (6/25)은 screenshot 기본 파일 저장으로 변경. Browserbase는 "browser agent
  platform"으로 포지셔닝 확장 (Free/$20/$99/Scale).
  > 출처: [Stagehand v3 migration](https://docs.stagehand.dev/v3/migrations/v2), [extract()](https://docs.stagehand.dev/v3/basics/extract), [Browserbase pricing](https://www.browserbase.com/pricing)
- **Chrome DevTools MCP**: 1.x 안정 버전 도달, stars에서 Playwright MCP 추월.
  MCP 진영의 모멘텀 리더.
  > 출처: [chrome-devtools-mcp releases](https://github.com/ChromeDevTools/chrome-devtools-mcp/releases)
- **browser-use**: Python agent 라이브러리 정체성 유지, MCP-first로 전환하지
  않음. 압도적 인지도 (103k stars).
  > 출처: [browser-use](https://github.com/browser-use/browser-use)

## 인접 조사 (schema extraction 생태계, 레인 부분 커버)

- AgentQL v1.19.0: `TF_BROWSER` remote-browser 프로필 (anti-bot 대응),
  `query_data` 중심 schema-bound 추출. 호스티드 SDK/서비스 성격.
  > 출처: [AgentQL release notes](https://docs.agentql.com/release-notes)
- Firecrawl: JSON-schema 추출이 `/scrape`(`{type:"json",schema}`)와 `/parse`로
  통합. API-first 호스티드.
  > 출처: [Firecrawl scrape API](https://docs.firecrawl.dev/api-reference/endpoint/scrape)
- Skyvern v1.0.44 (6/30 표기): 오픈소스 셀프호스트 옵션.
  > 출처: [Skyvern releases](https://github.com/Skyvern-AI/skyvern/releases)
  (연도 표기는 검색 결과 기반 — unverified lead, 직접 페이지 확인 필요)

## 읽는 법

규모 격차(190 vs 수만)는 기능 격차가 아니라 **인지도 격차**다. 09번 문서가
이를 다룬다. 기능 축에서 반드시 닫아야 하는 것은 schema extract(04번)이고,
나머지는 포지셔닝(05, 06)과 범위 결정(07, 08)의 문제다.

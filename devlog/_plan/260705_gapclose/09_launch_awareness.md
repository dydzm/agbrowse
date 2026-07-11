# 09 — GAP CLOSE: 인지도 격차 — 공개 런칭 준비 (S~M)

status: PLANNED / priority: 4 (04·05·06 완료 후 실행)

가장 큰 수치 격차(190 stars vs 수만, 월 1,935 DL vs 441만)는 기능이 아니라
인지도다. agbrowse에 대한 독립적 커뮤니티 언급은 현재 0건(02번). 한편
Webctl과 Smooth CLI의 HN 런칭이 보여주듯 "agent browser CLI" 카테고리는
지금 Show HN이 먹히는 시기다. 창이 열려 있을 때 나가야 한다.

---

## 순서 (선행 조건)

런칭은 04(extract), 05(포지셔닝), 06(web-AI 쇼케이스) 뒤에 온다.
첫인상은 한 번뿐이고, 현재 README로는 generic 브라우저 CLI로 읽혀서
"agent-browser 아류" 프레임에 갇힐 위험이 있다.

## 할 일

1. **Show HN 포스트**: 제목 후보 — "Show HN: agbrowse — drive your
   logged-in ChatGPT/Gemini from any CLI agent, no MCP server". web-AI
   레인을 리드로, evidence envelope를 세컨드로. generic 자동화 기능은
   본문 후반.
2. **데모 자산**: 06번 골든 시나리오 녹화 (asciinema 또는 짧은 영상).
   "쉘 종료 → poll 재개 → source audit 통과 → artifact 저장"이 한 화면에.
3. **Reddit 병행**: r/ClaudeCode 등 — 02번에서 확인된 스레드들이 정확히
   이 오디언스. "playwright CLI superpowers" 스레드 톤에 맞춘 실전 워크플로
   공유 형태가 Show HN보다 먼저여도 좋다.
4. **비교표 1장**: agent-browser / Playwright MCP / Stagehand / agbrowse
   4열 — 속도·MCP 유무·schema extract·web-AI·비용 구조. 01·03번 데이터
   재사용. 지는 축(속도)을 정직하게 표기하는 것이 신뢰를 만든다.
5. **skills 배포 스토리**: npm 패키지에 skills/가 동봉되는 구조는
   에이전트 사용자에게 실질 차별점 — "install 한 번에 CLI + 에이전트
   스킬"을 카피에 포함.

## 성공 기준 (소박하게)

- HN/Reddit에서 독립적 언급 0건 → 1건 이상.
- 월간 npm DL 1,935 → 5,000+ (런칭 후 1개월).
- 외부 이슈/PR 첫 유입.

## 리스크

- web-AI 레인의 ToS 논쟁이 댓글에서 나올 수 있음 — 06번의 "본인 계정,
  본인 구독, 로컬 Chrome" 프레임으로 사전 서술. 숨기면 더 나쁘다.
- 런칭 직후 provider UI 변경으로 데모가 깨지는 시나리오 — 런칭 주간에
  smoke 테스트 상시 확인.

effort: S~M (자산 준비 포함)

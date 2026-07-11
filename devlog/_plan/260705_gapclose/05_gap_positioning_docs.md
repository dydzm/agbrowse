# 05 — GAP CLOSE: proof envelope 포지셔닝 문서화 (S)

status: PLANNED / priority: 2 (가장 싼 격차 — 코드 변경 없음)

`agbrowse search --verify`와 `agbrowse fetch --json`은 이미 "다른 에이전트가
찾은 URL을 원문 증거 봉투로 검증하는 도구"로서 탄탄하다. 그런데 README와
docs는 이 wedge를 전면에 세우지 않고 있고, search를 discovery 도구처럼
읽히게 두는 위험도 있다. 이 문서는 포지셔닝 카피와 문서 구조 변경만으로
격차를 닫는다.

---

## 왜 이것이 wedge인가

- 커뮤니티 신호(02번): 프랙티셔너 불만은 "검색이 안 된다"가 아니라
  "스니펫을 증거로 믿었다가 틀린다 + MCP가 컨텍스트를 태운다"이다.
- Webctl/Smooth/agent-browser 어느 쪽도 "verify a known URL, return an
  evidence envelope"를 스토리로 갖고 있지 않다.
- codexclaw cxc-search 같은 에이전트 스킬 생태계가 정확히 이 역할의
  도구를 Tier 2 proof rung으로 요구한다 — agbrowse가 그 자리에 이미
  꽂혀 있다.

## 할 일

1. **README 리드 섹션 재작성**: 첫 화면 카피를 "browser automation CLI"에서
   "the proof layer for agent web research — verify URLs, get evidence
   envelopes, no MCP server" 축으로. web-AI 레인과 함께 투톱 배치.
2. **search 문서의 역할 고정**: `agbrowse search`는 discovery engine이
   아니라 (a) `--stdin-results`로 외부 검색 결과를 받아 enrich, (b)
   `--verify <url>`로 단일 URL proof — 이 두 용도임을 명시.
   내부 candidate discovery의 한계(Google 검색 URL 생성 수준)를 문서에
   정직하게 적는다.
3. **evidence envelope 스펙 문서화**: ok/verdict/source/finalUrl/content/
   evidence 필드를 독립 문서로 — 다른 에이전트/스킬 작성자가 파싱 계약으로
   쓸 수 있게.
4. **에이전트 스킬 스니펫 제공**: Claude Code/Codex 스킬에서 agbrowse를
   Tier 2 proof로 쓰는 복붙 가능한 예제 (cxc-search가 실제 레퍼런스).

## 비목표

- search 커맨드 기능 변경 (코드는 그대로, 이야기만 고친다).
- discovery 엔진 신규 구현 — 하지 않기로 한 결정을 문서에 못박는 것이
  이 작업의 일부다.

effort: S (문서/카피 작업만)

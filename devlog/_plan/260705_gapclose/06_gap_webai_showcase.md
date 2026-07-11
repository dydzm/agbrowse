# 06 — GAP CLOSE: web-AI 레인을 대표 시나리오로 전면화 (M)

status: PLANNED / priority: 3

web-AI UI 자동화(로그인된 ChatGPT/Gemini/Grok 세션 + source audit +
artifact)는 경쟁 6종 중 누구도 하지 않는 축이고(03번 판정), agbrowse가
카테고리 자체를 바꿀 수 있는 유일한 지점이다. 기능은 이미 있다 —
`render/status/send/poll/query`, sessions, code zip, context package,
`--require-source-audit`, failure envelope. 없는 것은 이것을 처음 보는
사람이 30초 안에 이해하는 대표 시나리오다.

---

## 할 일

1. **"ask → poll → audit → artifact" 골든 시나리오 1개 고정**:
   예 — Deep Research급 질문을 ChatGPT Pro 세션에 보내고, 쉘을 떠나도
   poll로 회수하고, `--require-source-audit`로 출처를 검증하고, answer
   artifact를 파일로 받는 전체 흐름. README Quick Start 바로 아래 배치.
2. **비용 프레임 명시**: "이미 결제한 ChatGPT Plus/Pro·Gemini·Grok 구독을
   에이전트 도구로 전환 — API 토큰 비용 0"이라는 문장을 공식 카피로.
   Stagehand(LLM API 비용)·Browserbase(호스팅 비용)와의 비용 구조 차이가
   가장 설득력 있는 축.
3. **long-run 신뢰성 증거 노출**: streaming recovery, false-complete 방지
   (`_plan/260625_webai_streaming_recovery_false_complete` 작업) 같은 이미
   해결한 hard problem을 docs에 "왜 이게 어려운가" 섹션으로 승격.
4. **09번 런칭 문서의 데모 소재로 연결**: 골든 시나리오 녹화가 곧 런칭
   포스트의 데모가 된다.

## 리스크와 정직성

- provider UI 변경에 취약한 레인이다 — selector drift 대응 프로세스
  (smoke 테스트, 복구 주기)를 docs에 공개하는 것이 신뢰를 만든다.
- provider ToS 관점의 자동화 우려는 "본인 계정, 본인 구독, 로컬 Chrome"
  프레임으로 정면 서술한다. 숨기지 않는다.

effort: M (문서 + 골든 시나리오 스모크 고정 + 데모 자산)

# 08 — DEFER: Phase 19 remote CDP adapters 계속 보류

status: DEFERRED (재확정, 2026-07-05)

`devlog/20_phase19_remote_cdp_adapters.md`로 계획돼 있던 remote CDP
어댑터(Browserbase 등 호스티드 브라우저 연결)는 이번 리서치 결과를 근거로
**계속 보류**를 재확정한다. 격차를 닫지 않기로 하는 것도 gapclose 결정이다.

---

## 근거

1. **내부 문서가 이미 경고함**: `docs/EXTERNAL_CDP.md`는 production-ready
   remote CDP 부재와 trust boundary 변화를 명시한다. 로컬 Chrome 전용이
   현재 보안/신뢰 모델의 전제다.
2. **정면전 상대가 나쁨**: Browserbase는 "browser agent platform"으로
   확장 중이고(Free/$20/$99/Scale, 01번), browser-use는 cloud/sandbox
   내러티브가 강하다. 호스티드 축은 자본 게임이다.
3. **포지션 훼손**: "로컬 Chrome, 본인 로그인 세션, MCP 서버 없음"이
   agbrowse 스토리의 뼈대다. remote CDP는 이 세 가지를 전부 흐린다.
   web-AI 레인의 핵심 전제(사용자의 로그인된 구독 세션)도 호스티드
   브라우저에서는 성립하기 어렵다.
4. **수요 증거 없음**: 커뮤니티 신호(02번)에서 remote CDP를 요구하는
   프랙티셔너 목소리는 확인되지 않았다. anti-bot 대응 요구는 있으나 그건
   유저 세션 rung과 human loop가 이미 담당하는 문제다.

## 재검토 트리거

- 실사용자가 CI 등 headless 환경에서 agbrowse를 돌리려는 구체적 요구가
  반복될 때 (그 경우에도 full remote CDP가 아니라 로컬 headless 개선이
  먼저인지 재평가).
- agent-browser가 Lightpanda/remote CDP로 유의미한 채택을 만들어냈다는
  검증된 신호가 나올 때 (현재 unverified lead).

## 관련

- 원 계획: `devlog/20_phase19_remote_cdp_adapters.md`
- 신뢰 경계: `docs/EXTERNAL_CDP.md`

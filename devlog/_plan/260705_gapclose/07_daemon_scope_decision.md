# 07 — SCOPE 결정: daemon화는 web-AI 세션 안정성 범위로만 (M)

status: DECIDED (scope) / 구현은 후순위

agent-browser의 최대 우위는 Rust daemon warm 상태다: 50개 연속 명령에서
agbrowse ~15-25초 vs agent-browser ~5초 추정 (260628 분석 문서). 이 격차를
정면으로 쫓아 Rust 전환이나 full daemon 아키텍처로 가는 것은 **하지
않는다**로 결정한다. 속도는 agbrowse의 이기는 축이 아니고(03번), primitive
명령 속도 경쟁은 Vercel의 게임이다.

---

## 결정

- **하지 않음**: Rust 재작성, 범용 client-daemon 전환, sub-100ms primitive
  latency 추구.
- **함 (범위 한정)**: long-running web-AI 세션의 안정성에 필요한 만큼만 —
  Node 기반 connection pool 또는 경량 keepalive로 `send → poll → poll →
  artifact` 사이클에서 CDP 재접속 오버헤드와 세션 드랍을 줄인다.
- 측정 기준은 "50개 primitive 명령 총 시간"이 아니라 **"30분+ web-AI
  세션에서 poll 실패율/재접속 비용"**이다.

## 근거

- per-command 단명 프로세스는 단점만이 아니다: crash 격리, 상태 오염 없음,
  에이전트가 아무 때나 명령 하나만 실행 가능 — "serverless CLI" 포지션의
  일부다.
- 커뮤니티 신호(02번)에서 daemon이 언급되는 맥락은 순수 속도보다
  "쿠키/세션 유지"였다 — agbrowse는 이미 지속 Chrome 프로필로 이를
  충족한다.
- agent-browser의 최근 릴리스 방향(세션 지속성, worktree 세션)은 그들이
  daemon 자산을 세션 관리로 확장 중임을 보여준다. 같은 길을 뒤에서 쫓으면
  영원히 2등이다.

## 재검토 트리거

- web-AI poll 실패율이 실측으로 문제가 될 때.
- 에이전트 하네스들이 명령 latency를 채택 기준으로 삼는 신호가 나올 때.

effort: M (pool/keepalive 한정 시)

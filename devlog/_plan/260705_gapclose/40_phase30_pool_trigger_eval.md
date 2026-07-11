# 40 — Phase 30 트리거 평가: Session Stability Pool

status: DONE — NOOP (2026-07-05) / work-phase: gapclose 기능 트랙 Phase 30

Phase 30은 조건부 페이즈다 (07_daemon_scope_decision.md): **트리거 발동
전에는 착수하지 않는다**. 이 work-phase의 산출물은 코드가 아니라 트리거
평가 — 실측으로 발동 여부를 판정하고 근거를 기록한다.

## Loop-spec

- Loop archetype: spec-satisfaction (verifier = 실측 데이터 + 판정 기준)
- Goal: 두 트리거의 발동 여부를 실측으로 판정.
  - T1: web-AI poll 실패율이 실측으로 문제화되는가
  - T2: 명령 latency가 채택 기준이 될 신호가 있는가
- Verifier: 아래 측정 프로토콜의 수치 + 판정.
- Non-goals: pool/keepalive 구현 (트리거 발동 시에만 후속 work-phase로).
- 예상 종결: 발동 시 구현 계획 수립, 미발동 시 근거 기록 후 NOOP.

## 측정 프로토콜

1. per-command 재접속 비용: headless Chrome 기동 후 `status` x10,
   `snapshot --interactive` x5, `fetch --browser never` x3의 wall time.
2. poll 안정성 프록시: Phase 20 골든 시나리오의 실패 모드 계약이
   명시 envelope로 떨어지는지 (F2/F4가 세션 드랍의 fixture 프록시).
3. 260628 경쟁 문서의 추정치 (agbrowse 300-800ms/command)와 대조.

## 측정 결과 (2026-07-05, 로컬 headless Chrome, M-series macOS)

| 명령 | 실측 wall time | 260628 추정 |
| --- | --- | --- |
| `status` x10 | 0.11-0.12s (중앙값 0.11) | 0.3-0.8s |
| `snapshot --interactive --max-nodes 40` x5 | 0.26-0.27s | 0.3-0.8s |
| `fetch --json --browser never` x3 | 0.23-0.26s | — |

- 50개 primitive 연속 추정: ~5.5-13s (260628 문서의 15-25s 추정 대비
  절반 이하). agent-browser(~5s) 대비 여전히 느리지만 격차는 3-5x가
  아니라 1.1-2.6x.
- poll 안정성: 골든 시나리오 하드닝(Phase 20)으로 timeout/mismatch가
  전부 recoverable 명시 envelope — 조용한 세션 드랍 경로 없음.
  라이브 장기 세션 실패율 통계는 아직 없음 (수집 체계 부재).

## 판정 (D에서 확정)

**트리거 미발동 — Phase 30 pool 구현은 착수하지 않는다 (NOOP 종결).**

- T1 (poll 실패율 실측 문제화): 미발동. F2/F4 fixture 계약은 "조용한 드랍
  경로 없음"의 회귀 증거일 뿐 라이브 실패율 통계가 아니다 (감사 확인).
  리포에 장기 poll-failure 텔레메트리 자체가 없다 — session.mjs/trace는
  세션 단위, eval-runner는 오프라인 fixture. 즉 현재는 "문제가 실측된
  적 없음"이며, 실측할 수단도 없으므로 트리거는 정의상 발동 불가.
- T2 (latency가 채택 기준): 미발동. 실측 0.11-0.27s/command는 260628
  추정(0.3-0.8s)보다 이미 빠르고, 커뮤니티 신호(02번)에서도 latency보다
  컨텍스트/토큰이 채택 기준이었다.
- 감사: gpt-5.4-mini 독립 감사 PASS — "NOOP close with evidence is sound".

### 부산물 제안 (선택, 다음 사이클 후보)

텔레메트리 갭이 확인됐으므로, pool보다 먼저 **poll 결과 카운터**(성공/
timeout/mismatch를 append-only로 누적하는 경량 기록)가 T1을 실측 가능하게
만드는 전제 작업이다. 이것은 Phase 30의 트리거 감시 인프라이지 pool
구현이 아니다 — 별도 소규모 작업으로 분리 권장.

### LOOP-PESSIMIST-01 기록

- 죽은 가설: "agbrowse는 command당 0.3-0.8s로 느리다" (260628) — 실측
  절반 이하로 반증. 속도 열위 서사는 과장이었다.
- 이 방향이 틀렸음을 보여줄 증거: 라이브 30분+ 세션에서 poll 실패율
  통계가 유의하게 나오면 NOOP 판정은 뒤집힌다. 그 측정은 카운터 부재로
  현재 불가능 — 위 부산물 제안이 선행 조건.

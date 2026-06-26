# 40 — Cycle 4: R6 Wiring + R7 Guards (agbrowse + cli-jaw)

> Part of [00_plan.md](00_plan.md) · **Status: ⬜ PENDING (stub)**

## Target
- **Repos:** agbrowse (R6) + cli-jaw (R7)
- **Severity:** P1
- **Gate:** both repos' gate commands

## R6: wire 203.x + 202 A1–A3 (agbrowse)
- MODIFY `skills/browser/adaptive-fetch/index.mjs`: import + wire 6 standalone 203.x modules at correct ladder phases
- Wire 202 search discipline helpers into readiness/selection flow
- Raise query cap for era-sweep/disconfirm

## R7: DR guard + AX subtree + lease cleanup (cli-jaw)
- MODIFY `src/browser/web-ai/chatgpt-deep-research.ts`: symmetric activity guard
- MODIFY `src/browser/web-ai/ax-snapshot.ts`: strict subtree + empty→unavailable
- MODIFY `src/browser/web-ai/tab-lease-store.ts`: prune-dead-before-count + exclusions

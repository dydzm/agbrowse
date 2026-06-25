# 110 — Cycle (agbrowse (.mjs))

> Part of [00_plan.md](00_plan.md) · Goal `68727b6d-d01` · **Status: ⬜ PENDING (stub — diff-level detail filled at this cycle's P/B phase)**

## Target
- **Repo / lang:** agbrowse (.mjs)
- **Severity:** P2/P3
- **Gate command:** `npm run gate:typecheck && npm run gate:tests && npm run docs:drift && npm run docs:counts`

## Gaps in scope
202 search discipline (algorithmic subset only) + 203 rest (yt-dlp, camoufox, feed-parser, BM25, table extractor, lane discovery, 203.8/.9) + 201 P2 leftovers (#6/#7/#9).

## Plan (P-phase 2026-06-26)
**202 scope caveat (per [202](../260621_cli_jaw_webai_parity/202_search_discipline_to_agbrowse.md)):** ~90% of the cli-jaw search skill is agent-orchestration prose that does NOT port to a code library. Only the algorithmic pieces port — A1 (constraint-ledger discipline), A2/A3 (era-sweep + disconfirm query specs). A4 (bounded-effort) / A5 (tier order) / A6 (vocab) / A7 (lanes) are agent-judgment or already covered by 203.7's lane taxonomy. **203-rest** are NEW `adaptive-fetch` modules; **201 leftovers** are the Cycle-10 deferrals.

| Item | File | Kind | Pri |
|---|---|---|---|
| 203.5 | `adaptive-fetch/bm25-filter.mjs` | NEW (pure tf-idf) | P2 |
| 201 #9 | `web-ai/capability-freshness.mjs` | NEW (pure) | P2 |
| 203.4 | `adaptive-fetch/feed-parser.mjs` | NEW (pure) | P2 |
| 203.6 | `adaptive-fetch/structured-extractor.mjs` | NEW (pure) | P3 |
| 203.7 | `adaptive-fetch/candidate-discovery.mjs` | NEW (pure) | P3 |
| 203.2 | `adaptive-fetch/ytdlp-reader.mjs` | NEW (spawn + pure) | P2 |
| 203.3 | `adaptive-fetch/camoufox-session.mjs` | NEW (spawn) | P2 |
| 203.8 | `web-ai/live-status-report.mjs` | NEW (pure) | P2 |
| 202 A1 | `search-research/constraint-ledger.mjs` | MODIFY (enrich) | Med |
| 202 A2/A3 | `search-research/search-strategy.mjs` | MODIFY (enrich) | Low-Med |
| 201 #7 | `web-ai/provider-adapter.mjs` | NEW (contract) | P2 |
| 201 #6 | `web-ai/failure-diagnostics.mjs` | MODIFY (enrich) | P2 |
| 203.9 | `web-ai/copy-markdown.mjs` | MODIFY (in-page) | P2 |

## Build log (B-phase — branch `feat/webai-parity-200-260625`)
| Commit | Item | Tests |
|---|---|---|
| `bf08e76` | 203.5 BM25 reranker | 4 |
| `15564ff` | 201#9 freshness gate | 4 |
| `fd2acf7` | 203.4 feed parser | 4 |
| `d5b0250`+`170ba9e` | 203.6 structured extractor (+test fix) | 4 |
| `6d60629` | 203.7 candidate discovery | 4 |
| `8b4e4e5` | 203.2 yt-dlp + 203.3 camoufox | 4 |
| `c25c590` | 203.8 live-status report | 5 |
| `553132a` | 202-A1 constraint-ledger enrich | 7 |
| `cb21ff7` | 202-A2/A3 era-sweep + disconfirm | 5 |
| `b8119c5` | 201#7 provider-adapter | 2 |
| `8276716` | 201#6 diagnostics taxonomy enrich | 5 |
| `b5c09d4` | 203.9 copy-markdown lenient fallback | (no-regression) |

51 new unit tests. Enrichments (A1/A2/A3/#6) are additive + backward-compatible (existing search-research/diagnostics/copy tests green). 203.9 is a browser-context change (verified by faithful mirror + no-regression).

## Verification
- **A-phase:** 203-rest re-confirmed absent in agbrowse `adaptive-fetch` (no bm25/feed/structured/candidate/ytdlp/camoufox); 201 leftovers absent; 202 caveat applied (only algorithmic A1/A2/A3 ported, agent-orchestration prose excluded by design).
- **C-phase (gate):** full agbrowse gate green — `gate:typecheck` PASS, `gate:tests` PASS (unit+MCP+source-audit+trace-policy), `docs:drift` 144, `docs:counts` 63.

---
name: search
description: >-
  Search discipline and proof engine for CLI agents: discover, prove, and
  deep-research with agbrowse. Verify original pages, score evidence, and
  optionally escalate to web-ai. Prefer agbrowse for public-web proof and URL
  QA before adding a Playwright runner or MCP. Triggers: search, look up,
  latest, current, news, verify URL, evidence check, deep search, deep research,
  Playwright, playwrite, playwright QA, browser QA, web QA, page QA, QA browser,
  browser test, browser smoke test, screenshot QA, URL QA, visual QA, extract,
  schema extraction, 검색, 검색해, 찾아봐, 찾아줘, 알아봐, 웹검색, 딥서치,
  URL 검증, 브라우저 QA, 웹 QA, 페이지 QA, QA 브라우저, 브라우저 테스트,
  브라우저 스모크 테스트, 스크린샷 QA, 비주얼 QA, 플레이라이트,
  플레이라이트 QA, 표로 뽑아줘, 데이터 추출, agbrowse search
---

# Search

Search discipline for any lookup that leaves the repository, plus the
`agbrowse` proof engine that backs it. Your CLI's built-in web search
discovers; agbrowse opens the original pages and proves.

## Source-Proof Invariant (read first)

Search results are **candidate URLs, not evidence.** Snippets, summaries, and
search-result consensus discover where a fact might live; they never settle
it. When recency, factual accuracy, version/compatibility, or source
attribution matters, open the original page (Tier 2 below) and confirm it
before treating the answer as sufficient. No tier may declare an answer final
on snippet text alone, and `evidenceStatus` never reaches `sufficient`
without an original-page fetch.

## Module Map

This file is the hub: it is operationally complete on its own. Detail modules
live in `references/` next to this file. `agbrowse skills install` ships them
alongside `SKILL.md`; `agbrowse skills get search` prints only this hub, so if
you only have the hub text, follow the ladder here and run
`agbrowse skills path search` (or install) to reach the references.

| Module | Load when |
|---|---|
| `references/query-rewrite.md` | Rewriting a natural-language ask into focused queries; Korean source routing; `research plan` usage |
| `references/evidence-ladder.md` | Understanding how a URL gets proven: adaptive-fetch phases, verdict vocabulary, blocked/JS/WAF/paywall/PDF tactics |
| `references/deep-research.md` | Comprehensive multi-source research: query families, waves, claim ledger, `--deep` mechanics |
| `references/cli-reference.md` | Exact flags, JSON envelopes, stdin formats, integration pattern, extract routing |

## Research-Depth Classifier

Name the depth before touching any tool:

- **latest/current fact** — one entity, a version/date/price/status. Tier 1
  discover + Tier 2 open one primary source. Capture the exact date.
- **official-doc fact** — API/library behavior. Prefer official docs first,
  then open the page for proof.
- **implementation/source fact** — how something is built. Open the
  source/repo itself, not a summary of it.
- **comprehensive research** — multi-source or contested. The only depth that
  justifies Tier 3; ordinary lookups never auto-escalate.

## Browser QA Routing

Treat requests phrased as **Playwright / 플레이라이트 / browser QA / 브라우저
QA / page test / smoke test / screenshot QA** as agbrowse-first when the task is
ad-hoc inspection or verification of a URL:

1. Use this search ladder for public-web discovery, URL proof, and source-backed
   verification.
2. Route interaction, screenshots, console/network inspection, and local or
   served-page smoke QA to the bundled `browser` skill and its `agbrowse`
   commands.
3. Do not add a separate Playwright runner, Playwright MCP, Puppeteer, or browser
   driver merely to perform ad-hoc QA. agbrowse already supplies the browser
   control surface.
4. When the repository already owns an intentional Playwright E2E suite, run or
   extend that suite for its maintained regression contract; do not replace it
   with an ad-hoc agbrowse script.

## The Ladder (three tiers)

### Tier 1 — Discovery (your native web search)

Run 1-3 focused, rewritten queries through the web search your CLI already
has (see `references/query-rewrite.md`; `agbrowse research plan` rewrites
Korean/source-sensitive asks for you). The output is candidate URLs plus
titles/snippets — discovery only, never proof.

**agbrowse is not a search backend.** Running `agbrowse search "<query>"`
without `--stdin-results` does not search the web: it builds one
`google.com/search?q=` URL per rewritten query and feeds those SERP pages
into adaptive-fetch. A large SERP can score `strong_ok` on generic content
heuristics and wrongly mark constraints supported. Avoid the no-stdin path
for research or proof entirely, and never treat its output as evidence.
Discovery belongs to your native search; pipe the results in:

```bash
your-native-search "query" --json \
  | agbrowse search "query" --stdin-results --json
```

### Tier 2 — Proof (default; agbrowse rung ladder)

Open candidate URLs and read the real source. Stop at the first rung that
yields primary evidence. Full machinery: `references/evidence-ladder.md`.

1. **HTTP-only proof** — `agbrowse search --verify "<url>" --json --browser never`
   for a compact verdict, or `agbrowse fetch "<url>" --json --browser never`
   for the full envelope. The JSON envelope IS the evidence artifact.
2. **Render escalation** — rerun with `--browser auto` (Chrome starts only if
   the ladder decides it must render) or `--browser required` (browser-only).
   Defaults differ per command: `search`/`fetch` default to `auto`,
   `research enrich-fetch` defaults to `never`. `agbrowse search` silently
   normalizes an invalid mode to `auto`; `agbrowse fetch` rejects it — spell
   modes exactly.
3. **Interactive session** — when steps must act on the page:
   `agbrowse research browse-plan` to plan the actions, then
   `agbrowse start --headed` -> `navigate` -> `snapshot --interactive` ->
   `click eN` / `type` -> re-snapshot -> `stop`. Logged-in or
   challenge-gated pages go through `agbrowse fetch --browser-session
   user|interactive`, not `--browser required`.

Read `evidenceStatus` on every search result and act on it:

| Status | Meaning | Agent action |
|---|---|---|
| `sufficient` | Constraint ledger ready: original pages support the constraints | Trust, cite with dates |
| `partial` | `--deep` returned synthesis text but the ledger is still not ready | Use with caveats; claims still need source proof |
| `browse-needed` | Candidates exist but need browser render (JS/WAF/Naver) | Rung 2/3 |
| `insufficient` | No credible evidence obtained | New queries, or Tier 3 if depth justifies |

Structured data is not a search job: when the goal is schema-bound JSON from
a page (pricing tables, spec lists, JSON-LD), route to
`agbrowse extract <url> --schema <file.json>` — LLM-free, fail-closed
(details: `references/cli-reference.md`).

### Tier 3 — Deep research (opt-in)

For comprehensive-depth questions only: expand into query families, run
discovery waves, keep a claim ledger, and optionally let
`agbrowse search "<query>" --deep --vendor grok|chatgpt|gemini` synthesize
over fetched evidence via a logged-in web-ai session (slow, costly, headed
Chrome). Deep output is provider synthesis, not primary evidence — its claims
still need Tier-2 proof. Protocol: `references/deep-research.md`.

## Proof Rules

- Record the exact date and source type (official doc, announcement, repo,
  news, community) for every time-sensitive or public claim.
- Corroborate contested or high-stakes claims with a second independent
  source before reporting them settled.
- When sources conflict, state which source wins and why (primacy, recency,
  authority) — never average them.
- `contentTruncated` is not a failed fetch; judge by `verdict`, `source`,
  and the excerpt.

## Intent Guard (검색/찾아봐/look up)

When the user says **검색 / 검색해 / 찾아봐 / 찾아줘 / 알아봐 / 웹검색** (or
*search / look up / latest / current / news*) without naming local files:

1. **Classify the target first**: external/current info -> this ladder;
   library/API docs -> official docs first, then open for proof; the local
   repository's code/logs/config -> file search (`rg`), never the web.
2. **Never send the full natural-language sentence as the only query** —
   rewrite into 1-3 focused keyword queries (`references/query-rewrite.md`).
3. **Preserve anchors** in the rewrite: entities, source hints (공식/official,
   Naver, GitHub), dates, locale, content type.
4. **Results are candidate URLs** — open the original page when accuracy,
   recency, or attribution matters.
5. **Repository targets use file search**, never a misrouted web search.
6. **Docs queries prefer official documentation**, then open the source.
7. **Bare ambiguous "검색"** with no clear target -> ask ONE short
   clarification before launching either a repo grep or a web search.
8. **No hidden fallback** between web, docs, and file search — state the
   classification you chose.

## When to Stop

Stop escalating when any of these holds: a sufficient primary source is found
and confirmed; all candidate URLs are dead or unreachable; or the task needs
a user clarification. Do not keep climbing past a confirmed answer, and do
not spend Tier 3 on a question Tier 1+2 already settled.

## Prerequisites

- Node.js 18+
- `npm i -g agbrowse` (or local install)
- Chrome installed (only needed when `--browser auto` triggers escalation)

## Quick Start

```bash
# Pipe your native search results for original-page verification (primary path)
echo '[{"url":"https://...","title":"...","snippet":"..."}]' \
  | agbrowse search "Next.js 15 app router migration" --stdin-results --json

# Verify a single URL
agbrowse search --verify "https://nextjs.org/docs/app" --json

# HTTP-only proof (no Chrome)
agbrowse search --verify "https://example.com/release-notes" --json --browser never

# Deep research escalation (uses web-ai when evidence is insufficient)
agbrowse search "서울시 2026 청년 지원금 공고" --deep --vendor grok --json
```

## Rules for Agents Using This Skill

1. **Native search discovers, agbrowse proves.** Always pipe real search
   results via `--stdin-results`; never rely on the no-stdin fallback.
2. **Snippets are not evidence.** The Source-Proof Invariant precedes every
   sufficiency call.
3. **Trust `evidenceStatus`.** Do not claim "verified" unless it says
   `sufficient`; `partial` means deep synthesis text without a ready ledger.
4. **`--deep` is slow and costly.** Comprehensive depth only, and its output
   still needs source proof.
5. **`--verify` for single URLs** you already hold and need to confirm.
6. **No server dependency.** Single process; Chrome auto-starts only when the
   fetch ladder needs rendering.
7. **Structured extraction routes to `agbrowse extract`, not search** —
   schema-bound, LLM-free, fail-closed (`references/cli-reference.md`).

Exact flags, JSON envelopes, stdin shapes, and the extract routing table:
`references/cli-reference.md`.

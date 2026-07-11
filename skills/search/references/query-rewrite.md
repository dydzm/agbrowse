# Query Rewrite

Part of the agbrowse search skill — loaded from SKILL.md routing.

Discovery quality is decided before any tool runs. A full natural-language
sentence pasted into a search box finds the wrong pages; 1-3 focused keyword
queries with preserved anchors find the right ones. This module is the
rewrite discipline, plus how `agbrowse research plan` automates it for
Korean and source-sensitive asks.

## Principles

1. **Never send the whole sentence.** Strip filler verbs (찾아봐, 검색해,
   알려줘, "can you find out") and keep only load-bearing terms.
2. **1-3 queries, each with a distinct job.** One discovery query, one
   verification query aimed at the constraints, optionally one
   source-restricted query (official site, specific community).
3. **Preserve anchors.** Anchors are the terms that must survive the
   rewrite:

   | Anchor type | Examples |
   |---|---|
   | Entities | product names, org names, people, APIs |
   | Source hints | 공식/official, go.kr, Naver, GitHub, arXiv |
   | Dates / windows | 2026, 5월, "since v15", latest |
   | Locale | Korean-market terms stay Korean; global tech terms stay English |
   | Content type | 공고, release notes, changelog, 논문, spec, 표/목록 |

4. **Match query language to source language.** Korean administrative or
   community facts live on Korean pages — keep the Korean anchors. Library
   and API facts live in English docs — translate the ask, keep identifiers
   verbatim.
5. **Add a disconfirming query for contested facts.** Search for the rival
   answer ("X가 아니라", "alternative to X", "criticism of X") so the first
   plausible hit does not become the answer by default.

## `agbrowse research plan`

For Korean or source-sensitive problems, let the planner do the rewrite:

```bash
agbrowse research plan --query "서울시 2026 청년 지원금 공고 찾아봐" --json
```

What it returns (all mechanical, no LLM):

- `atomicQueries[]` — up to `--max-queries` (default 3) focused queries with
  a `purpose` (`discovery`, `verification`, `source-restricted-discovery`,
  `era-sweep`, `disconfirm`) and a route URL per query. Stop words like
  찾아봐/검색해 are stripped; anchor terms are kept.
- `sourceHints[]` — detected from the text: `naver`, `namuwiki`, `official`
  (공식/정부/go.kr/or.kr), `bookstore`, `academic`, `structured` (표/목록/
  순위), `date`.
- `constraints[]` — clauses the final answer must satisfy (`c1`, `c2`, ...).
  These become the evidence ledger that `agbrowse search` scores against.
- Route selection — hints map to a Korean route: Naver search, Namuwiki,
  Kyobo bookstore, Google Scholar, official-site-biased search, or
  `google_kr` as the general fallback.

Two built-in biases worth knowing:

- **Era sweep** — origin questions (원조/최초/시초/유래/기원) emit extra
  time-window queries so recency bias does not bury the original.
- **Disconfirm** — the planner appends a "find a DIFFERENT entity" query.
  Caveat: the `--max-queries` cap (default 3) trims later specs, so era-sweep
  or disconfirm queries can be cut. For contested or origin questions, raise
  the cap (`--max-queries 5`) so the disconfirm query survives; run it, do
  not skip it.

The plan's route URLs are search-page URLs for YOUR browsing or native
search — remember the hub rule: SERP pages are never proof. Run the atomic
queries through your native web search, then pipe the results:

```bash
your-native-search "<atomic query>" --json \
  | agbrowse search "<original problem>" --stdin-results --json
```

## Worked Examples (actual planner output)

**KO, official + date** — `agbrowse research plan --query "서울시 2026 청년
지원금 공고 찾아봐" --json`

```text
hints: official, date
q1 discovery:                  서울시 2026 지원금 공식        (official_site)
q2 source-restricted-discovery: 공식 공지사항 서울시 2026 지원금 (official_site)
q3 disconfirm:                 서울시 2026 지원금 아닌 다른 비교 (official_site)
```

The planner is mechanical: it kept 서울시/2026/지원금/공식 but dropped
청년/공고 from its anchor pick. Treat its output as a starting set — add back
any anchor the answer cannot do without (here: 청년) in your own native-search
queries.

**KO, origin question (era sweep)** — `agbrowse research plan --query "그 밈
원조가 어디인지 알아봐" --max-queries 5 --json`

```text
hints: (none)
q1 discovery:  원조가 어디인지                  (google_kr)
q2 era-sweep:  원조 최초 원조가 어디인지        (google_kr)
q3 era-sweep:  시초 유래 원조가 어디인지        (google_kr)
q4 disconfirm: 원조가 어디인지 아닌 다른 비교    (google_kr)
```

With the default cap of 3 the disconfirm query is trimmed — this is why
origin/contested questions should raise `--max-queries`. Treat every
community claim as unverified until an original post or dated source is
opened.

**EN, version fact** — manual rewrite (the planner is Korean-focused; for
English asks rewrite by hand):

```text
ask: "did Next.js 15 change the app router defaults?"
q1 (discovery):     Next.js 15 app router defaults changed
q2 (verification):  Next.js 15 release notes app router
anchors kept: Next.js 15, app router, release notes
depth: latest/current fact -> one primary source (official release notes) + date
```

## Anti-patterns

- Pasting the user's sentence verbatim as the only query.
- Dropping the year or locale anchor and accepting whatever is newest.
- Rewriting Korean-market anchors into English (or vice versa) so the query
  lands on the wrong web.
- Running only the discovery query and skipping verification/disconfirmation
  when the answer will be stated as fact.

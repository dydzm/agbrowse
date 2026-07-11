Part of the agbrowse search skill — loaded from SKILL.md routing.

# Evidence Ladder: How agbrowse Proves a URL

Use this reference when a candidate URL must be read, verified, or explained as
unreadable. `agbrowse search --verify <url>` and `agbrowse fetch <url>` both call
the adaptive-fetch machinery in `skills/browser/adaptive-fetch/`.

## Execution Ladder

Adaptive fetch scores every readable candidate and keeps the best one. In code
execution order, the proof ladder is:

1. **Public endpoint resolvers.** `endpoint-resolvers.mjs` derives known public
   API, oEmbed, or metadata endpoints before the original URL is fetched.
2. **Direct HTTP with identity headers.** `fetcher.mjs` sends the selected
   browser-like or minimal identity headers. A blocked `403`/`429` or detected
   challenge may invoke `tls-fetch.mjs` before browser escalation.
3. **Feeds and metadata.** `reader-adapters.mjs` converts HTTP responses into
   reader candidates and extracts HTML metadata. Discovered RSS/Atom, JSON Feed,
   and oEmbed URLs are fetched; `feed-parser.mjs` turns feed items into evidence.
   Alternate URLs may also be ranked from first-pass text.
4. **Third-party readers.** `reader-adapters.mjs` scores an opt-in result from
   the third-party reader adapter. This rung runs only when the caller enables
   third-party readers.
5. **Browser render.** When browser mode permits it and earlier candidates are
   not strong enough, agbrowse may try `camoufox-session.mjs`, then an isolated
   Chrome render. Chrome captures visible text; Defuddle extracts a separate
   main-content candidate.
6. **Network API discovery.** During the Chrome render, JSON responses are
   collected as additional `network_api` candidates after tracking and auth
   endpoints are filtered out.

Media URLs have an auxiliary metadata/transcript lane through `ytdlp-reader.mjs`
when `yt-dlp` or `youtube-dl` is installed. It is best effort and becomes a no-op
when neither binary is available.

The supporting modules have distinct jobs:

| Module | Role in proof |
|---|---|
| `endpoint-resolvers.mjs` | Derive public endpoint candidates |
| `tls-fetch.mjs` | Retry selected blocked HTTP responses with TLS impersonation |
| `camoufox-session.mjs` | Try a hardened browser fingerprint before CDP Chrome |
| `feed-parser.mjs` | Parse RSS/Atom and JSON Feed items into evidence |
| `waf-profiles.mjs` | Describe WAF signatures and useful challenge behavior |
| `reader-adapters.mjs` | Normalize fetch, browser, user-session, and network results |
| `challenge-detector.mjs` | Classify WAF, login, paywall, and challenge boundaries |
| `content-scorer.mjs` | Score candidates and assign audited verdicts |
| `bm25-filter.mjs` | Query-filter selected content when a query is supplied |
| `structured-extractor.mjs` | Detect tables/headings in selected HTML content |

## Verdicts

Adaptive fetch emits exactly these verdicts:

| Verdict | Meaning and next action |
|---|---|
| `strong_ok` | Readable, high-scoring evidence. Still check relevance and date. |
| `weak_ok` | Readable but thin or weakly scored. Corroborate or escalate. |
| `blocked` | No usable public candidate, or a response failed access/content checks. Retry with `--browser auto`; for session-dependent access, use `--browser-session user` or `interactive` on `agbrowse fetch`. |
| `auth_required` | A login boundary was detected. Stop honestly, or explicitly use a logged-in user session. |
| `challenge` | A WAF/challenge boundary was detected. Use browser auto first; use `--browser-session interactive` when human challenge handling is needed. |
| `paywall` | Content is behind a paywall. Do not claim the hidden content; stop or explicitly use an authorized logged-in user session. |
| `browser_required` | Browser execution was needed but unavailable or did not yield a readable candidate. Run the render rung in an environment with Chrome. |
| `unsupported` | The adaptive-fetch result explicitly identifies an unsupported case. Choose another source or a format-specific reader. |
| `error` | An attempt failed unexpectedly. Inspect warnings/trace and retry or replace the source. |

`unknown` is not an adaptive-fetch verdict. It is the search/verification wrapper's
fallback when an underlying result has no `verdict` field.

## Browser Modes and Sessions

| Surface | Default | Semantics |
|---|---|---|
| `agbrowse search --verify` | `--browser auto` | HTTP first; render only when the selected candidate is not `strong_ok`. Invalid browser values normalize silently to `auto`. |
| `agbrowse fetch` | `--browser auto` | Same adaptive mode default. The fetch CLI parser accepts a string, but adaptive-fetch rejects an invalid value rather than normalizing it. |
| `agbrowse research enrich-fetch` | `--browser never` | Original-page HTTP enrichment only unless browser use is explicitly requested. Invalid values are rejected. |

`--browser required` is browser-only execution: it skips public endpoints and
direct HTTP candidates, then runs browser escalation. It does **not** mean an
interactive browser. Human challenge resolution is the separate fetch surface
`--browser-session interactive`. `--browser-session user` explicitly reuses the
user's authenticated session without enabling the human loop.

## Blocked-URL Reader Playbook

1. Run `agbrowse search --verify <url> --json` for a compact proof envelope, or
   `agbrowse fetch <url> --json --trace` when the attempt sequence matters.
2. For `challenge` or `blocked`, retry with `--browser auto`. On the fetch
   command, use `--browser-session user` for session-dependent access or
   `--browser-session interactive` for human challenge resolution.
3. For `browser_required`, make Chrome available and run the render rung. Do not
   describe `required` as interactive.
4. For `paywall` or `auth_required`, stop honestly unless the user explicitly
   authorizes a logged-in `--browser-session user` attempt.
5. For a table-only task, route to `agbrowse extract <url> --schema <file>`.
   Adaptive fetch can detect structured tables/headings, but `extract` is the
   schema-bound, fail-closed interface.

### PDFs, Feeds, and Media

- Direct HTTP accepts textual content types only. A PDF response is rejected as
  `unsupported-content-type`; there is no dedicated PDF parser in adaptive
  fetch. Browser auto may still attempt a render, but use a PDF-specific tool
  when the document itself is the required evidence.
- HTML-discovered RSS/Atom or oEmbed URLs are fetched as public endpoints. RSS,
  Atom, and JSON Feed content can contribute item title, date, URL, author,
  summary, tags, and media URLs to evidence.
- Media metadata and English subtitles are attempted through yt-dlp when that
  optional binary exists; failure does not abort the remaining ladder.

### Rejected URLs

The safety layer accepts only HTTP(S), rejects credential-bearing URLs, and
blocks localhost, private/special-use IPs, and DNS names that resolve to private
addresses unless private-network access was explicitly enabled by the caller.
This SSRF/DNS-rebinding guard is a rejection, not evidence that the target page
does not exist.

## Proof Rules

1. Record the exact observation date and source type (`public_endpoint`,
   `fetch`, `reader`, `metadata`, `third_party_reader`, `browser`,
   `browser_user`, `human_resolved`, `network_api`, or `validation`) with each
   material claim.
2. Corroborate time-sensitive claims with a second independent source. Two URLs
   that merely repeat the same upstream announcement are one source lineage.
3. When sources conflict, state the conflict, name which source wins, and explain
   why (for example, newer primary documentation over an older secondary page).
4. A successful fetch proves readability, not automatically relevance. Match
   the returned content against the query and constraint ledger.
5. `contentTruncated: true` means CLI output safety shortened otherwise selected
   content. It is not a failed fetch; judge the result by verdict, source,
   warnings, and attempts.

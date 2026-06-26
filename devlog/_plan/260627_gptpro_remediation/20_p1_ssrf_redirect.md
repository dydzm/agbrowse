# 20 — Cycle 2: R4 SSRF Redirect Loop (agbrowse)

> Part of [00_plan.md](00_plan.md) · **Status: IN PROGRESS**

## Target
- **Repo:** agbrowse
- **Severity:** P1 (security)
- **Gate:** `npm run gate:typecheck && npm run gate:tests`

## R4: manual redirect loop with per-hop DNS validation

**Root cause:** `tlsFetch` uses `curl -L` which follows redirects internally before
the post-redirect `validateFetchUrl` check. An open-redirect (public site 301s to
`http://169.254.169.254/`) bypasses SSRF protection because curl already fetched the
internal resource.

**Fix — diff-level:**

MODIFY `skills/browser/adaptive-fetch/tls-fetch.mjs`:
1. Remove `-L` from curl args (already have `--write-out` from R3)
2. Add `--max-redirs 0` to prevent any curl-internal following
3. Replace the single-shot `tlsFetch` with a manual redirect loop:
   - For each hop (max 10):
     a. `validateFetchUrl(url)` — scheme/hostname check
     b. `dnsRebindingGuard(url.hostname)` — resolve DNS, reject private IPs
     c. Execute single curl request (no -L)
     d. If 3xx: parse `Location` header, resolve relative URLs, loop
     e. If 2xx: return body + headers + finalUrl
   - Import `dnsRebindingGuard` from `./safety.mjs`
4. Remove `--write-out` sentinel (no longer needed — we track finalUrl ourselves)
5. Remove `findLastResponseSeparator` (no concatenated multi-hop output)

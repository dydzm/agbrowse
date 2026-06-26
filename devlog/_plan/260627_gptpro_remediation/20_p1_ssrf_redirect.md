# 20 — Cycle 2: R4 SSRF Redirect Loop (agbrowse)

> Part of [00_plan.md](00_plan.md) · **Status: ⬜ PENDING (stub)**

## Target
- **Repo:** agbrowse
- **Severity:** P1 (security)
- **Gate:** `npm run gate:typecheck && npm run gate:tests`

## R4: manual redirect loop with per-hop DNS validation
- MODIFY `skills/browser/adaptive-fetch/tls-fetch.mjs`
- Remove `curl -L`, add `--max-redirs 0`
- New function `followRedirectsManually(url, maxHops=10)` with per-hop `validateFetchUrl`
- Resolve relative `Location` headers via `new URL(location, currentUrl)`
- Test: SSRF via open redirect returns validation error, not content

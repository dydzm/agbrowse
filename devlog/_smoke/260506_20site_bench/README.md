# 20-site headed-browser  260506benchmark 

## Result: 18/20 PASS

| # | site | diff | refs | status | note |
|---|------|------|------|--------|------|
| 1-14 | naver/daum/coupang/kakao/google/bing/duckduckgo/yahoo/x/reddit/github/youtube/wikipedia/bbc | mixed | 6-200 | PASS | first-try |
| 15 | nytimes.com | medium | 0 | **FAIL** | Chrome renders 0-width even in fresh tab; CORP/COEP/anti-bot env block |
 Chrome blocks; same env class as 15 |
| 17 | ebay.com | medium | 152 | PASS | recovered via COOP+commit fallback (try 2) |
| 18 | google.com/maps | canvas | 29 | PASS | direct |
| 19 | openstreetmap.org | canvas | 37 | PASS | direct |
| 20 | tradingview.com | canvas | 200 | PASS | direct |

## Patches landed in this run (skills/browser/browser.mjs)

1. **COOP block  when `page.goto()` throws `ERR_BLOCKED_BY_RESPONSE`fallback** 
   (Cross-Origin-Opener-Policy mismatch with previous tab content), navigate
   to `about:blank` first, then retry the target URL. With timeout fallback to
   `waitUntil:'commit'` if the site is heavy.
2. **0-width post-nav health  after navigation, evaluatecheck** 
   `window.innerWidth/innerHeight`; if 0, recover via `about:blank` re-nav.
3. **`--wait-until <event>` and `--timeout <ms>` flags** on `agbrowse navigate`.

Without patches: 14/20.  With patches: 18/20.

## Remaining 2 failures
nytimes and amazon render as 0-width / blank-content even in a freshly-created
CDP target. `curl -I` shows both reachable (HTTP 200/302), so it's not a
network block. Symptom is consistent with Chrome silently dropping the page
when it triggers a COEP/CORP policy that conflicts with the agbrowse-launched
profile flags. Tagged as environmental, not an agbrowse CLI bug.

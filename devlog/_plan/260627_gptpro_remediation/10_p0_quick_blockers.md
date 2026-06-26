# 10 — Cycle 1: P0 Quick Blockers (R1 + R2 + R3)

> Part of [00_plan.md](00_plan.md) · **Status: ⬜ PENDING**

## Target
- **Repos:** agbrowse (R1, R3) + cli-jaw (R2)
- **Severity:** P0 (confirmed blockers, small fixes)
- **Gate:** agbrowse `npm run gate:typecheck && npm run gate:tests` · cli-jaw `npm test` + `npx tsc --noEmit`

## R1: envelope shape recognition (agbrowse)
- MODIFY `web-ai/failure-diagnostics.mjs:188`
- Before: `e.name === 'WebAiError' && typeof e.toJSON === 'function'`
- After: `typeof e.errorCode === 'string' && typeof e.toJSON === 'function'`
- Test: verify `ProviderRuntimeDisabledError` preserves errorCode/retryHint/vendor in envelope

## R2: tier-timeout threading (cli-jaw)
- MODIFY `src/browser/web-ai/chatgpt.ts` — poll/watch timeout resolution
- Thread `session.timeoutMs` (set by send) as fallback in poll (~line 498) and watch (~line 787)
- Test: `model:'pro'` poll uses 3600s, not 1200s

## R3: finalUrl + multi-hop parse (agbrowse)
- MODIFY `skills/browser/adaptive-fetch/tls-fetch.mjs`
- Add `--write-out '\n%{url_effective}'` to curl args
- Surface real final URL in `tlsFetchCandidate` result
- Test: multi-hop redirect returns correct finalUrl

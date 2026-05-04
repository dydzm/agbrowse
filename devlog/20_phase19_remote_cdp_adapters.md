# Phase 19 — Remote CDP adapters

Optional for local production. Required only before hosted/scaled claims.
This phase must avoid stealth, CAPTCHA, Cloudflare, or account-access claims.

## PR 19.1 — Browser provider abstraction

### Diff

- NEW `skills/browser/provider.mjs`
- MODIFY `skills/browser/browser.mjs`
- MODIFY `web-ai/cli.mjs`
- MODIFY `README.md`
- NEW `test/unit/browser-provider.test.mjs`

### Provider modes

- `local-chrome`
- `external-cdp`

### Public surface

```bash
AGBROWSE_BROWSER_PROVIDER=external-cdp \
AGBROWSE_CDP_URL=http://127.0.0.1:9222 \
agbrowse status --json
```

### PASS

- External CDP connects without launching Chrome.
- Local Chrome behavior is unchanged.
- `agbrowse status --json` reports provider type.
- Provider selection never logs secrets.

## PR 19.2 — Docker and CI runtime

### Diff

- OPTIONAL NEW `docker/Dockerfile`
- OPTIONAL NEW `docs/docker.md`
- OPTIONAL NEW `.github/workflows/docker-smoke.yml`

### PASS

- Fixture/eval suite runs in container.
- Headed provider workflows remain documented as local/manual unless a remote
  provider explicitly supports them.
- CDP port exposure warning is explicit.

## Deferred

- Browserbase adapter.
- Browser Use cloud adapter.
- Proxy/CAPTCHA/stealth claims.
- Cloud profile sync.

These need a separate security and billing review.

## cli-jaw mirror

- cli-jaw may already own server/runtime provider configuration; mirror only
  the external-CDP contract and status fields.
- Do not add cloud adapters to cli-jaw before agbrowse proves local
  `external-cdp`.
- Keep hosted-provider credentials out of repo-level config examples.

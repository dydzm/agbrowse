# Browser Vision Upgrade Verification Report

Date: 2026-06-17
Status: B-phase implementation verification
Branch: `dev-vision-upgrade`

## Implementation Commit

- `/Users/jun/Developer/new/700_projects/agbrowse`: `3392adc feat: harden vision coordinate fallback`
- `/Users/jun/Developer/new/700_projects/agbrowse`: `2b03e74 fix: wire vision candidate reconciliation`

## Implemented Scope

- Added `vision-candidate-v1` parsing with bbox, point, confidence, and risk flags.
- Kept legacy `{found,x,y}` parsing but marks it as point-only and lower confidence.
- Added candidate validation for finite bbox/point and viewport/clip bounds.
- Added `candidate-reconcile.mjs` for bbox-to-ref reconciliation.
- Extended ObservationBundleV1 with `observationId`, `targetId`, and `basis`.
- Wired `--bundle` into `agbrowse-vision-click` so a vision bbox can prefer a matching ref, fail on ambiguous refs, or fall back to coordinates.
- Added stale ObservationBundle rejection before coordinate fallback.
- Added `url` and `targetId` to `screenshot --json` so freshness checks use the same basis as `observe-bundle`.
- Updated docs for ref-first, coordinate-last browser control.
- Added focused fixtures and unit tests.

## Commands Run

From `/Users/jun/Developer/new/700_projects/agbrowse`:

```bash
git branch --show-current
```

Result:

```text
dev-vision-upgrade
```

```bash
npx vitest run test/unit/vision-core.test.mjs test/unit/candidate-reconcile.test.mjs test/unit/g06-observation-bundle.test.mjs
```

Result:

```text
PASS: 3 files, 36 tests, 0 failures
```

```bash
npm run typecheck:checkjs
```

Result:

```text
PASS
```

```bash
npm run docs:drift
```

Result:

```text
PASS: 144 checks
```

```bash
git diff --check
```

Result:

```text
PASS
```

## Real Browser Smoke

Not run in this phase.

Reason:

- The implemented coverage is parser, contract, and routing-basis hardening.
- A real browser smoke requires a live Chrome/CDP session with a controlled fixture page or canvas target.
- No fake pass was recorded.

Required future smoke:

- accessible button: snapshot ref click, no vision fallback
- no-ref target: vision bbox -> verify crop -> coordinate click
- ambiguous target: reject without click
- DPR/clip target: final CSS coordinate evidence is correct

---
name: vision-click
description: "Vision-based coordinate click: screenshot → AI coordinate extraction → mouse click. Codex CLI only."
---

# Vision Click (Codex Only)

Click non-DOM elements by screenshot analysis.
Uses `codex exec -i` for vision-based coordinate extraction.

## Quick Start

```bash
node vision-click.mjs "Submit button"
# → screenshot → codex vision → DPR correction → click → verify
# 🖱️ vision-clicked "Submit button" at (400, 276) via codex
```

With options:
```bash
node vision-click.mjs "Login" --double          # double-click
node vision-click.mjs "Menu" --port 9333        # custom CDP port
```

## Prerequisites

- **Codex CLI** installed and authenticated
- **browser.mjs** (browser-standalone skill) with Chrome running
- `playwright-core` installed

```bash
npm install playwright-core
node ../browser-standalone/browser.mjs start
```

## When to Use

Use when `browser.mjs snapshot` returns **NO ref** for target:
- Canvas elements, iframes, Shadow DOM
- Dynamically rendered content (WebGL, SVG)
- Elements behind overlays or custom web components

> **Always try `snapshot` first.** Only fall back to vision-click if no ref exists.

## Pipeline

```
1. browser.mjs snapshot        → Check if target has a ref ID
2. If ref exists → browser.mjs click <ref>  (normal path)
3. If NO ref → vision-click fallback:
   a. browser.mjs screenshot --json  → path + DPR
   b. codex exec -i <path> --json    → { found, x, y }
   c. DPR correction: image px → CSS px
   d. browser.mjs mouse-click <x> <y>
   e. browser.mjs snapshot           → verify
```

## Manual Workflow

```bash
# 1. Take screenshot
node ../browser-standalone/browser.mjs screenshot --json
# Output: {"path":"...screenshot_123.png","dpr":2,"viewport":{"width":1280,"height":720}}

# 2. Extract coordinates with Codex vision
codex exec -i /path/to/screenshot.png --json \
  --dangerously-bypass-approvals-and-sandbox \
  --skip-git-repo-check \
  'Find "Submit" button center pixel coordinate.
   Return ONLY JSON: {"found":true,"x":640,"y":400,"description":"blue submit button"}'

# 3. Click at coordinates (DPR-corrected)
node ../browser-standalone/browser.mjs mouse-click 320 200

# 4. Verify
node ../browser-standalone/browser.mjs snapshot
```

## Parsing Codex Response

Codex `--json` outputs NDJSON. The script scans all events for coordinate JSON:

```javascript
const lines = stdout.split('\n').filter(l => l.trim());
for (const line of lines) {
    const event = JSON.parse(line);
    if (event.item?.text) {
        const coords = JSON.parse(event.item.text);
        // coords = { found: true, x: 640, y: 400, description: "..." }
    }
}
```

## Accuracy

Verified via smoke test (2026-02-24):

| Target                  | Actual     | Codex Result | Error |
| ----------------------- | ---------- | ------------ | ----- |
| LOGIN button (800×600)  | (400, 275) | (400, 276)   | ±1px  |
| SIGNUP button (800×600) | (400, 345) | (400, 345)   | ±0px  |

## Environment Variables

| Variable         | Default                             | Description         |
| ---------------- | ----------------------------------- | ------------------- |
| `BROWSER_SCRIPT` | `../browser-standalone/browser.mjs` | Path to browser.mjs |
| `CDP_PORT`       | `9222`                              | Default CDP port    |

## Limitations

- **Codex CLI only** — Gemini/Claude REST planned for future
- Latency: 2-5 seconds per vision call
- Cost: ~$0.005-0.01 per call (~18K input tokens)
- Complex UIs may need confidence check + retry
- DPR auto-correction included

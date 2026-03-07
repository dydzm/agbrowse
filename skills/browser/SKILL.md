---
name: browser
description: "Chrome browser control: open pages, take ref snapshots, click, type, screenshot. No external server required."
---

# Browser Control

Control Chrome browser via `browser.mjs` commands.
Uses ref-based snapshots to identify page elements, then click/type by ref ID.

## Prerequisites

- Node.js 18+
- Google Chrome (or Chromium/Brave) installed
- `playwright-core` installed:

```bash
npm install playwright-core
# or globally:
npm install -g playwright-core
```

## Quick Start

```bash
node browser.mjs start                          # Start Chrome (CDP auto port)
node browser.mjs start --headless               # Headless mode (server/CI/WSL)
node browser.mjs navigate "https://example.com" # Go to URL
node browser.mjs snapshot                        # Get page structure with ref IDs
node browser.mjs click e3                        # Click ref e3
node browser.mjs type e5 "hello"                 # Type into ref e5
node browser.mjs screenshot                      # Save screenshot
```

## Core Workflow

> **Always follow this pattern:**
> 1. `snapshot` → See page structure + ref IDs
> 2. `click`/`type`/`press` → Interact using ref
> 3. `snapshot` → Verify result → Repeat

## Commands

### Browser Management

```bash
node browser.mjs start [--port <9222>] [--headless]  # Start Chrome
node browser.mjs stop                                # Stop Chrome
node browser.mjs status                              # Connection status
```

### Observe

```bash
node browser.mjs snapshot                # Ref snapshot (all elements)
node browser.mjs snapshot --interactive  # Interactive elements only (buttons, links, inputs)
node browser.mjs screenshot              # Current viewport
node browser.mjs screenshot --full-page  # Full page
node browser.mjs screenshot --ref e5     # Specific ref element only
node browser.mjs text                    # Page text content
node browser.mjs text --format html      # HTML source
```

### Snapshot Output Example

```
e1   link       "Gmail"
e2   link       "Images"
e3   textbox    "Search"           ← To type here: type e3 "query"
e4   button     "Google Search"    ← To click: click e4
e5   button     "I'm Feeling Lucky"
```

### Act

```bash
node browser.mjs click e3              # Click element
node browser.mjs type e3 "hello"       # Type text
node browser.mjs type e3 "hello" --submit  # Type + press Enter
node browser.mjs press Enter           # Press key
node browser.mjs press Escape
node browser.mjs press Tab
node browser.mjs hover e5              # Mouse hover
```

### Navigate

```bash
node browser.mjs navigate "https://example.com"  # Go to URL
node browser.mjs tabs                             # List tabs
node browser.mjs evaluate "document.title"        # Execute JS
```

## Common Workflows

### Web Search

```bash
node browser.mjs start
node browser.mjs navigate "https://www.google.com"
node browser.mjs snapshot --interactive
# → e3 textbox "Search"
node browser.mjs type e3 "search query" --submit
node browser.mjs snapshot --interactive
# Click desired result link
node browser.mjs click e7
```

### Form Filling

```bash
node browser.mjs snapshot --interactive
# → e1 textbox "Name", e2 textbox "Email", e3 button "Submit"
node browser.mjs type e1 "John Doe"
node browser.mjs type e2 "john@example.com"
node browser.mjs click e3
node browser.mjs snapshot  # Verify result
```

### Read Page Content

```bash
node browser.mjs navigate "https://news.ycombinator.com"
node browser.mjs text | head -100  # First 100 lines
# Or structured:
node browser.mjs snapshot  # Element list with roles
```

## Environment Variables

| Variable             | Default            | Description                               |
| -------------------- | ------------------ | ----------------------------------------- |
| `BROWSER_AGENT_HOME` | `~/.browser-agent` | Data directory (profile, screenshots)     |
| `CDP_PORT`           | `9222`             | Default Chrome DevTools Protocol port     |
| `CHROME_HEADLESS`    | `0`                | Set to `1` for headless mode              |
| `CHROME_NO_SANDBOX`  | `0`                | Set to `1` to disable sandbox (Docker/CI) |

## Headless Mode (Server/CI/WSL)

```bash
node browser.mjs start --headless               # CLI flag
CHROME_HEADLESS=1 node browser.mjs start         # env var
```

- GUI 없는 환경(WSL, SSH, Docker, CI)에서 사용
- `--headless=new` (Chrome 112+) 사용 — full browser 기능 유지

## macOS Alternatives (No Dependencies)

These work without any npm packages using native macOS tools:

```bash
# Screenshot
screencapture -x ~/screenshot.png
screencapture -R 0,0,1280,720 ~/region.png

# Open URL
open "https://example.com"
open -a "Google Chrome" "https://example.com"

# Current tab URL
osascript -e 'tell app "Chrome" to URL of active tab of front window'

# Tab list
osascript -e 'tell app "Chrome" to get {title, URL} of every tab of front window'

# Execute JavaScript
osascript -e 'tell app "Chrome" to execute front window'\''s active tab javascript "document.title"'

# Coordinate-based clicks (requires: brew install cliclick)
cliclick c:500,300
cliclick t:"text input"
```

## Troubleshooting

| Symptom                          | Cause                               | Fix                                            |
| -------------------------------- | ----------------------------------- | ---------------------------------------------- |
| CDP connection refused           | Chrome running with default profile | Close all Chrome, retry or `browser.mjs reset` |
| Windows: only test browser opens | Chrome singleton absorbs launch     | Close all Chrome → `browser.mjs start`         |
| Headless CDP not opening         | `--headless` not specified          | Add `--headless` flag                          |
| Port conflict                    | Other process on CDP port           | Use `--port <other>`                           |

## Notes

- Ref IDs **reset on navigation**. Always re-run `snapshot` after `navigate`.
- Use `--interactive` to show only clickable/typeable elements (shorter list).
- Screenshots are saved to `~/.browser-agent/screenshots/`.
- Default CDP port is `9222`. Override with `--port` or `CDP_PORT` env var.
- If CDP is already responding on the port, `start` reuses the existing instance.
- If the port is occupied by a non-CDP process, `start` will fail with a clear error.

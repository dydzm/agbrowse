# Screenshot Verification Harness

Repeatable screenshot captures for static HTML landing pages.
Uses `playwright-core` (already in repo `node_modules`) driving the local
Chrome installation — no additional npm installs needed.

## Prerequisites

- Node >= 18 (tested on v24)
- Google Chrome at `/Applications/Google Chrome.app/...` (override with `CHROME_PATH` env var)
- `playwright-core` in the repo's `node_modules/`

## Quick start

```bash
# From the verify/ directory (or use full paths)
TARGET=/path/to/index.html
OUT=./sample

# Viewport screenshots — three standard breakpoints
node capture.mjs "$TARGET" --out "$OUT" --width 1440 --height 900
node capture.mjs "$TARGET" --out "$OUT" --width 768  --height 1024
node capture.mjs "$TARGET" --out "$OUT" --width 390  --height 844

# Full-page capture at 1440 width
node capture.mjs "$TARGET" --out "$OUT" --width 1440 --height 900 --fullpage

# Scrolled captures (sticky-section verification)
node capture.mjs "$TARGET" --out "$OUT" --width 1440 --height 900 --scroll 800 --scroll 1600 --scroll 2400

# Reduced-motion capture
node capture.mjs "$TARGET" --out "$OUT" --width 1440 --height 900 --reduced-motion

# JS-disabled capture
node capture.mjs "$TARGET" --out "$OUT" --width 1440 --height 900 --no-js
```

## CLI reference

```
node capture.mjs <url-or-filepath> --out <dir> [options]

  --width W          Viewport width in px           (default: 1440)
  --height H         Viewport height in px          (default: 900)
  --scroll N         Scroll to Y=N before capture   (repeatable)
  --fullpage         Full-page screenshot
  --reduced-motion   Emulate prefers-reduced-motion: reduce
  --no-js            Disable JavaScript
  --device-scale S   Device scale factor            (default: 1)
```

Bare file paths are auto-converted to `file://` URLs.
Set `CHROME_PATH` to override the default Chrome location.

## Output naming

| Mode           | Filename pattern                              |
|----------------|-----------------------------------------------|
| Viewport       | `viewport_{W}x{H}.png`                       |
| Viewport + rm  | `viewport_{W}x{H}_reduced-motion.png`        |
| Viewport + nojs| `viewport_{W}x{H}_nojs.png`                  |
| Full-page      | `fullpage_{W}.png`                            |
| Scrolled       | `scroll_{W}x{H}_y{N}.png`                    |

## How it works

1. Launches Chrome headless via playwright-core's Chromium connector
2. Creates a browser context with the requested viewport, scale, motion,
   and JS settings
3. Navigates to the target URL, waits for network idle + 500 ms settle
4. Takes viewport / full-page / scrolled screenshots as requested
5. Prints a byte-size summary for quick sanity checks

## Caveats

- **`--no-js`**: Playwright disables JS at the context level (`javaScriptEnabled: false`),
  so the page renders with scripts blocked. This is a true JS-off capture.
- **Scroll captures**: The script calls `window.scrollTo(0, N)` via `page.evaluate`,
  which requires JS to be enabled. Do not combine `--no-js` with `--scroll`.
- **Fonts**: Local file:// pages may not load web fonts if they require network
  access. For full fidelity, serve the page over localhost.

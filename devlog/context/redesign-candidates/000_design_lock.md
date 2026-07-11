# agbrowse Pages Redesign — C5 Neo-Brutalist Terminal (Design Lock)

Session: 019f4bad-07ec-7870-b00a-88f7ace537a5 · Goal: active (HOTL) · Date: 2026-07-10
User decision: candidate C5 selected ("c5로 ㄱㄱㄱ"), motion "충분히" + explicit full-screen
transition effects requested.

## Loop-spec header (P, C2/C3 surface)
- Loop archetype: spec-satisfaction repair (verifier = render observation + rg gates + reviewer verdicts).
- Trigger: user-selected C5 direction for docs/index.html GitHub Pages landing.
- Goal: shipped single-file docs/index.html in C5 direction with landing-bucket motion incl. fullscreen section transition.
- Non-goals: docs/dev/*, README.md, runtime source, package.json, new build tooling, content language change.
- Verifier: headless Chrome screenshots (1440/768/390 + scroll offsets + reduced-motion), rg anti-slop gates, opus reviewer at A and C.
- Stop condition: all 7 goalplan criteria met with captured evidence.
- Memory artifact: this doc + goalplan ledger + verify/ screenshots.
- Expected terminal outcome: DONE.
- Escalation: NEEDS_HUMAN only if design direction itself must flip.
- HOTL resource bounds: local-only tools (Chrome headless, rg, apply_patch) + opus-4.6-medium reviewer subagents (user: unlimited); write scope = docs/index.html, docs/assets/*, devlog/context/redesign-candidates/**; wall-clock soft bound ~2h.

## Design tokens (locked from C5 mockup)
```yaml
name: agbrowse-pages-c5
colors:
  bg: "#e8e6e1"        # concrete gray
  ink: "#111111"       # borders, text, solid shadows
  panel: "#ffffff"     # opaque panel fill
  panel-ink: "#111111" # dark panel variant (terminal bar, strips)
  accent: "#a3e635"    # chartreuse — CTA, status dots, highlights ONLY
  mute: "#57534e"      # secondary text (warm gray, on light)
  mute-dark: "#a8a29e" # secondary text on ink panels
typography:
  heading: { fontFamily: "'Archivo Black', 'Helvetica Neue', Arial, sans-serif", transform: uppercase, letterSpacing: 0 }
  body:    { fontFamily: "'Helvetica Neue', Arial, sans-serif" }
  mono:    { fontFamily: "'SF Mono', Menlo, Consolas, monospace" }
shape:
  border: "3px solid #111"
  shadow: "8px 8px 0 #111"   # hard offset, no blur ever
  radius: 0
```
### Accent guardrail (A-gate fold-back #1)
Chartreuse #a3e635 is NEVER foreground text on light surfaces (#fff, #e8e6e1) — fails
WCAG (1.5:1 / 1.2:1). Legal uses only: (a) background fill with #111 text (12.5:1),
(b) foreground text/accents on ink #111 surfaces, (c) small status dots WITH 2px #111
border so shape reads without color. Highlight spans on light bg always carry #111 text.
Reading: public dev-tool landing for AI-agent builders, neo-brutalist "honest tool"
language — 1970s industrial catalog meets terminal. Reference: C5 mockup screenshot
(c5_brutalist_terminal.png).
Do's: opaque planes, hard borders, offset solid shadows, chartreuse used sparingly (<5% of pixels), uppercase condensed headlines, real command content.
Don'ts: glass/blur/transparency/gradients, purple, emoji icons, rounded corners, soft shadows, green-on-black terminal cliche, split hero with boxed screenshot card.

Dials: DESIGN_VARIANCE 7 · MOTION_INTENSITY 7 (landing bucket) · density D2 (campaign/landing with dev-tool density in tables). Reasoning: expressive public landing for a distinctive brand direction; motion explicitly requested by user.

Font loading: Archivo Black via Google Fonts (single weight, display=swap) + system fallback stack. If CDN unreachable, Helvetica bold uppercase fallback still reads brutalist. (No other webfonts; mono/body stay system.)
A-gate fold-back #6: URL carries `&display=swap`; add `<link rel="preconnect">` for
fonts.googleapis.com and fonts.gstatic.com (crossorigin). Fallback stack metrics are
close enough (heavy uppercase) that CLS stays minor; no self-hosting for v1.

### Accessibility skeleton (A-gate fold-back #2, #7)
- First element in <body>: `<a class="skip-link" href="#main">Skip to content</a>`
  (visually hidden until focused), matching docs/dev/index.html convention.
- Content wrapped in `<main id="main">`.
- Heading hierarchy strict: h1 = hero only; h2 = every section title (web-ai stage,
  workflow, code-artifacts, verification, docs band); h3 = sub-items (vendor panels,
  workflow tiles). No level skips.

### JS marker mechanism (A-gate fold-back #3)
- Inline `<script>document.documentElement.classList.add('js')</script>` as the LAST
  line of <head>, before first paint (no FOUC window since reveal-hidden rules only
  match html.js).
- ALL motion-hidden states are scoped `html.js .reveal { opacity:0; transform:... }`;
  base rules keep content fully visible. No-JS = complete static page by construction.

## Page structure (section map)
1. **nav** (sticky, bg concrete, 3px bottom border): AGBROWSE wordmark · WEB-AI / WORKFLOW / ARTIFACTS / GATES / DOCS / 한국어 / GITHUB. Mobile: wraps to single row scrollable.
2. **hero** `#top`: giant uppercase headline "BROWSER HANDS FOR AI AGENTS." with HANDS on chartreuse highlight; sub in mono (web-ai vendors named); CTA `$ npm i -g agbrowse` (chartreuse, offset shadow) + secondary "Developer docs"; centerpiece terminal window (white opaque, black title bar) with real web-ai send/poll commands. Hero fits viewport leaving next-section hint.
3. **stat strip** (ink band, white mono uppercase): 3 vendors one CLI · 0 MCP servers · durable session ids · zip artifacts. Doubles as scroll cue.
4. **web-ai signature section** `#web-ai` — THE fullscreen transition: sticky 100dvh stage, scroll scrubs through 3 full-screen panels (ChatGPT → Gemini → Grok), each an opaque poster slab: vendor name huge, mode specs mono, matching command snippet. Panel swap = horizontal translateX scrub (sticky + rAF scroll handler, JS-only driver). Travel = 3x100dvh. Reduced-motion/no-JS: three stacked static panels in document order.
   A-gate fold-back #4: sticky stage height uses `100svh` (not dvh) so iOS toolbar
   states never clip; section height = `calc(3 * 100svh)` (sticky consumes 1 viewport; travel = 2 x 100svh for the 2 panel swaps, no trailing dead zone). No
   transform/overflow on sticky ancestors. Scrub driver is the JS rAF path ONLY
   (no CSS scroll-driven double-drive; open question 2 resolved: JS-only).
   A-gate fold-back #5: hero/panel commands mirror README canonical patterns —
   `web-ai send` always shows `--inline-only`.
   Mobile nav (open question 3): `overflow-x:auto` single row, `-webkit-overflow-scrolling:touch`,
   right-edge cut-off acts as scroll cue; no hamburger for 7 short items.
   Stat strip (open question 4): one-shot staggered fade-up on load via the same
   html.js-gated reveal class; no counters, no marquee.
5. **workflow** `#workflow`: OBSERVE → ACT → COLLECT, three chunky numbered tiles (01/02/03) with real commands; staggered reveal on entry (supporting motion 1).
6. **code artifacts** `#code-artifacts`: "GENERATE FIRST, RECOVER LATER." split: left explanation, right white terminal with web-ai code / code-extract flow. Reveal (shares supporting motion 1 class).
7. **verification** `#verification`: "RELEASE GATES ARE EXPLICIT." — ledger-style stacked rows (typecheck/module-graph, release-gates/gate:all, runtime contracts, Pages state), mono, hard rules between rows.
8. **docs band**: ink band — Developer docs EN / 한국어 docs / GitHub / npm, big block links.
9. **footer**: one-liner (provider drift + local gates), mono, small.

## Motion map (FE-MOTION-BUCKET-01: LANDING, floor 2 ceiling 4)
- **Signature (1)**: fullscreen vendor panel scrub in #web-ai (sticky + translateX, rAF-throttled scroll listener; passive). User-requested "풀 스크린 전환효과".
- **Supporting (2)**: staggered fade-up reveal for workflow tiles + section headings via IntersectionObserver adding `.in` class (CSS transition transform/opacity only).
- **Supporting (3)**: hero terminal "typing" caret blink + stat-strip marquee-free counter reveal on load (CSS only, one-shot). Counts as one supporting moment.
- Feedback: hover = translate(-2px,-2px) + shadow grows to 10px; active = translate(2px,2px) + shadow shrinks. Enumerated transition properties only.
- Total scroll-driven moments: 2 (signature + reveal family) ≤ ceiling 4. ✓
- prefers-reduced-motion: kill scrub (static stacked panels), kill reveals (opacity 1), keep hover color feedback.
- No-JS: content fully visible (reveals default hidden ONLY when JS adds a marker class to <html>).

## File change map
- `docs/index.html` — full rewrite (single file, inline CSS+JS as today). Keep: all meta/OG/canonical/favicon lines (title/desc may be polished), all external hrefs (npm, GitHub, dev/index.html, dev/ko/index.html), section ids workflow/web-ai/code-artifacts/verification.
- `devlog/context/redesign-candidates/` — this doc + verify/ screenshots.
- No other files.

## Accept criteria (per goalplan)
cr-design (this doc + A-gate), cr-render (3 viewports observed), cr-motion (2+ scroll-offset proofs), cr-reduced (reduced-motion capture), cr-links (href/id audit), cr-antislop (rg 0 matches: backdrop-filter, blur(, gradient, purple hues), cr-review (C-gate opus reviewer).
Activation scenarios (C-ACTIVATION-GROUNDING-01):
- Scrub path: trigger by scripted scroll to offsets inside #web-ai travel; observe different panel positions in screenshots.
- Reduced-motion branch: trigger via CDP `Emulation.setEmulatedMedia prefers-reduced-motion=reduce` (or --force-prefers-reduced-motion flag); observe stacked static panels all visible.
- No-JS branch: trigger with --disable-javascript screenshot? (Chrome headless flag unreliable) → alternative: grep-verify hidden-state classes are gated on `html.js` marker + one screenshot with JS disabled via CDP if available; minimum bar = code-level gating verified.
- @supports fallback: code-level verification (scrub uses rAF JS path universally; CSS scroll-driven only as enhancement if added).

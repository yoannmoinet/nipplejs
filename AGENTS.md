# CLAUDE.md — NippleJS

## Project Overview

NippleJS is a vanilla virtual joystick library for touch-capable interfaces. Zero dependencies, TypeScript-first, supports mouse and touch input.

**Repository:** `github.com/yoannmoinet/nipplejs`
**License:** MIT

## Monorepo Structure

Yarn 4 workspaces (`"packageManager": "yarn@4.6.0"`). Run `yarn install` from root.

```
packages/
├── nipplejs/     # Core library (TypeScript, Rollup build)
├── docs/         # Documentation website (Astro 6, Tailwind 4)
├── tests/        # E2E (Playwright) and unit (Jest) tests
├── tools/        # Build/version management CLI (Clipanion)
└── assets/       # Logo images
```

## Key Commands

```bash
yarn build              # Build nipplejs library (Rollup)
yarn lint               # ESLint (flat config, ESLINT_USE_FLAT_CONFIG=true)
yarn test:unit          # Jest unit tests (196 tests)
yarn test:e2e           # Playwright e2e tests (50 tests)
yarn typecheck          # TypeScript type checking
yarn workspace @nipple/docs dev    # Astro docs dev server (localhost:4321)
yarn workspace @nipple/docs build  # Build static docs site
```

## Architecture — Core Library

### Class Hierarchy

```
Super (event system, DOM binding, logging)
├── Factory (singleton, manages all collections, document-level events)
├── Collection (manages joysticks in a zone, returned by nipplejs.create())
└── Joystick (individual joystick instance, DOM + position + direction)
```

### Event Flow

Joystick → Collection (bubbled) → Factory (bubbled). Events are space/comma-separated strings. Handler signature: **single argument** `(evt) => { evt.type, evt.data }`.

**IMPORTANT:** v1 uses a single `evt` argument, NOT `(evt, data)`. The old v0 two-argument signature is gone.

### Key Files

- `packages/nipplejs/src/index.ts` — Public API: `create()`, `factory`, `setLogLevel()`, `getLogLevel()`
- `packages/nipplejs/src/Collection.ts` — processOnStart/Move/End, reposition(), ResizeObserver
- `packages/nipplejs/src/Joystick.ts` — buildEl(), start(), end(), computeDirectionAndTriggerEvents(), triggerDirectionEvents()
- `packages/nipplejs/src/Super.ts` — on/off/trigger event system, logLevel, bindEvt/unbindEvt
- `packages/nipplejs/src/types.ts` — All TypeScript interfaces
- `packages/nipplejs/src/constants.ts` — Event bindings (pointer/touch/mouse), modes. SSR-safe (`typeof window` guards).
- `packages/nipplejs/src/utils.ts` — processEvents(), distance(), angle(), etc.

### Important Behaviors

- **`move` event fires continuously** on every pointermove, not just on direction changes.
- **`color` option** accepts a string OR `{ front: string, back: string }` object. CSS `background` property is used, so gradients, images, and `url()` work.
- **`baseDelta`** is included in move event data when `follow: true`. It contains the per-frame joystick base displacement.
- **`reposition()`** is a public method on Collection. Called automatically via ResizeObserver on the zone. Also refreshes `factory.scroll`.
- **`logLevel`** defaults to `'warning'`. Set via `nipplejs.setLogLevel()`. `log()` only fires at `debug` level.
- **Zone position warning** — Collection constructor warns if zone has `position: static`.
- **Pointer events** are the primary binding (`pointerdown`, `pointermove`, `pointerup`). Falls back to touch/mouse.
- **`preventDefault()` only on move events** — not on `pointerdown`, to avoid breaking multitouch. The zone sets `touch-action: none` and `user-select: none` instead.
- **SSR-safe** — `window` access in `constants.ts` is guarded with `typeof window !== 'undefined'`.

## Architecture — Docs Website

Astro 6 standalone (no Starlight) with Tailwind CSS 4 via `@tailwindcss/vite`.

### Visual Theme: "Aurora Neon"

- Dark base `#08081a` with 48px grid overlay
- Animated gradient blobs (indigo, cyan, pink) with 80px blur
- Frosted glass surfaces (`.glass` class)
- Cursor-following grid highlight via CSS mask (disabled on mobile)
- Monospace accents (JetBrains Mono)

### Game Demos

5 interactive canvas games, each showcasing a nipplejs option:

| Game | File | Option |
|------|------|--------|
| Neon Snake | `neon-snake.ts` | `mode: 'static'` |
| Asteroid Dodge | `asteroid-dodge.ts` | `lockX: true` |
| Dual-Stick Arena | `dual-stick-arena.ts` | multitouch (two `create()` calls) |
| Space Observatory | `space-observatory.ts` | `follow: true` + `baseDelta` |
| Space Drift | `space-drift.ts` | `restJoystick: false` |

#### Game Architecture

- Games use `offsetWidth`/`offsetHeight` for canvas sizing (NOT `getBoundingClientRect()` which is affected by CSS transforms).
- **Mobile performance:** `shadowBlur` is disabled on mobile (`isMobile` flag). Logo particles and grid highlight are disabled on touch devices.
- **Firefox:** 1.3x `speedScale` multiplier to compensate for slower Canvas2D frame rates.
- **`speedScale`**: computed from canvas diagonal relative to 800px reference, so fullscreen games feel proportional.
- **Particle effects:** Explosion on enemy kill (dual-stick, asteroid-dodge), consumption sparkle on orb/target/waypoint collection (snake, observatory, space-drift). Screen shake and flash on impact.
- **Memory cleanup:** All game arrays cleared in `destroy()` to prevent leaks between game switches.
- **Difficulty ramp:** Asteroid Dodge and Dual-Stick Arena get progressively harder — faster enemies, shorter spawn intervals.

#### Game-Specific Details

- **Neon Snake:** Green/emerald color scheme (`#10b981`), distinct from orbs. Thick body with dark border outline, highlight stripe, eyes tracking heading.
- **Asteroid Dodge:** Canvas tilt (lerped) in movement direction. Pre-clears canvas before tilt to hide edge artifacts. Fast background motion lines.
- **Dual-Stick Arena:** SVG icons on joystick thumbs (move arrows, crosshair). Files at `public/assets/move.svg`, `public/assets/shoot.svg`.
- **Space Observatory:** Scope SVG at `public/assets/scope.svg`. Uses `restOpacity: 0.8` for always-visible joystick. Back gradient with hard-edge border ring.
- **Space Drift:** Exhaust particles from ship back while joystick has force. `joystickForce` persists after release (matches `restJoystick: false`).

### JoystickDemo Component

`packages/docs/src/components/JoystickDemo.astro` — orchestrates games with:
- Code pane (Shiki syntax highlighted, cached singleton highlighter on `globalThis`)
- Debug overlay (live event data + event log, cleared on restart to prevent duplication)
- Fullscreen mode (moves wrapper to `document.body` to escape transform context)
- Start overlay with game title, description, badges, and Start button
- Game buttons (fullscreen, code, debug) at z-30, clickable without starting the game
- Only one game active at a time (global `window.__nippleGames`)
- Code pane toggle triggers `reposition()` after transition
- Code pane closes on carousel navigation and game switch

**Code snippets** in `JoystickDemo.astro` must stay in sync with actual game configs in `packages/docs/src/games/*.ts` — especially `color` values, `restOpacity`, icon references.

### Landing Page Carousel

Flex-based horizontal carousel with `translateX` transitions. Slides at 75% width, neighbors visible with blur/tilt (perspective/rotateY on desktop only). Full viewport width (breaks out of `max-w-5xl`).

- Active slide z-20 (above arrows), neighbors z-1 (behind arrows)
- Track wrapper at z-10 so active game + code pane renders above arrows
- Stops game loops for non-active slides (performance)
- Calls `reposition()` on active games after 550ms transition
- Closes all code panes on `goTo()`
- Firefox detection: skips `filter: blur()` on neighbors (Bug 1125767)
- Mobile: full-width slides, no perspective, particles/grid disabled

### OG Images

Three sizes in `packages/docs/public/assets/`:
- `og-1200x630.png` — Open Graph (Facebook, LinkedIn, Discord)
- `og-1200x600.png` — Twitter/X `summary_large_image`
- `og-800x800.png` — Square (WhatsApp, Slack)

Captured with Playwright from the hero section. To regenerate: start the dev server, run a Playwright script that hides the header/buttons/toolbar, injects extra padding on `#hero`, and clips the section at exact target dimensions. The aurora background fills seamlessly — no solid color bars.

Meta tags in `BaseLayout.astro`: `og:image`, `og:title`, `og:description`, `twitter:card`, `twitter:image`.

## Code Style & Conventions

- **4 spaces** indentation
- **ESLint flat config** (`eslint.config.mjs`), Prettier integration
- **Husky pre-commit** with lint-staged
- Single quotes, trailing commas
- `arca/import-ordering` and `arca/newline-after-import-section` for import organization
- `@typescript-eslint/consistent-type-imports` — use `import type` for type-only imports

## Testing

- **Unit tests:** Jest with ts-jest. Test files colocated: `*.test.ts` next to source.
- **E2E tests:** Playwright, Chromium only. Tests in `packages/tests/src/e2e/`.
- **Test fixtures:** `packages/tests/src/_playwright/testParams.ts` provides `startJoystick`, `moveJoystick`, `releaseJoystick`, `locateJoystick`.
- **Codepen demo page:** `packages/tests/src/_playwright/public/codepen-demo.html` — used by e2e tests. Initial collection creation is synchronous (`createCollection('dynamic')` not throttled).

### Known Testing Gotchas

- E2e `waitForFunction` timeouts are 2000ms (increased from 500ms for CI reliability).
- The codepen demo's `createThrottle` had a race condition with test clicks — fixed by calling `createCollection()` directly at page load.
- Static indices (`Collection.index`, `Joystick.index`) are global — test expectations depend on creation order.
- Directional events e2e test needs 400ms delay between moves to let dynamic joysticks fully fade and be destroyed.

## CI/CD

- **CI:** `.github/workflows/ci.yaml` — unit tests, e2e tests, linting + typecheck (including `astro check` on docs) on PR.
- **Release:** `.github/workflows/release.yaml` — publish to NPM with OIDC provenance. Triggers on GitHub release publish or manual dispatch with optional version input. Updates and commits `package.json` when version is provided. Restricted to `master` branch.
- **Docs deploy:** `.github/workflows/docs.yaml` — builds and deploys to GitHub Pages (on push to master + manual dispatch). Uses `corepack enable` for Yarn 4.
- **GitHub Pages** base path: `/nipplejs/`

## Migration Notes (v0 → v1)

- `maxNumberOfNipples` → `maxNumberOfJoysticks`
- `destroyed` event → `joystickDestroyed`
- `joystick.el` → `joystick.ui.el`
- `show()`, `hide()`, `add()`, `remove()` removed
- `manager.get()` → `manager.getJoystickByUid()` or `manager.all`
- `manager.id` → `manager.uid`, `manager.ids` removed
- Event handler: `(evt, data)` → `(evt)` with `evt.data`
- `move` now fires continuously (was direction-change only)

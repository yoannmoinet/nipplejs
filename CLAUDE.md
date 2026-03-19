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
yarn test:unit          # Jest unit tests (192 tests)
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
- `packages/nipplejs/src/Joystick.ts` — buildEl(), start(), end(), computeDirectionAndTriggerEvents()
- `packages/nipplejs/src/Super.ts` — on/off/trigger event system, logLevel, bindEvt/unbindEvt
- `packages/nipplejs/src/types.ts` — All TypeScript interfaces
- `packages/nipplejs/src/constants.ts` — Event bindings (pointer/touch/mouse), modes
- `packages/nipplejs/src/utils.ts` — processEvents(), distance(), angle(), etc.

### Important Behaviors

- **`move` event fires continuously** on every pointermove, not just on direction changes. The early return that skipped `trigger('move')` when direction was unchanged was a bug we fixed.
- **`color` option** accepts a string OR `{ front: string, back: string }` object. CSS `background` property is used, so gradients and `url()` work.
- **`baseDelta`** is included in move event data when `follow: true`. It contains the per-frame joystick base displacement.
- **`reposition()`** is a public method on Collection. Called automatically via ResizeObserver on the zone. Also refreshes `factory.scroll`.
- **`logLevel`** defaults to `'warning'`. Set via `nipplejs.setLogLevel()`. `log()` only fires at `debug` level.
- **Zone position warning** — Collection constructor warns if zone has `position: static`.
- **Pointer events** are the primary binding (`pointerdown`, `pointermove`, `pointerup`). Falls back to touch/mouse.

## Architecture — Docs Website

Astro 6 standalone (no Starlight) with Tailwind CSS 4 via `@tailwindcss/vite`.

### Visual Theme: "Aurora Neon"

- Dark base `#08081a` with 48px grid overlay
- Animated gradient blobs (indigo, cyan, pink) with 80px blur
- Frosted glass surfaces (`.glass` class)
- Cursor-following grid highlight via CSS mask
- Monospace accents (JetBrains Mono)

### Game Demos

5 interactive canvas games, each showcasing a nipplejs option:

| Game | File | Option |
|------|------|--------|
| Neon Snake | `fog-explorer.ts` | `mode: 'static'` |
| Asteroid Dodge | `asteroid-dodge.ts` | `lockX: true` |
| Dual-Stick Arena | `dual-stick-arena.ts` | `multitouch: true` |
| Space Observatory | `endless-chase.ts` | `follow: true` + `baseDelta` |
| Space Drift | `space-drift.ts` | `restJoystick: false` |

**Note:** File names don't match game names (historical). `fog-explorer.ts` is the snake game, `endless-chase.ts` is the space observatory.

Games use `offsetWidth`/`offsetHeight` for canvas sizing (NOT `getBoundingClientRect()` which is affected by CSS transforms).

### JoystickDemo Component

`packages/docs/src/components/JoystickDemo.astro` — orchestrates games with:
- Code pane (Shiki syntax highlighted, cached singleton highlighter on `globalThis`)
- Debug overlay (live event data + event log)
- Fullscreen mode
- Click-to-start overlay
- Only one game active at a time (global `window.__nippleGames`)

### Landing Page Carousel

Flex-based horizontal carousel with `translateX` transitions. Slides at 75% width, neighbors visible with blur/tilt. Full viewport width (breaks out of `max-w-5xl`). Calls `reposition()` on active games after 550ms transition.

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

## CI/CD

- **CI:** `.github/workflows/ci.yaml` — unit tests, e2e tests, linting (on PR)
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

# NippleJS Documentation Website — Design Spec

## Overview

A modern documentation website for NippleJS v1, built with Astro and deployed to GitHub Pages via a custom GitHub Actions workflow. The site features interactive demos powered by mini games that showcase specific library options, styled with a dark "Aurora Neon" visual theme.

**URL:** `https://yoannmoinet.github.io/nipplejs/`
**Source:** `packages/docs` in the monorepo

## Tech Stack

- **Framework:** Astro (standalone, no Starlight)
- **Styling:** Tailwind CSS
- **Content:** MDX (Markdown with embedded Astro components)
- **Syntax highlighting:** Shiki (built into Astro)
- **Demos:** Vanilla JS/Canvas, hydrated as Astro islands
- **Deployment:** GitHub Actions → GitHub Pages

## Docs Package

New workspace package at `packages/docs`.

```json
{
  "name": "@nipple/docs",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5",
    "@astrojs/mdx": "latest",
    "@tailwindcss/vite": "^4",
    "tailwindcss": "^4",
    "nipplejs": "workspace:*"
  }
}
```

**Notes:**
- `@tailwindcss/vite` is used instead of `@astrojs/tailwind` because Tailwind v4 uses a Vite plugin directly.
- `@astrojs/mdx` version is left as `latest` to track the correct Astro 5 compatible release.
- `nipplejs` is resolved via workspace protocol. Astro's Vite bundler resolves the package's `exports` field, which points to `./src/index.ts` — so both dev and production builds compile from source.
- In CI, `yarn build` (nipplejs) runs before the docs build to ensure the dist output exists for the published package, though the docs build itself compiles from source.

## Astro Config

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://yoannmoinet.github.io',
  base: '/nipplejs',
  output: 'static',
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
    },
  },
});
```

## Project Structure

```
packages/docs/
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── public/
│   └── assets/                    # logo, og-image, favicon
├── src/
│   ├── layouts/
│   │   ├── BaseLayout.astro       # <html>, <head>, global styles, aurora background
│   │   └── DocsLayout.astro       # sidebar + content + ToC wrapper
│   ├── components/
│   │   ├── Header.astro           # top nav (logo, links, GitHub)
│   │   ├── Sidebar.astro          # left nav with sections
│   │   ├── TableOfContents.astro  # right-side heading links
│   │   ├── MobileNav.astro        # hamburger menu for mobile
│   │   ├── CodeBlock.astro        # syntax-highlighted code with copy button
│   │   ├── JoystickDemo.astro     # interactive demo island (client:visible)
│   │   └── Footer.astro
│   ├── games/
│   │   ├── types.ts               # shared game interface
│   │   ├── fog-explorer.ts        # mode: 'static', single joystick
│   │   ├── asteroid-dodge.ts      # mode: 'static', lockX: true
│   │   ├── dual-stick-arena.ts    # mode: 'static', multitouch: true, 2 zones
│   │   ├── endless-chase.ts       # follow: true
│   │   └── space-drift.ts         # restJoystick: false
│   ├── pages/
│   │   ├── index.astro            # landing/hero page
│   │   ├── getting-started.mdx
│   │   ├── options.mdx
│   │   ├── api.mdx
│   │   ├── events.mdx
│   │   ├── examples.mdx
│   │   └── migration.mdx
│   └── styles/
│       └── global.css             # Tailwind directives, aurora background, grid, glow utilities
```

## Visual Design System — Aurora Neon

A hybrid of soft aurora glows and gaming-inspired elements.

### Background
- Dark base: `#08081a`
- Subtle grid overlay: `rgba(139,92,246,0.04)` lines, 24px spacing
- Animated gradient blobs (indigo, cyan, pink) with `filter: blur(40px)`, pulsing on 6-8s ease-in-out cycles

### Colors
- **Backgrounds:** `#08081a` (base), `rgba(255,255,255,0.04)` (card surfaces)
- **Text:** `#f1f5f9` (headings), `#94a3b8` (body), `#64748b` (muted)
- **Accents:** indigo `#818cf8`, cyan `#38bdf8`, purple `#a78bfa`, pink `#e879f9`
- **Borders:** `rgba(255,255,255,0.06)` to `rgba(255,255,255,0.1)`

### Surfaces
Frosted glass: `backdrop-filter: blur(8px)`, semi-transparent backgrounds, subtle borders. Used for code blocks, demo containers, feature cards, nav elements.

### Typography
- Body: system font stack
- Code/accents: monospace (JetBrains Mono via CDN or system monospace)
- Hero headings: gradient text via `-webkit-background-clip: text`

### Motion
- Slow-pulsing aurora blobs (6-8s ease-in-out) — the only animation
- Everything else is static — alive without being distracting

### Gaming Accents
- Glowing status dots (6px circles with `box-shadow: 0 0 6px`)
- Monospace stat counters with `text-shadow` glow
- Subtle monospace comments (`// zero deps · typescript`)

### Responsive Breakpoints

Uses Tailwind defaults:
- **≥1280px (xl):** Three-column layout (sidebar + content + ToC)
- **≥768px (md):** Two-column layout (sidebar + content), ToC hides
- **<768px:** Single column, sidebar collapses into hamburger menu, full-width content and demos

### Accessibility

- Semantic HTML: `<nav>`, `<main>`, `<article>`, `<aside>` for layout regions
- ARIA labels on interactive elements (hamburger menu, demo containers)
- Keyboard navigation for sidebar and mobile menu
- Focus-visible outlines styled to match Aurora Neon accents
- Sufficient contrast ratios (all text/background combinations meet WCAG AA)
- Games are supplementary — all documentation content is accessible without interacting with demos

## Pages

### Landing Page (`index.astro`)

Full custom layout (not DocsLayout). Sections:

1. **Hero:** Gradient heading ("Virtual joysticks for the modern web"), monospace subtitle, two CTAs (Get Started button + `npm i nipplejs` code pill)
2. **Stats:** Three frosted glass cards — 3 Modes, 0 Dependencies, TS Native — with glowing monospace numbers
3. **Games showcase:** All 5 mini games in sequence, each with title, short description, and option badges showing which nipplejs feature it demonstrates
4. **Footer:** GitHub link, npm link

### Docs Pages (`DocsLayout.astro`)

Three-column layout:
- **Left:** Sidebar navigation
- **Center:** MDX content with inline demos
- **Right:** Table of contents (heading links)

Responsive behavior follows the breakpoints defined above.

### Content Pages

- **Getting Started:** Installation (npm/yarn/pnpm/CDN), usage (ESM/CJS/UMD), "your first joystick" with inline demo
- **Options:** Each option documented with name, type, default, description. Related options grouped (lockX/lockY, restJoystick/restOpacity, multitouch/maxNumberOfJoysticks). Interactive demos inline where relevant.
- **API Reference:** Documents the public API surface that `nipplejs.create()` exposes. The public API has two layers:
  - **Collection** (returned by `nipplejs.create()`): the "manager" that owns joystick instances. Methods: `on`, `off`, `destroy`, `getJoystickByUid`. Properties: `uid`, `all` (`Map<Uid, Joystick>`), `options`.
  - **Joystick** (accessed via collection events or `collection.all`): individual joystick instances. Methods: `on`, `off`, `destroy`, `setPosition`. Properties: `uid`, `identifier`, `position`, `frontPosition`, `ui`, `options`, `collection` (back-reference to parent), `direction`, `pressure`.
  - The `Factory` singleton (`nipplejs.factory`) is documented briefly as an advanced topic — it tracks joysticks across ALL collections. Its `getJoystickByUid` searches globally, whereas `collection.getJoystickByUid` is scoped to that collection. Also exposes `getJoystickByIdentifier`.
- **Events:** Full v1 event taxonomy documented by layer:
  - **Joystick events:** `start`, `end`, `move`, `dir` (+ dir:up/down/left/right), `plain` (+ plain:up/down/left/right), `shown`, `hidden`, `rested`, `added`, `removed`, `joystickCreated`, `joystickDestroyed`, `attached`, `detached`, `pressure`
  - **Collection events:** All joystick events (bubbled up) + `collectionCreated`, `collectionDestroyed`
  - **Factory events:** All collection events (bubbled up) + `factoryCreated`, `factoryDestroyed`
  - Each event documented with TypeScript data shape, code example, and inline demo where relevant.
- **Examples:** The 5 games as full cookbook entries with demos + copyable code.
- **Migration Guide:** Documents breaking changes from v0 to v1. Derived from the codebase diff during implementation. Known changes include:
  - `maxNumberOfNipples` → `maxNumberOfJoysticks`
  - `destroyed` event → `joystickDestroyed`
  - `joystick.el` → `joystick.ui.el`
  - Removal of `show()`, `hide()`, `add()`, `remove()` public methods
  - `manager.get()` removed, use `manager.getJoystickByUid()` or `manager.all`
  - `manager.id` → `manager.uid`, `manager.ids` removed
  - Full list to be completed during implementation by comparing v0 and v1 APIs

## Sidebar Navigation

```
Getting Started
  ├── Installation
  ├── Quick Start
  └── Your First Joystick

Options
  ├── zone
  ├── mode
  ├── color / size
  ├── threshold
  ├── fadeTime
  ├── multitouch / maxNumberOfJoysticks
  ├── position
  ├── restJoystick / restOpacity
  ├── catchDistance
  ├── lockX / lockY
  ├── shape
  ├── follow
  ├── dynamicPage
  └── dataOnly

API Reference
  ├── Collection (Manager)
  ├── Joystick
  └── Factory (Advanced)

Events
  ├── Joystick Events
  ├── Collection Events
  └── Factory Events

Examples
  ├── Fog Explorer
  ├── Asteroid Dodge
  ├── Dual-Stick Arena
  ├── Endless Chase
  └── Space Drift

Migration Guide
  └── v0 → v1
```

Related options are grouped on the same page with individual anchors so sidebar links jump directly to each.

## Interactive Demo System

### Game Module Interface

Each game module exports a `createGame` function conforming to a shared interface:

```typescript
// src/games/types.ts

import type { CollectionOptions } from 'nipplejs';

interface GameConfig {
  /** The nipplejs options for each joystick zone this game needs. */
  zones: Array<{
    options: CollectionOptions;
    /** CSS position within the game container. */
    position: { left: string; top: string; width: string; height: string };
  }>;
}

interface GameInstance {
  /** Start the game loop. Called after nipplejs instances are created. */
  start(canvas: HTMLCanvasElement, joysticks: Collection[]): void;
  /** Clean up (stop loop, remove listeners). */
  destroy(): void;
}

type CreateGame = (container: HTMLElement) => {
  config: GameConfig;
  create: () => GameInstance;
};
```

The `JoystickDemo` component reads the game's `config.zones` array to create the correct number of nipplejs instances with the right options. Most games have one zone; Dual-Stick Arena has two. The game module never creates nipplejs instances itself — it receives them.

### JoystickDemo Component

A reusable Astro island (`client:visible`) that orchestrates games.

```astro
<JoystickDemo
  game="fog-explorer"
  highlight={['mode']}
/>
```

**Lifecycle:**
1. Import the game module
2. Call `createGame(container)` to get `config` and `create`
3. For each `config.zones` entry, create a `<div>` zone and call `nipplejs.create(zone.options)`
4. Create the canvas, call `game.create().start(canvas, joysticks)`
5. On unmount, call `game.destroy()` and destroy all nipplejs instances

**Container:** Frosted glass card, ~400px tall, full-width on mobile.
**Overlay:** Small monospace badges showing highlighted options.
**Hydration:** `client:visible` — only loads when scrolled into view.

### Game Table

| Game | Zones | Options Showcased | Gameplay |
|------|-------|------------------|----------|
| **Fog Explorer** | 1 | `mode: 'static'` | Navigate a glowing dot through fog, revealing the arena |
| **Asteroid Dodge** | 1 | `lockX: true` | Dodge falling asteroids, horizontal movement only |
| **Dual-Stick Arena** | 2 | `multitouch: true` | Left stick moves, right stick aims/shoots enemies |
| **Endless Chase** | 1 | `follow: true` | Flee a pursuer, joystick tracks your thumb |
| **Space Drift** | 1 | `restJoystick: false` | Set heading and release, ship keeps drifting |

### Visual Style

Games use simple geometric shapes (circles, triangles, squares) with Aurora Neon effects:
- Gradient fills
- Canvas `shadowBlur` glow
- Particle trails
- Fog/bloom layers
- No sprites — geometry that looks stunning

### Placement

Each game appears twice:
1. **Landing page:** All 5 in sequence as a showcase
2. **Docs pages:** Inline next to the option/feature it demonstrates

Same component, two contexts.

## Deployment

### GitHub Actions Workflow (`.github/workflows/docs.yaml`)

**Triggers:**
- Push to `master` when `packages/docs/**` or `packages/nipplejs/src/**` change
- Manual `workflow_dispatch`

**Permissions:** `pages: write`, `id-token: write`
**Concurrency:** `group: pages`, `cancel-in-progress: false`

**Steps:**
1. Checkout
2. Setup Node (version from `package.json`)
3. Enable Corepack (`corepack enable` — required for Yarn 4)
4. `yarn install`
5. `yarn build` (builds nipplejs dist)
6. `yarn workspace @nipple/docs build` (builds Astro static site)
7. `actions/upload-pages-artifact` → `packages/docs/dist/`
8. `actions/deploy-pages` → `github-pages` environment

The docs workflow does NOT run tests or lint — those are handled by the existing CI workflow. This workflow only builds and deploys.

# NippleJS Documentation Website — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a modern documentation website for NippleJS v1 with interactive game demos, using Astro + Tailwind CSS.

**Architecture:** Astro standalone site in `packages/docs` within the existing Yarn monorepo. Content authored in MDX, styled with Tailwind v4 via Vite plugin. Interactive demos are Astro islands wrapping vanilla JS/Canvas games that showcase nipplejs options. Deployed to GitHub Pages via custom Actions workflow.

**Tech Stack:** Astro 5, Tailwind CSS 4, MDX, Shiki, vanilla JS/Canvas, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-18-documentation-website-design.md`

---

## File Map

```
packages/docs/
├── package.json                          # @nipple/docs workspace package
├── astro.config.mjs                      # Astro + MDX + Tailwind Vite plugin
├── tsconfig.json                         # Astro TypeScript config
├── public/
│   └── assets/
│       ├── nipplejs.png                  # Copy from packages/assets/src/
│       └── favicon.svg                   # Simple SVG favicon
├── src/
│   ├── styles/
│   │   └── global.css                    # Tailwind imports, aurora background, grid, glow utilities
│   ├── layouts/
│   │   ├── BaseLayout.astro              # <html>, <head>, meta, global CSS, aurora blobs
│   │   └── DocsLayout.astro              # Sidebar + content + ToC three-column wrapper
│   ├── components/
│   │   ├── Header.astro                  # Top nav bar (logo, page links, GitHub)
│   │   ├── Sidebar.astro                 # Left navigation with sections and links
│   │   ├── TableOfContents.astro         # Right-side heading links (auto-generated from headings)
│   │   ├── MobileNav.astro               # Hamburger menu overlay for <768px
│   │   ├── CodeBlock.astro               # Fenced code with copy button and frosted glass style
│   │   ├── Footer.astro                  # GitHub + npm links
│   │   └── JoystickDemo.astro            # client:visible island that orchestrates game + nipplejs
│   ├── games/
│   │   ├── types.ts                      # GameConfig, GameInstance, CreateGame interfaces
│   │   ├── fog-explorer.ts               # Static mode, single joystick, fog reveal
│   │   ├── asteroid-dodge.ts             # Static mode, lockX, horizontal dodging
│   │   ├── dual-stick-arena.ts           # Static mode, multitouch, 2 zones, move + aim/shoot
│   │   ├── endless-chase.ts              # follow: true, flee a pursuer
│   │   └── space-drift.ts               # restJoystick: false, inertial drift
│   └── pages/
│       ├── index.astro                   # Landing page: hero, stats, game showcase
│       ├── getting-started.mdx           # Install, usage, first joystick
│       ├── options.mdx                   # All options with inline demos
│       ├── api.mdx                       # Collection, Joystick, Factory API
│       ├── events.mdx                    # Full event taxonomy
│       ├── examples.mdx                  # 5 games as cookbook entries
│       └── migration.mdx                 # v0 → v1 breaking changes

.github/workflows/docs.yaml              # GitHub Pages deployment workflow
.gitignore                                # Add .superpowers/ entry
```

---

## Task 1: Scaffold the docs package and verify dev server boots

**Files:**
- Create: `packages/docs/package.json`
- Create: `packages/docs/astro.config.mjs`
- Create: `packages/docs/tsconfig.json`
- Create: `packages/docs/src/pages/index.astro` (placeholder)
- Create: `packages/docs/src/styles/global.css`
- Modify: `.gitignore` (add `.superpowers/`)

- [ ] **Step 1: Create `packages/docs/package.json`**

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

- [ ] **Step 2: Create `packages/docs/astro.config.mjs`**

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

- [ ] **Step 3: Create `packages/docs/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict"
}
```

- [ ] **Step 4: Create `packages/docs/src/styles/global.css`**

```css
@import 'tailwindcss';

@theme {
  --color-base: #08081a;
  --color-surface: rgba(255, 255, 255, 0.04);
  --color-heading: #f1f5f9;
  --color-body: #94a3b8;
  --color-muted: #64748b;
  --color-accent-indigo: #818cf8;
  --color-accent-cyan: #38bdf8;
  --color-accent-purple: #a78bfa;
  --color-accent-pink: #e879f9;
  --color-border: rgba(255, 255, 255, 0.08);
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

- [ ] **Step 5: Create placeholder `packages/docs/src/pages/index.astro`**

```astro
---
import '../styles/global.css';
---
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NippleJS</title>
</head>
<body class="bg-base text-body">
  <h1 class="text-heading text-4xl font-bold p-8">NippleJS Docs</h1>
  <p class="px-8">Scaffold working.</p>
</body>
</html>
```

- [ ] **Step 6: Add `.superpowers/` to `.gitignore`**

Append `.superpowers/` to the end of `/Users/yoann/dev/nipplejs/.gitignore`.

- [ ] **Step 7: Install dependencies**

Run: `yarn install` (from repo root — Yarn 4 resolves all workspaces from root)
Expected: Astro and dependencies installed, no errors.

- [ ] **Step 8: Verify dev server starts**

Run: `yarn workspace @nipple/docs dev`
Expected: Astro dev server starts on localhost, page renders "NippleJS Docs" with dark background.

- [ ] **Step 9: Verify production build**

Run: `yarn workspace @nipple/docs build`
Expected: Static site generated to `packages/docs/dist/` with no errors.

- [ ] **Step 10: Commit**

```bash
git add packages/docs .gitignore
git commit -m "feat(docs): scaffold Astro docs package"
```

---

## Task 2: BaseLayout with Aurora Neon background

**Files:**
- Create: `packages/docs/src/layouts/BaseLayout.astro`
- Create: `packages/docs/public/assets/favicon.svg`
- Modify: `packages/docs/src/pages/index.astro` (use BaseLayout)
- Modify: `packages/docs/src/styles/global.css` (add aurora utilities)

- [ ] **Step 1: Copy logo asset**

```bash
cp packages/assets/src/nipplejs.png packages/docs/public/assets/nipplejs.png
```

- [ ] **Step 2: Create favicon SVG**

Create `packages/docs/public/assets/favicon.svg` — a simple circle with the indigo-cyan gradient:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>
  <circle cx="16" cy="16" r="14" fill="url(#g)"/>
</svg>
```

- [ ] **Step 3: Add aurora background and grid utilities to `global.css`**

Add after the `@theme` block:

```css
/* Aurora background with grid */
.aurora-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  background-color: var(--color-base);
  background-image:
    linear-gradient(rgba(139, 92, 246, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 92, 246, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Frosted glass surface */
.glass {
  background: var(--color-surface);
  backdrop-filter: blur(8px);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
}

/* Aurora glow blobs */
.aurora-blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(40px);
  pointer-events: none;
  z-index: -1;
}

@keyframes aurora-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}
```

- [ ] **Step 4: Create `BaseLayout.astro`**

```astro
---
interface Props {
  title?: string;
  description?: string;
}

const { title = 'NippleJS', description = 'A vanilla virtual joystick for touch capable interfaces' } = Astro.props;
---
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content={description} />
  <title>{title}</title>
  <link rel="icon" type="image/svg+xml" href={`${import.meta.env.BASE_URL}assets/favicon.svg`} />
  <link rel="preconnect" href="https://fonts.bunny.net" />
  <link href="https://fonts.bunny.net/css?family=jetbrains-mono:400,700" rel="stylesheet" />
</head>
<body class="bg-base text-body min-h-screen font-sans antialiased">
  <!-- Aurora background -->
  <div class="aurora-bg"></div>
  <!-- Aurora blobs -->
  <div class="aurora-blob" style="top:-60px;right:-40px;width:220px;height:220px;background:radial-gradient(circle,rgba(99,102,241,0.3),transparent 70%);animation:aurora-pulse 6s ease-in-out infinite;"></div>
  <div class="aurora-blob" style="bottom:40px;left:-30px;width:180px;height:180px;background:radial-gradient(circle,rgba(56,189,248,0.2),transparent 70%);animation:aurora-pulse 8s ease-in-out infinite;"></div>
  <div class="aurora-blob" style="bottom:-40px;right:30%;width:160px;height:160px;background:radial-gradient(circle,rgba(236,72,153,0.15),transparent 70%);animation:aurora-pulse 7s ease-in-out infinite;"></div>

  <slot />
</body>
</html>
```

- [ ] **Step 5: Update `index.astro` to use BaseLayout**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="NippleJS — Virtual Joystick">
  <main class="max-w-4xl mx-auto px-6 py-20">
    <h1 class="text-heading text-5xl font-extrabold tracking-tight">NippleJS</h1>
    <p class="text-muted mt-4 font-mono text-sm">// scaffold working</p>
  </main>
</BaseLayout>
```

- [ ] **Step 6: Verify visually**

Run: `cd packages/docs && yarn dev`
Expected: Dark page with subtle grid background, three pulsing aurora blobs, heading text visible. JetBrains Mono loading for monospace text.

- [ ] **Step 7: Commit**

```bash
git add packages/docs
git commit -m "feat(docs): add BaseLayout with Aurora Neon background"
```

---

## Task 3: Header and Footer components

**Files:**
- Create: `packages/docs/src/components/Header.astro`
- Create: `packages/docs/src/components/Footer.astro`
- Modify: `packages/docs/src/layouts/BaseLayout.astro` (add Header + Footer)

- [ ] **Step 1: Create `Header.astro`**

Top navigation bar with frosted glass style. Logo on left, page links center, GitHub link right.

```astro
---
const base = import.meta.env.BASE_URL;
const links = [
  { href: `${base}getting-started`, label: 'Docs' },
  { href: `${base}api`, label: 'API' },
  { href: `${base}examples`, label: 'Examples' },
];
---
<header class="sticky top-0 z-50 glass border-t-0 border-x-0 rounded-none">
  <nav class="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6" aria-label="Main navigation">
    <a href={base} class="flex items-center gap-2.5 shrink-0">
      <div class="w-6 h-6 rounded-full bg-gradient-to-br from-accent-indigo to-accent-cyan shadow-[0_0_12px_rgba(99,102,241,0.3)]"></div>
      <span class="text-heading font-bold text-sm tracking-tight">nipplejs</span>
      <span class="text-muted font-mono text-xs">v1.0</span>
    </a>
    <div class="flex-1"></div>
    {links.map(link => (
      <a href={link.href} class="text-muted text-sm hover:text-heading transition-colors">{link.label}</a>
    ))}
    <div class="w-px h-4 bg-border"></div>
    <a href="https://github.com/yoannmoinet/nipplejs" class="text-muted text-sm hover:text-heading transition-colors" target="_blank" rel="noopener">GitHub</a>
  </nav>
</header>
```

- [ ] **Step 2: Create `Footer.astro`**

```astro
---
const base = import.meta.env.BASE_URL;
---
<footer class="border-t border-border mt-20 py-8 text-center text-muted text-sm">
  <div class="max-w-7xl mx-auto px-4 flex items-center justify-center gap-4">
    <a href="https://github.com/yoannmoinet/nipplejs" class="hover:text-heading transition-colors" target="_blank" rel="noopener">GitHub</a>
    <span class="text-border">·</span>
    <a href="https://www.npmjs.com/package/nipplejs" class="hover:text-heading transition-colors" target="_blank" rel="noopener">npm</a>
    <span class="text-border">·</span>
    <span>MIT License</span>
  </div>
</footer>
```

- [ ] **Step 3: Add Header and Footer to `BaseLayout.astro`**

Import and add `<Header />` before `<slot />` and `<Footer />` after.

- [ ] **Step 4: Verify visually**

Run: `cd packages/docs && yarn dev`
Expected: Frosted glass header at top with logo, nav links, GitHub link. Footer at bottom. All links functional.

- [ ] **Step 5: Commit**

```bash
git add packages/docs/src
git commit -m "feat(docs): add Header and Footer components"
```

---

## Task 4: DocsLayout with Sidebar and Table of Contents

**Files:**
- Create: `packages/docs/src/components/Sidebar.astro`
- Create: `packages/docs/src/components/TableOfContents.astro`
- Create: `packages/docs/src/components/MobileNav.astro`
- Create: `packages/docs/src/layouts/DocsLayout.astro`
- Create: `packages/docs/src/pages/getting-started.mdx` (minimal placeholder to test layout)

- [ ] **Step 1: Create sidebar navigation data**

Define the navigation structure as a data object in `Sidebar.astro`. Each section has a title and array of links with `href` and `label`. Use anchors for grouped options (e.g., `options#lockx-locky`).

The full sidebar tree is defined in the spec under "Sidebar Navigation." All links point to `{base}/{page}` or `{base}/{page}#{anchor}`.

- [ ] **Step 2: Create `Sidebar.astro`**

A `<aside>` with `<nav>` containing the navigation tree. Current page link gets highlighted with the accent-indigo color. Sections are collapsible groups with section titles.

- [ ] **Step 3: Create `TableOfContents.astro`**

An `<aside>` that receives headings via props and renders an `<ol>` of anchor links. Headings are passed from DocsLayout using Astro's `getHeadings()` from MDX.

- [ ] **Step 4: Create `MobileNav.astro`**

A button (hamburger icon) that toggles a full-screen overlay with the sidebar content. Uses a `<dialog>` element for accessibility. Includes a small client-side script for open/close behavior.

- [ ] **Step 5: Create `DocsLayout.astro`**

Three-column layout using the BaseLayout:
- Left sidebar (hidden below md breakpoint, replaced by MobileNav)
- Center content area with `<article>` wrapping the `<slot />`
- Right ToC (hidden below xl breakpoint)

Responsive behavior:
- `xl`: sidebar (256px) + content (flex-1) + ToC (200px)
- `md`: sidebar (256px) + content (flex-1)
- `<md`: hamburger + full-width content

- [ ] **Step 6: Create placeholder `getting-started.mdx`**

```mdx
---
layout: ../layouts/DocsLayout.astro
title: Getting Started
---

# Getting Started

## Installation

Install nipplejs via your package manager:

```bash
npm install nipplejs
```

## Quick Start

A minimal example.

## Your First Joystick

Try it out.
```

- [ ] **Step 7: Verify the three-column layout**

Run: `cd packages/docs && yarn dev`, navigate to `/nipplejs/getting-started`
Expected: Sidebar on left with navigation, MDX content in center with headings, ToC on right linking to headings. Resize browser to verify breakpoints.

- [ ] **Step 8: Verify mobile navigation**

Resize browser below 768px. Expected: Sidebar disappears, hamburger button appears in header, clicking opens overlay with navigation.

- [ ] **Step 9: Commit**

```bash
git add packages/docs/src
git commit -m "feat(docs): add DocsLayout with sidebar, ToC, and mobile nav"
```

---

## Task 5: CodeBlock component and game infrastructure

**Files:**
- Create: `packages/docs/src/components/CodeBlock.astro`
- Create: `packages/docs/src/games/types.ts`
- Create: `packages/docs/src/components/JoystickDemo.astro`
- Create: `packages/docs/src/games/fog-explorer.ts`

- [ ] **Step 1: Create `CodeBlock.astro`**

A wrapper component for fenced code blocks with frosted glass styling and a copy-to-clipboard button. Wraps Astro's built-in Shiki-highlighted `<code>` output. The copy button appears on hover in the top-right corner. Uses the `glass` CSS class for the container.

- [ ] **Step 2: Create `packages/docs/src/games/types.ts`**

```typescript
import type nipplejs from 'nipplejs';

// nipplejs.create() returns a Collection — extract its type from the return type
type Collection = ReturnType<typeof nipplejs.create>;
type CollectionOptions = Parameters<typeof nipplejs.create>[0];

export interface ZoneConfig {
  options: CollectionOptions;
  position: { left: string; top: string; width: string; height: string };
}

export interface GameConfig {
  zones: ZoneConfig[];
}

export interface GameInstance {
  start(canvas: HTMLCanvasElement, joysticks: Collection[]): void;
  destroy(): void;
}

export type CreateGame = (container: HTMLElement) => {
  config: GameConfig;
  create: () => GameInstance;
};
```

- [ ] **Step 2: Create `JoystickDemo.astro` — component shell and markup**

Create the Astro component file with:
- Props: `game` (string — module name), `highlight` (string[] — option names to show as badges)
- A frosted glass container div (`glass` class, ~400px tall, full-width on mobile)
- A `<canvas>` element filling the container
- Option badge pills in top-right corner (frosted glass, monospace text)
- Zone overlay divs will be created dynamically by the client script

- [ ] **Step 4: Add client-side script to `JoystickDemo.astro`**

Add a `<script>` block (Astro island, `client:visible`) that:
1. Dynamically imports the game module by name using `import()`
2. Calls `createGame(container)` to get `config` and `create`
3. For each `config.zones` entry, creates a positioned `<div>` zone and calls `nipplejs.create(zone.options)` on it
4. Creates the canvas, calls `game.create().start(canvas, joysticks)`

- [ ] **Step 5: Add cleanup logic to `JoystickDemo.astro`**

Add cleanup: on component disconnect / page navigation, call `game.destroy()` and destroy all nipplejs instances. Use `IntersectionObserver` or `disconnectedCallback` if using a custom element pattern.

- [ ] **Step 6: Create `packages/docs/src/games/fog-explorer.ts`**

**Showcases:** `mode: 'static'`, single joystick — basic movement.

**Gameplay:** Player controls a glowing dot. A fog layer (dark overlay with circular reveal around player) hides the arena. Moving reveals more of the map. Small glowing orbs are scattered — collecting them increments a score counter.

**Visual style:**
- Player: small circle with indigo glow (`shadowBlur`)
- Fog: full-canvas dark overlay with radial gradient cutout around player
- Orbs: small pulsing circles in accent colors (cyan, pink, purple) with glow
- Trail: fading opacity circles behind player
- Score: monospace text in top-left

**Config:**
```typescript
config: {
  zones: [{
    options: { mode: 'static', position: { left: '50%', top: '50%' }, color: 'rgba(99,102,241,0.5)' },
    position: { left: '0', top: '0', width: '100%', height: '100%' },
  }],
}
```

**Implementation:** Use `requestAnimationFrame` loop. Listen to joystick `move` event for direction vector, `end` event to stop. Move player position each frame based on last known vector. Draw fog layer, player, orbs, trail, score each frame.

- [ ] **Step 7: Test the demo on the index page**

Add `<JoystickDemo game="fog-explorer" highlight={['mode']} client:visible />` to `index.astro` temporarily. Verify it renders, the joystick appears on touch/click, the player moves, and fog reveals.

- [ ] **Step 8: Commit**

```bash
git add packages/docs/src
git commit -m "feat(docs): add game infrastructure and Fog Explorer demo"
```

---

## Task 6: Asteroid Dodge game

**Files:**
- Create: `packages/docs/src/games/asteroid-dodge.ts`

**Showcases:** `lockX: true` — horizontal-only movement.

- [ ] **Step 1: Create game config and skeleton**

Set up `asteroid-dodge.ts` with `createGame` export, config (single zone, `mode: 'static'`, `lockX: true`, joystick bottom-center), and empty `start`/`destroy` methods.

- [ ] **Step 2: Implement game loop and player**

Ship at bottom of screen (small triangle, cyan glow). Player moves horizontally based on joystick `move` event vector. `requestAnimationFrame` loop.

- [ ] **Step 3: Add asteroids, collision, and scoring**

Asteroids fall from top at random positions (circles of varying size, purple/pink glow). Collision detection with player. Score = survival time (monospace timer). Speed increases over time. Hit = game over overlay, tap to restart.

- [ ] **Step 4: Add visual polish**

Subtle vertical lines suggesting motion in background. Asteroid rotation. Glow effects (`shadowBlur`). Particle burst on collision.

- [ ] **Step 5: Test and commit**

Add `<JoystickDemo game="asteroid-dodge" />` to index page temporarily. Verify gameplay, then commit:
```bash
git add packages/docs/src/games/asteroid-dodge.ts
git commit -m "feat(docs): add Asteroid Dodge game"
```

---

## Task 7: Dual-Stick Arena game

**Files:**
- Create: `packages/docs/src/games/dual-stick-arena.ts`

**Showcases:** `multitouch: true` — two joystick zones.

- [ ] **Step 1: Create game config and skeleton**

Set up with `createGame` export. Config: two zones — left half and right half of container. Both `mode: 'static'`, positioned at 20%/80% bottom.

- [ ] **Step 2: Implement player movement and aiming**

Player circle (indigo glow) in center. Left joystick controls movement. Right joystick controls aim direction (thin line from player showing aim). `requestAnimationFrame` loop.

- [ ] **Step 3: Add enemies, projectiles, and scoring**

Enemies (small pink/red circles, pulsing) spawn from edges, move toward player. Right joystick auto-fires projectiles (cyan trail). Collision detection. Score = enemies destroyed. Waves get denser.

- [ ] **Step 4: Add visual polish**

Glow effects, projectile trails, enemy pulse animation, particle burst on destroy.

- [ ] **Step 5: Test and commit**

```bash
git add packages/docs/src/games/dual-stick-arena.ts
git commit -m "feat(docs): add Dual-Stick Arena game"
```

---

## Task 8: Endless Chase game

**Files:**
- Create: `packages/docs/src/games/endless-chase.ts`

**Showcases:** `follow: true` — joystick tracks your thumb.

- [ ] **Step 1: Create game config and skeleton**

Config: single zone, `mode: 'static'`, `follow: true`, joystick bottom-center.

- [ ] **Step 2: Implement player and pursuer**

Player (cyan glow) controlled by joystick. Pursuer (pink/red glow, larger, pulsing) follows with slight delay, speeds up over time. Score = time survived.

- [ ] **Step 3: Add background and visual polish**

Scattered dots scrolling in background for sense of movement. Distance indicator line between player and pursuer (green→red color shift as pursuer gets closer). Particle effects.

- [ ] **Step 4: Test and commit**

```bash
git add packages/docs/src/games/endless-chase.ts
git commit -m "feat(docs): add Endless Chase game"
```

---

## Task 9: Space Drift game

**Files:**
- Create: `packages/docs/src/games/space-drift.ts`

**Showcases:** `restJoystick: false` — persistent direction.

- [ ] **Step 1: Create game config and skeleton**

Config: single zone, `mode: 'static'`, `restJoystick: false`, joystick bottom-center.

- [ ] **Step 2: Implement ship and drift mechanics**

Ship (small triangle, purple glow). Joystick sets velocity vector. On release, ship keeps drifting at last velocity (the joystick stays where you leave it). Nudge to adjust.

- [ ] **Step 3: Add waypoints, background, and scoring**

Parallax star field (dots at varying depths). Glowing waypoints (pulsing accent colors) to collect for score. Direction indicator line from ship.

- [ ] **Step 4: Test and commit**

```bash
git add packages/docs/src/games/space-drift.ts
git commit -m "feat(docs): add Space Drift game"
```

---

## Task 10: Landing page

**Files:**
- Modify: `packages/docs/src/pages/index.astro`

- [ ] **Step 1: Remove temporary demos from `index.astro`**

Clean up any `<JoystickDemo>` components added during Tasks 5-9 testing. Start with a clean `index.astro` that only uses `BaseLayout`.

- [ ] **Step 2: Build the hero section**

Gradient heading "Virtual joysticks for the modern web", monospace subtitle `// zero deps · typescript · touch & mouse`, two CTAs: "Get Started →" button (gradient indigo-cyan) and `npm i nipplejs` code pill (frosted glass, monospace). Centered layout, generous padding.

- [ ] **Step 3: Build the stats section**

Three frosted glass cards in a row: "3 Modes", "0 Dependencies", "TS Native". Each with a large glowing monospace number/text and a small uppercase label below. Glowing dot indicators.

- [ ] **Step 4: Build the games showcase section**

All 5 `<JoystickDemo>` components in sequence. Each wrapped with:
- Title (game name)
- Short description (one sentence)
- Option badges showing which nipplejs feature it demonstrates
- Frosted glass container

Games are stacked vertically with generous spacing.

- [ ] **Step 5: Wire up Footer**

Footer already exists from Task 3. Ensure it renders at the bottom of the landing page.

- [ ] **Step 6: Verify visually at all breakpoints**

Check xl, md, and small viewport. Hero text should be responsive. Stats cards should stack on mobile. Game demos should be full-width on mobile.

- [ ] **Step 7: Commit**

```bash
git add packages/docs/src/pages/index.astro
git commit -m "feat(docs): build landing page with hero, stats, and game showcase"
```

---

## Task 11: Documentation content — Getting Started, Options, API

**Files:**
- Modify: `packages/docs/src/pages/getting-started.mdx`
- Create: `packages/docs/src/pages/options.mdx`
- Create: `packages/docs/src/pages/api.mdx`

- [ ] **Step 1: Write `getting-started.mdx`**

Full content: Installation (npm/yarn/pnpm/CDN), Usage (ESM, CJS, UMD, script tag examples), "Your First Joystick" with code example. Add a `<JoystickDemo game="fog-explorer" highlight={['mode']} client:visible />` as the first interactive demo.

Reference: `README.md` sections "Install" and "Usage" for content. Update to reflect v1 API (`nipplejs.create()` returns a Collection).

- [ ] **Step 2: Write `options.mdx`**

Document ALL options from `CollectionOptions` type — every entry in the spec's sidebar nav must appear as a section with an anchor: `zone`, `mode`, `color/size`, `threshold`, `fadeTime`, `multitouch/maxNumberOfJoysticks`, `position`, `restJoystick/restOpacity`, `catchDistance`, `lockX/lockY`, `shape`, `follow`, `dynamicPage`, `dataOnly`. For each option: name, type, default value, description. Group related options under shared headings with individual anchors.

Include inline `<JoystickDemo>` components where relevant:
- `mode` section: reference to Modes games
- `lockX / lockY`: `<JoystickDemo game="asteroid-dodge" highlight={['lockX']} />`
- `multitouch / maxNumberOfJoysticks`: `<JoystickDemo game="dual-stick-arena" highlight={['multitouch']} />`
- `follow`: `<JoystickDemo game="endless-chase" highlight={['follow']} />`
- `restJoystick / restOpacity`: `<JoystickDemo game="space-drift" highlight={['restJoystick']} />`

Reference: `packages/nipplejs/src/types.ts` for accurate types and defaults. `Collection.ts` for runtime defaults (notably `maxNumberOfJoysticks` defaults to `10` but overridden to `1` when `multitouch: false`).

- [ ] **Step 3: Write `api.mdx`**

Three sections:
1. **Collection (Manager)** — returned by `nipplejs.create()`. Methods: `on`, `off`, `destroy`, `getJoystickByUid`. Properties: `uid`, `all` (Map), `options`.
2. **Joystick** — accessed via events or `collection.all`. Methods: `on`, `off`, `destroy`, `setPosition`. Properties: `uid`, `identifier`, `position`, `frontPosition`, `ui`, `options`, `collection`, `direction`, `pressure`.
3. **Factory (Advanced)** — `nipplejs.factory` singleton. `getJoystickByUid` (global), `getJoystickByIdentifier`. Brief section, aimed at advanced users.

Reference: `README.md` API section and source files `Collection.ts`, `Joystick.ts`, `Factory.ts`.

- [ ] **Step 4: Verify all pages render**

Navigate to each page via sidebar. Verify content renders, code blocks have syntax highlighting, inline demos work.

- [ ] **Step 5: Commit**

```bash
git add packages/docs/src/pages
git commit -m "feat(docs): add Getting Started, Options, and API reference content"
```

---

## Task 12: Documentation content — Events, Examples, Migration

**Files:**
- Create: `packages/docs/src/pages/events.mdx`
- Create: `packages/docs/src/pages/examples.mdx`
- Create: `packages/docs/src/pages/migration.mdx`

- [ ] **Step 1: Write `events.mdx`**

Full v1 event taxonomy organized by layer:

**Joystick events:** `start`, `end`, `move`, `dir` (+variations), `plain` (+variations), `shown`, `hidden`, `rested`, `added`, `removed`, `joystickCreated`, `joystickDestroyed`, `attached`, `detached`, `pressure`.

**Collection events:** All joystick events (bubbled) + `collectionCreated`, `collectionDestroyed`.

**Factory events:** All collection events (bubbled) + `factoryCreated`, `factoryDestroyed`.

For each event: description, TypeScript data shape (from `types.ts`), code example. For `move` event, include the full `JoystickEventData` interface.

Reference: `packages/nipplejs/src/types.ts` for event types and data shapes.

- [ ] **Step 2: Write `examples.mdx`**

The 5 games as cookbook entries. Each with:
- Title and description
- Which options it showcases (badges)
- `<JoystickDemo>` component rendering the game
- Full code example showing how to set up nipplejs with those options

- [ ] **Step 3: Write `migration.mdx`**

Document breaking changes from v0 to v1:
- `maxNumberOfNipples` → `maxNumberOfJoysticks`
- `destroyed` event → `joystickDestroyed`
- `joystick.el` → `joystick.ui.el`
- `show()`, `hide()`, `add()`, `remove()` removed
- `manager.get()` removed → `manager.getJoystickByUid()` or `manager.all`
- `manager.id` → `manager.uid`, `manager.ids` removed

Before/after code comparisons for each change.

- [ ] **Step 4: Verify all pages and cross-links**

Navigate through entire site. All sidebar links work, inline demos load, code blocks render.

- [ ] **Step 5: Commit**

```bash
git add packages/docs/src/pages
git commit -m "feat(docs): add Events, Examples, and Migration Guide content"
```

---

## Task 13: GitHub Actions deployment workflow

**Files:**
- Create: `.github/workflows/docs.yaml`

- [ ] **Step 1: Create `.github/workflows/docs.yaml`**

```yaml
name: Deploy Documentation

on:
  push:
    branches: [master]
    paths:
      - 'packages/docs/**'
      - 'packages/nipplejs/src/**'
  workflow_dispatch:

permissions:
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Node
        uses: actions/setup-node@v4
        with:
          node-version-file: 'package.json'

      - name: Enable Corepack
        run: corepack enable

      - run: yarn install

      - name: Build nipplejs
        run: yarn build

      - name: Build docs
        run: yarn workspace @nipple/docs build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: packages/docs/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify workflow syntax**

Run: `cat .github/workflows/docs.yaml | python3 -c "import sys,yaml; yaml.safe_load(sys.stdin.read()); print('Valid YAML')"` (or use `actionlint` if available).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/docs.yaml
git commit -m "feat(docs): add GitHub Pages deployment workflow"
```

---

## Task 14: Final verification and polish

**Files:**
- Various files in `packages/docs/src/`

- [ ] **Step 1: Full production build**

Run: `yarn build && yarn workspace @nipple/docs build`
Expected: No errors. Output in `packages/docs/dist/`.

- [ ] **Step 2: Preview production build**

Run: `cd packages/docs && yarn preview`
Expected: Site loads at preview URL. All pages render. All demos work. No broken links. No console errors.

- [ ] **Step 3: Test responsive breakpoints**

Check at 1280px+ (three columns), 768px-1279px (two columns), <768px (single column + hamburger). Verify demos are full-width on mobile and touch interactions work.

- [ ] **Step 4: Accessibility check**

Verify: semantic HTML structure, keyboard navigation through sidebar and mobile menu, focus-visible outlines, all images have alt text, sufficient contrast ratios.

- [ ] **Step 5: Fix any issues found**

Address any visual, functional, or accessibility issues discovered in steps 2-4.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat(docs): polish and finalize documentation website"
```

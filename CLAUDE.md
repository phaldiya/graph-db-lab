# CLAUDE.md

Project context for Claude Code.

## Project Overview

Graph DB Lab — a web-based openCypher query workbench for Amazon Neptune. Monorepo with two packages: a React SPA client and a Fastify API server that proxies SigV4-signed requests to Neptune.

## Repository Structure

```
packages/
  client/   React 19 + Vite 6 + Tailwind CSS 4 (SPA)
  server/   Fastify 5 + AWS SigV4 signing (Bun runtime)
```

## Commands

```sh
bun install              # Install all workspace dependencies
bun run dev              # Start both client and server
bun run dev:client       # Client only (Vite, http://localhost:5173)
bun run dev:server       # Server only (Fastify, http://localhost:6000)
```

### Type checking

```sh
cd packages/client && ./node_modules/.bin/tsc --noEmit   # Client
cd packages/server && ./node_modules/.bin/tsc --noEmit   # Server
```

No test framework is configured yet. No linter/formatter configured yet.

## Environment

- Runtime: Bun (not Node)
- Package manager: Bun workspaces
- Server reads `.env` from project root via `bun --env-file=../../.env`
- Required env vars: `GRAPH_DB_URL`, optional: `AWS_PROFILE` (defaults to "staging"), `PORT` (defaults to 4000)

## Tech Stack & Versions

- **TypeScript 5** — strict mode, `ES2022` target, `bundler` module resolution
- **React 19** — functional components, hooks only, no class components
- **Tailwind CSS 4** — using `@import "tailwindcss"` (not v3 config), `@tailwindcss/vite` plugin
- **Vite 6** — dev server proxies `/api` to `http://localhost:6000`
- **Fastify 5** — server framework with `@fastify/cors`

## Code Conventions

### Client

- All components are named exports (`export function ComponentName`)
- Hooks are in `packages/client/src/hooks/`, components in `packages/client/src/components/`
- Theming uses CSS custom properties defined in `index.css` (`:root` for light, `.dark` for dark)
- All colors are referenced via `var(--color-*)` in Tailwind arbitrary values: `bg-[var(--color-surface)]`
- Never use Tailwind color utilities directly (e.g., `bg-slate-100`) — always use CSS variables
- Dark mode: toggling `.dark` class on `<html>` element; no Tailwind `dark:` prefix used
- SVGs are inline, not imported as files. Decorative SVGs must have `aria-hidden="true"`
- Interactive elements must have `aria-label` for accessibility
- State management: prop drilling (no context/redux) — the app is intentionally small
- localStorage keys: `"theme"` (dark mode), `"query-history"` (query history)

### Server

- Uses Bun runtime (not Node), typed with `bun-types`
- AWS SigV4 signing for all Neptune requests
- Routes in `routes.ts`, Neptune client in `neptune.ts`
- API endpoints: `GET /api/health`, `POST /api/query`

### General

- No semicolons (implicit via TypeScript/formatter style)
- 2-space indentation
- Trailing commas in multi-line constructs
- Prefer `useCallback` for functions passed as props
- Prefer `const` arrow functions for local utilities, named `function` for exported/component declarations

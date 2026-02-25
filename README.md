# Graph DB Lab

A web-based query workbench for Amazon Neptune graph databases. Write and execute openCypher queries with real-time syntax highlighting, explore results in a sortable table, and keep track of past queries with built-in history.

## Features

- **Cypher Query Editor** — Syntax-highlighted editor with keyword coloring, auto-formatting (beautify), and line commenting
- **Results Table** — Sortable columns, automatic flattening of Neptune node structures (`~id`, `~labels`, `~properties`), CSV/JSON export
- **Query History** — localStorage-backed history panel (up to 50 entries) with status indicators, duration, row counts, and one-click re-run
- **Dark Mode** — System-preference-aware theme toggle with full CSS variable support
- **AWS IAM Auth** — SigV4-signed requests to Neptune via the server proxy

## Prerequisites

- [Bun](https://bun.sh/) v1.3+
- AWS SSO access to the Neptune account (staging profile)
- Network access to the Neptune VPC (VPN)

## Setup

```bash
# Install dependencies
bun install

# Create .env from template
cp .env.example .env
```

Edit `.env` with your Neptune endpoint:

```
GRAPH_DB_URL=your-cluster.region.neptune.amazonaws.com
PORT=6000
```

The server auto-prepends `https://` and appends `:8182` to bare hostnames. You can also provide a full URL.

## AWS Authentication

The server uses AWS SSO credentials (defaults to the `staging` profile). Log in before starting:

```bash
aws sso login --profile staging
```

Override the profile with `AWS_PROFILE` env var if needed.

## Running

Start both client and server from the project root:

```bash
bun run dev
```

Or start them individually:

```bash
bun run dev:server   # Fastify on http://localhost:6000
bun run dev:client   # Vite on http://localhost:5173 (proxies /api to the server)
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + Enter` | Run query |
| `Ctrl/Cmd + /` | Toggle line comment |
| `Ctrl/Cmd + Shift + F` | Beautify / format query |

## API

**Health check:**

```bash
curl http://localhost:6000/api/health
# {"status":"ok"}
```

**Run a query:**

```bash
curl -X POST http://localhost:6000/api/query \
  -H 'Content-Type: application/json' \
  -d '{"query": "MATCH (n:CAMPUS) RETURN n LIMIT 10"}'
```

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | openCypher query |
| `parameters` | object | no | Query parameters |

**Response:**

```json
{ "results": [...], "duration": 142 }
```

**Errors:**

```json
{ "error": { "message": "...", "code": "BAD_REQUEST | NEPTUNE_ERROR | CONNECTION_ERROR" } }
```

## Project Structure

```
packages/
  server/                # Fastify API server
    src/
      index.ts           # Entry point
      routes.ts          # POST /api/query, GET /api/health
      neptune.ts         # Neptune client (SigV4-signed fetch)
      types.ts           # Request/response types

  client/                # Vite + React 19 + Tailwind CSS v4
    src/
      App.tsx
      components/
        QueryEditor.tsx  # Syntax-highlighted editor with beautify
        QueryHistory.tsx # Slide-out history panel
        ResultsView.tsx  # Sortable results table with CSV/JSON export
      hooks/
        useDarkMode.ts   # Dark mode toggle with localStorage persistence
        useQuery.ts      # Fetch hook with loading/error/abort support
        useQueryHistory.ts # Query history with localStorage persistence
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5, Tailwind CSS 4, Vite 6 |
| Backend | Fastify 5, AWS SigV4, Bun |
| Database | Amazon Neptune (openCypher) |

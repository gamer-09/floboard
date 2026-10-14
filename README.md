# FloBoard

**[Open the live web version →](https://gamer-09.github.io/floboard/)**

FloBoard is a mobile/web financial markets dashboard built with React Native + Expo, backed by an
Express API server that pulls live data from Yahoo Finance. This repo is a pnpm workspace
monorepo containing the app, the web client, the API server, and a few shared internal libraries.

## What's in the app

- **Home** — a live global market snapshot: major indices, today's top gainers/losers, and a
  Market Hours widget showing open/closed status for 30 stock exchanges across the Americas,
  Europe, Asia-Pacific, and the Middle East/Africa (with real timezone-aware session tracking).
- **Watchlist** — multiple custom watchlists with search, covering stocks, crypto, forex, and
  commodities.
- **FX & Metals** — 90+ currency pairs (majors, minors, and emerging-market crosses) plus a
  dedicated Metals group for spot gold/silver/platinum/palladium.
- **Crypto** — ~80 coins grouped by category (stablecoins, mega/large-caps, Layer 2, DeFi, AI
  tokens, gaming/Web3, meme coins).
- **News** — market headlines tagged bullish/bearish/neutral.
- **Portfolio** — simulated position tracking and analytics (no real brokerage connection —
  everything here is for tracking/practice, not real trades).
- **FloAI Advisor** — an AI chat assistant (Google Gemini) for market questions.
- **Settings** — theme (dark/light/OLED), notification preferences, and an audit of every toggle
  in the app.

Market data also covers commodities (precious metals, energy, grains, softs, industrial metals),
all 11 S&P 500 GICS sector ETFs, and the Treasury yield curve (3-Mo through 30-Yr).

If the live Yahoo Finance call ever fails (rate limits, network issues, etc.), the API server
falls back to cached/simulated data so the app never shows blank values — it logs the real reason
for the failure server-side instead of surfacing an empty screen.

## Repo layout

```
artifacts/
  floboard/       # the Expo/React Native app described above
  api-server/     # Express API — quotes, news, earnings, chat (FloAI), proxied from Yahoo Finance
web/              # the browser client (Vite + React Router) — this is what GitHub Pages serves
docs/             # an older built copy of the web client, kept for reference; not deployed
lib/
  db/                 # Postgres schema (Drizzle ORM) — optional locally, see below
  api-spec/           # OpenAPI spec shared by the generated clients below
  api-client-react/   # generated React Query client, consumed by floboard
  api-zod/            # generated Zod types, consumed by api-server
scripts/          # misc workspace-level scripts
```

## Requirements

- Node.js 20+ (CI and the published Docker build run Node 20)
- **pnpm** 9.15+ — this repo only works with pnpm (npm/yarn are actively blocked by a preinstall check)
- [Expo Go](https://expo.dev/go) on your phone, or a simulator, if you want to run FloBoard on a
  device instead of the web

## Setup

```bash
git clone https://github.com/gamer-09/floboard.git
cd floboard
pnpm install
```

That's the whole install — no `.env` file is required to get market data working locally. A
Postgres `DATABASE_URL` is only needed if you want persistent storage; without one, the DB layer
falls back to a local default connection string and simply won't connect (this doesn't block the
app from running).

## Running it locally

You need two terminals — one for the API server, one for the app.

**Terminal 1 — API server:**
```bash
pnpm --filter @workspace/api-server run dev
```
The server reads `PORT` and listens on **8080** when it isn't set. The app's `dev:local` script
(terminal 2) points at `http://localhost:5000`, so either start the API on that port:

```bash
PORT=5000 pnpm --filter @workspace/api-server run dev          # bash / Git Bash
# cmd.exe:      set PORT=5000 && pnpm --filter @workspace/api-server run dev
# PowerShell:   $env:PORT=5000; pnpm --filter @workspace/api-server run dev
```

…or leave the API on 8080 and point the app at it with the plain `dev` script:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080 pnpm --filter @workspace/floboard run dev
```

**Terminal 2 — FloBoard:**
```bash
pnpm --filter @workspace/floboard run dev:local
```
This points the app at `http://localhost:5000` automatically. Once Metro Bundler starts, either
scan the QR code with Expo Go, or press `w` to open the web version.

Other floboard scripts, if you need them:
- `dev` — plain `expo start`, no API server env var set (use if you already have `EXPO_PUBLIC_API_URL`
  configured another way)
- `dev:tunnel` — `expo start --tunnel`, for testing on a device that isn't on the same network
- `dev:replit` — the Replit-specific variant (wires up Replit's proxy/domain env vars); not needed
  for local development

### The web client

`web/` is the browser build of the same dashboard (Vite + React). On Pages it runs under
`/floboard/` with hash routing (`https://gamer-09.github.io/floboard/#/markets`), and
`web/public/404.html` forwards any old path-style link into that hash route. It talks to the API
server through `VITE_API_URL` when you set one, and otherwise falls back to the deployed Render
API:

```bash
cd web
npm ci
npm run dev      # or: npm run build
```

## FloAI (optional)

The AI chat tab needs a Gemini API key. Either set `GEMINI_API_KEY` in the api-server's
environment, or paste a free Gemini key directly into the app's **Settings** tab — no restart
required either way.

## Deploying the API server

The API server is designed to run on [Render](https://render.com) (free tier). It is a
stateless service — all market data is fetched live from Yahoo Finance, so no database is
required (that's also why Supabase isn't used as a host; it's Postgres + Deno edge functions,
not a place for a long-running Node server).

1. Push this repo to GitHub, then in the Render dashboard choose **New > Blueprint** and connect
   the repo. Render reads `render.yaml` at the repo root and provisions the `floboard-api`
   service automatically (Docker build, `PORT=8080`, health check at `/api/healthz`).
2. After the first deploy, open the service and set **`GEMINI_API_KEY`** under **Environment**
   (only required for the FloAI chat feature). It's deliberately `sync: false` in the blueprint
   so the key never lives in git.
3. When the deploy succeeds you get a URL like `https://floboard-api.onrender.com`. Verify it
   returns real data, not just that the server boots:
   ```bash
   curl 'https://floboard-api.onrender.com/api/market?symbols=AAPL'
   ```
4. The production/preview EAS build profiles in `artifacts/floboard/eas.json` already point
   `EXPO_PUBLIC_API_URL` at the deployed URL. If your Render URL differs, update it there and in
   the `!__DEV__` fallback in `artifacts/floboard/utils/apiBase.ts`.

## Deploying the web client

GitHub Pages serves `web/`: `.github/workflows/deploy.yml` builds `web/` and publishes `web/dist`
on every push to `main` that touches `web/**` (or via a manual run of that workflow). The live URL
is <https://gamer-09.github.io/floboard/>.

## Privacy policy

The policy ships inside the app as a screen — `artifacts/floboard/app/privacy-policy.tsx`, reachable
from **About** in Settings. There is no separate hosted policy page any more: the old
`/floboard/privacy-policy.html` address that GitHub Pages used to serve no longer exists, so use the
in-app screen if you need to point a store listing at the policy.

## Tests

Vitest covers three areas:

- `artifacts/api-server/src/routes/market.test.ts` — the `/api/market` route: response shape,
  Yahoo Finance fallback quotes, and symbol validation
- `artifacts/floboard/utils/clearState.test.ts` — regression guard for the clear-watchlist bug
  (clearing the custom Favorites tab must never wipe the preset lists)
- `artifacts/floboard/utils/floaiFallback.test.ts` — FloAI's fallback response shaping per risk
  mode (no real Gemini calls — the API call is mocked)

Run everything from the repo root:
```bash
pnpm run test
```

CI runs typecheck + tests on every push to `main` and on pull requests
(`.github/workflows/ci.yml`, pnpm 9.15.0 on Node 20).

## Workspace-wide commands

Run from the repo root:
```bash
pnpm run typecheck   # typechecks all shared libs + apps
pnpm run test        # runs all Vitest suites (api-server + floboard)
pnpm run build       # typecheck, then build everything that has a build script
```

## Notes for Windows users

Everything above is written to work in `cmd.exe`, PowerShell, and bash without modification — the
old Unix-only shell syntax (`export VAR=val && ...`, `sh -c '...'`) has been replaced with
`cross-env` and plain Node scripts throughout. If you hit a `pnpm install` error about ignored
build scripts, run the exact `pnpm install` command above again after a fresh `git pull` — that's
config that lives in `pnpm-workspace.yaml`, not something you need to approve interactively.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint (flat config via eslint.config.mjs)
npm start        # Serve production build
```

No test runner is configured.

## Architecture

**Next.js 16 App Router** with React 19, TypeScript (strict), Tailwind CSS 4, shadcn-style component library. Path alias: `@/*` → `src/*`.

### Two data layers (hybrid / in-transition)

**1. Mock DataService** (`src/data/`) — used by the shell pages (Server Components):
- `src/lib/types.ts` defines the `DataService` interface and all domain types
- `src/data/demo-internal.ts` is the in-memory mock implementation with seed data + `enrichPerson`
- `src/data/store.ts` exports the `demoData` singleton
- `src/data/index.ts` exports `getDataService()` — change this seam to swap in a real backend

**2. Zoho CRM REST API** (`src/app/api/` + `src/services/`) — used by the Next.js API routes:
- `src/services/prospects.ts` talks directly to Zoho CRM v8 via `zohoApi` (axios client)
- `src/lib/zoho/api-client.ts` — singleton axios client with request/response logging
- `src/lib/zoho/oauth.ts` — OAuth code exchange, refresh token, and current-user fetch
- `src/types/index.ts` — Zoho API response shapes (separate from domain types in `src/lib/types.ts`)

### Auth

Zoho OAuth via httpOnly cookies. `getSession()` in `src/lib/session.ts` reads three cookies (`zoho_access`, `zoho_domain`, `ownez_user`). Returns `null` if any are missing — all API routes guard on this. Cookie names/lifetimes are in `src/lib/session-constants.ts`.

OAuth flow: `/api/auth/zoho/start` → Zoho → `/callbacks/zoho` (client) → `/api/auth/zoho/token` (sets cookies).

### Routing

`src/app/(shell)/` is the authenticated route group with `Sidebar` + `LastViewedBar` chrome. The `ShellAuthGuard` component redirects unauthenticated users to `/login`.

| Route | Purpose |
|-------|---------|
| `/` | Dashboard |
| `/pipeline` | Pipeline table view |
| `/people` | People search/browse |
| `/person/[id]` | Person detail |
| `/leadership` | KPIs, funnel, source ROI (marketing + admin) |
| `/admin` | Users, lead sources, pipeline stages, activity types, system config |

Role-based nav in `src/components/sidebar-nav.tsx` (`rep` / `marketing` / `admin`).

### Business logic

- **Stale/overdue**: `src/lib/stale.ts` — stale when active stage + `daysSinceLastTouch ≥ idleThreshold` + no future next action; overdue when active stage + `nextActionDate` is past
- **Stage sets**: `ACTIVE_PIPELINE_STAGES`, `COMMITTED_STAGES`, `INACTIVE_STAGES` in `src/lib/constants.ts`
- **Smart detection**: `src/lib/smart-detection.ts` infers activity type + outcome from free-text
- **Timezone**: all "today" comparisons use `America/Chicago` via `getTodayCT()` in `src/lib/format.ts`

### Client mutation pattern (mock-backed pages)

Shell pages that mutate import `demoData` from `@/data/store` directly and call `router.refresh()`. This is acceptable while mock-backed; once pages migrate to real API routes, mutations should go through those routes instead.

# Frontend — Inventory & Supply Chain

React 19 + TypeScript + Vite, Redux Toolkit for state, Tailwind CSS for styling, react-router-dom v7 for routing. Talks to the `/backend` API — see the root `README.md` for how to run both together.

## Getting started

```bash
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:5000/api/v1
npm install
npm run dev             # http://localhost:5173
```

The backend must be running (see `../backend/README.md`) for anything beyond the landing/legal pages to work.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the Jest/RTL test suite |
| `npm run lint` | oxlint over `src/` |

## Architecture

- **Auth**: `src/lib/apiClient.ts` holds the access token in memory only (never `localStorage`) and attaches it via an axios request interceptor; a response interceptor does one silent `POST /auth/refresh` retry on 401 using the httpOnly refresh cookie, then logs out if that also fails. `src/store/slices/authSlice.ts`'s `bootstrapAuth` thunk runs once on app load (`App.tsx`) to restore a session after a page reload, entirely via that cookie.
- **Routing/guards**: `src/components/auth/ProtectedRoute.tsx` gates authenticated routes (redirects to `/login` if there's no session) and optionally a `roles` allow-list (redirects to `/dashboard` otherwise) for admin-only pages (`/users`, `/settings`).
- **App shell**: `src/components/layout/AppLayout.tsx` (sidebar + topbar) wraps every authenticated page via nested routes in `App.tsx`.
- **State**: one Redux Toolkit slice per domain (`auth`, `theme`, `inventory`) with a thin service layer per domain in `src/services/` (no ad-hoc `fetch`/`axios` calls inside components). Every API request/response shape has a TypeScript interface in `src/types/`.
- **UI kit**: `src/components/ui/` — `Button`, `Card`, `Input`, `ThemeToggle` (original scaffold) plus `Table`, `Modal`, `Badge`, `Chart` (added for the inventory/dashboard pages). Every data view implements loading/empty/error states (see `Table`'s built-in ones).
- **Dashboard**: `src/hooks/useDashboardData.ts` polls `GET /dashboard` every 5 minutes.

### A note on `import.meta.env`

`src/config/apiBaseUrl.ts` is the only file that reads `import.meta.env.VITE_API_URL` — it's isolated there because ts-jest (running under CommonJS) can't parse `import.meta` syntax. `jest.config.cjs` maps that one module to `apiBaseUrl.jest.ts` for tests. If you add another `import.meta.env` read, put it in that file too rather than inline elsewhere.

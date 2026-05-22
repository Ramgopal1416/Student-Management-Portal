# Smart Attendance Management System

A full-stack AI-powered attendance management system with face recognition UI, role-based dashboards for Teachers, Students, and Parents, period-wise attendance tracking, leave management, announcements, and analytics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, served at `/api`)
- Frontend: React + Vite (shadcn/ui, Recharts, Wouter routing)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: express-session (cookie-based, no JWT)

## Where things live

- `lib/db/src/schema/` — DB schema (Drizzle) — source of truth for all table shapes
- `lib/api-spec/openapi.yaml` — OpenAPI spec — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — auto-generated hooks + Zod schemas (do not edit)
- `artifacts/api-server/src/routes/` — all backend route handlers
- `artifacts/smart-attendance/src/pages/` — all frontend pages
- `artifacts/smart-attendance/src/hooks/use-auth.tsx` — auth context provider

## Architecture decisions

- **Session-only auth**: cookies via `express-session`. No JWT/localStorage tokens.
- **Student login**: registration number + date of birth (no password). Teachers create student records.
- **Parent login**: parent email + student registration number (no password).
- **Teacher login**: email + password + employeeId required at registration.
- **Announcements** are always linked to a `teacher_id`; no guest/anonymous posts.
- **Periods** are scoped by department/year/section, not by day-of-week.

## Product

- **Teacher/Admin**: dashboard with trends, student management (CRUD + face registration), period management, bulk attendance marking, leave review, announcements, reports, analytics
- **Student**: dashboard, attendance history + heatmap, leave application, announcements, profile
- **Parent**: dashboard, child's attendance, leave tracking, announcements, profile

## Demo credentials

All accounts use the same seed (password is not used for student/parent login):

| Role    | Login                                                          |
|---------|----------------------------------------------------------------|
| Teacher | email: `teacher@demo.com`  password: `password123`            |
| Student | reg#: `CS2021001`  DOB: `2003-04-15` (Alice Smith)           |
| Parent  | email: `parent@demo.com`  reg#: `CS2021001`                  |

Other students: `CS2021002` DOB `2003-07-22` (Bob), `CS2021003` DOB `2003-02-10` (Priya)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` before typechecking artifacts (rebuilds composite libs).
- `req.params.id` in Express 5 is `string | string[]` — always wrap with `String(req.params.id)`.
- The `@types/bcryptjs` and `@types/pg` packages are **not** in the pnpm catalog; add direct version strings if needed in `scripts/`.
- Seed script (`scripts/src/seed.ts`) requires raw SQL via psql since `@workspace/db` can't be resolved by tsx.
- Announcements need a valid `teacher_id` (FK); seed teacher first.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

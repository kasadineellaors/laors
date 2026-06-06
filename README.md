# LAORS — Livestock & Agricultural Operations Resource System

**The Foreman** for cattle operations. Stocker and custom feeding on one platform; cow-calf calving is the next major module.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** — western design tokens (olive, saddle brown, cream, tan, charcoal)
- **Supabase** — auth, PostgreSQL, RLS, storage

## Quick start (local)

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Environment (`.env.local`)

From **Supabase Dashboard → Project Settings → API**:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only — ranch onboarding + **team email invites** |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

### 3. Database — **required for full app**

Pick **one** path:

**Recommended — Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

**SQL Editor — existing project with base tables**

1. If needed: `supabase/RUN_THIS_IN_SUPABASE.sql` (onboarding RPC fix)
2. Then **one paste:** `supabase/RUN_ALL_PHASES.sql` (Phases 2–7 + ship polish)

**Brand-new empty project**

1. `supabase/apply-all.sql`
2. `supabase/RUN_THIS_IN_SUPABASE.sql`
3. `supabase/RUN_ALL_PHASES.sql`

> **Note:** Option A in older docs (“service role only, no SQL”) creates your ranch org but **does not** create cattle moves, jobs, sales, invoices, etc. You still need migrations.

### 4. Supabase Auth

**Authentication → URL Configuration**

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

Enable **Email** provider. For production, set the same URLs with your live domain.

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production deploy (Vercel)

1. Push repo to GitHub; import in Vercel
2. Set all four env vars above (production `NEXT_PUBLIC_APP_URL`)
3. Run `supabase db push` against production project (or paste `RUN_ALL_PHASES.sql`)
4. Add production URL to Supabase Auth redirect allowlist

## Ship checklist (current release)

Before cow-calf work, LAORS supports:

- [x] Ranch onboarding + setup (map, dictionary, classifications)
- [x] Cattle groups, moves, count adjustments (managers)
- [x] Jobs, time clock, treatments, medicine catalog, rainfall
- [x] Sales, invoices, customer billing rates, generate invoice
- [x] Role-aware UI (workers log ops; managers edit inventory & billing)
- [x] Team invites (with service role key)
- [x] Dashboard DB setup warnings + getting-started checklist

**Roles:** Workers can clock in, log treatments/sales/rainfall/jobs. Managers control cattle inventory, ranch setup, and billing.

## Troubleshooting

| Issue | Fix |
|---|---|
| Empty jobs/sales/invoices | Run `RUN_ALL_PHASES.sql` or `supabase db push` |
| Onboarding fails | `RUN_THIS_IN_SUPABASE.sql` or add `SUPABASE_SERVICE_ROLE_KEY` |
| Team invite not emailed | Add service role key; or invite saved as pending in Setup → Team |
| Worker sale “deduct inventory” fails | Only managers can deduct head — workers log sale without deduct |
| Generated invoice duplicates medicine | Run `RUN_SHIP.sql` (marks treatments as invoiced) |

## Product principles

1. **Full ranch customization** — no hard-coded ranch terms.
2. **Editable after submit** — fix counts, names, and records after save.
3. **Ranch workflow wins** — build for how ranches actually operate.

## Feature phases (all complete through 7)

See `supabase/RUN_PHASE*.sql` or `supabase/migrations/` for schema history.

**Next:** Cow-calf calving records, average daily head for yardage billing.

## Project structure

```text
src/app/(app)/     Dashboard, cattle, jobs, health, time, sales, invoices, setup
supabase/
  migrations/      Full migration history (preferred via db push)
  RUN_ALL_PHASES.sql   One-shot SQL Editor path for Phases 2–7 + ship
  RUN_SHIP.sql         Treatment invoicing flags (included in ALL)
```

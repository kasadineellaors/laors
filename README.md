# LAORS — Livestock & Agricultural Operations Resource System

**The Foreman** for cattle operations. Cow-calf calving and bull registry, plus stocker/custom feeding on one platform.

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
| `RESEND_API_KEY` | Optional — send invoices by email ([Resend](https://resend.com)) |
| `INVOICE_FROM_EMAIL` | Optional — verified sender, e.g. `LAORS <invoices@yourdomain.com>` |

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
- Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3000/reset-password` (via callback)

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

### Supabase auth emails (sign-up, password reset)

Sign-up confirmations are sent by **LAORS through Resend** when these env vars are set:

- `RESEND_API_KEY`
- `INVOICE_FROM_EMAIL` or `AUTH_FROM_EMAIL` (verified sender in Resend)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only — generates the confirmation link)

Without the service role key, LAORS falls back to Supabase's built-in mailer, which is rate-limited and often blocked.

In [Supabase Dashboard](https://supabase.com/dashboard) → your project:

1. **Authentication → URL Configuration**
   - Site URL: `https://laorsranch.com` (or your live domain)
   - Redirect URLs: `https://laorsranch.com/auth/callback`, `https://laors.vercel.app/auth/callback`, and `http://localhost:3000/auth/callback` for local dev
2. **Authentication → Providers → Email** — Email provider enabled; **Confirm email** on for production

Set `NEXT_PUBLIC_APP_URL=https://laorsranch.com` in Vercel. Copy `SUPABASE_SERVICE_ROLE_KEY` from **Supabase → Settings → API** into Vercel env vars.

## Ship checklist (current release)

Before cow-calf work, LAORS supports:

- [x] Ranch onboarding + setup (map, dictionary, classifications)
- [x] Cattle groups, moves, count adjustments (managers)
- [x] Jobs, time clock, treatments, medicine catalog, rainfall
- [x] Sales, invoices, customer billing rates, generate invoice
- [x] Role-aware UI (workers log ops; managers edit inventory & billing)
- [x] Team invites (with service role key)
- [x] Dashboard DB setup warnings + getting-started checklist
- [x] **Cow-calf:** calving records (+ optional inventory bump), bull registry, breeding records
- [x] **Billing:** average daily head yardage (head-days), medicine + feed from logs
- [x] **Feed:** rations with pricing, daily feed log (pen/herd/owner), stocker invoice lines
- [x] **Treatments:** optional type dropdown (antibiotic, dewormer, etc.) + reason field

**Roles:** Workers can clock in, log treatments/sales/rainfall/jobs/calvings/breeding. Managers control cattle inventory, ranch setup, billing, and bulls.

## Troubleshooting

| Issue | Fix |
|---|---|
| Empty jobs/sales/invoices | Run `RUN_ALL_PHASES.sql` or `supabase db push` |
| Onboarding fails | `RUN_THIS_IN_SUPABASE.sql` or add `SUPABASE_SERVICE_ROLE_KEY` |
| Team invite not emailed | Add service role key; or invite saved as pending in Setup → Team |
| Worker sale “deduct inventory” fails | Only managers can deduct head — workers log sale without deduct |
| Login loops or fails after sign-in | Ensure `NEXT_PUBLIC_APP_URL` matches your site; add URL to Supabase Auth allowlist |
| Sign-up confirmation email never arrives | Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel; verify `RESEND_API_KEY` + sender domain in Resend; add production URLs to Supabase Auth allowlist |

## Security

- **Role permissions** — exports and sensitive writes use `src/lib/auth/guards.ts` (`reports.export`, `inventory.write`, etc.).
- **Headers** — CSP, `X-Frame-Options`, and related headers are set in `next.config.ts`.
- **Env template** — copy `.env.example` to `.env.local`; never commit secrets.
- **Supabase Dashboard** — enable auth rate limits and CAPTCHA for production; lock redirect URLs to your domains.
| Password reset goes nowhere | Run latest code; reset link should land on `/reset-password` |
| Generated invoice duplicates medicine | Run `RUN_SHIP.sql` (marks treatments as invoiced) |

## Product principles

1. **Full ranch customization** — no hard-coded ranch terms.
2. **Editable after submit** — fix counts, names, and records after save.
3. **Ranch workflow wins** — build for how ranches actually operate.

## Feature phases (through 10)

See `supabase/RUN_PHASE*.sql` or `supabase/migrations/` for schema history.

**Phase 10:** Treatment reason + type dropdown, feed rations, feeding log, feed invoicing.

**Phase 11:** Cow-calf feed log under `/cow-calf/feed` (excluded from stocker invoices).

**Phase 12:** Individual cow/heifer registry under Cow-Calf.

**Phase 13:** Shared ranch calendar with on/off toggle.

**Phase 14:** Seedstock animal registry — tag, registration, pedigree, EPDs at `/seedstock`.

**Phase 15:** Seedstock breeding (AI/embryo), extended EPDs, sales linked to animals and customers.

**Phase 16:** Maternal intelligence — fertility scores, calving distribution, family performance, calving ease validation, lifetime value, calf crop analytics at `/seedstock/maternal`. Weaning log with auto-register retained heifers, year-over-year trend charts, maternal CSV/PDF exports.

## Project structure

```text
src/app/(app)/     Dashboard, cattle, jobs, health, time, sales, invoices, setup
supabase/
  migrations/      Full migration history (preferred via db push)
  RUN_ALL_PHASES.sql   One-shot SQL Editor path for Phases 2–9 + ship
  RUN_PHASE8.sql       Cow-calf calving + bulls
  RUN_PHASE9.sql       Breeding records
  RUN_PHASE10.sql      Feed rations + feeding log
  RUN_PHASE11.sql      Cow-calf feed context
  RUN_PHASE12.sql      Individual cow/heifer types
  RUN_PHASE13.sql      Shared ranch calendar
  RUN_PHASE14.sql      Seedstock animal registry
  RUN_PHASE15.sql      Seedstock breeding + sales links
  RUN_PHASE16.sql      Maternal intelligence (exposure, weaning, calving links)
  RUN_SHIP.sql         Treatment invoicing flags (included in ALL)
```

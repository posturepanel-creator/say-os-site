# Plan limits — source of truth for website copy

Website copy about plan allowances **must match the enforced product**, not other
marketing copy, memory, or a figure from a previous draft. Before changing any
plan number in the site, check it against the app's plan definition (below).

## Enforced allowances (per salon)

| Allowance          | Free | Standard / Founding |
|--------------------|-----:|--------------------:|
| Stored clients     |   25 |                 500 |
| Bookings per month |   50 |           Unlimited |
| Active team members|    1 |                   5 |

- Bookings = **per calendar month** (the value and the period agree across the
  in-app check and the server guard).
- Keep **clients, bookings and staff as three separate allowances**. "50 bookings
  a month" is **not** "50 clients" — do not merge or substitute them.
- `Founding` is a price, not a bigger plan — it carries the **Standard** allowances.

## Where these come from (app repo `SAY-OS-Production`)

- App definition (single source of truth): `src/lib/planCapabilities.ts`
  (`FREE_CAPABILITIES` / `PRO_CAPABILITIES`).
- Server guard: `supabase/migrations/102_plan_cap_guard.sql`.

## Verification status (as of 2026-10-09)

- **VERIFIED LIVE (client enforcement):** the values above are present in the
  deployed app bundle — `app.say-salon.com/assets/index-*.js`:
  `maxClients` 25 / 500, `maxBookingsPerMonth` 50 / Infinity, `maxStaff` 1 / 5.
- **UNVERIFIED (database enforcement):** whether migration 102's DB triggers are
  actually applied in production is **not confirmed** — there is no authorised
  read-only DB connection, and migrations in this range are hand-applied and may
  lag the repo. **Do not infer deployment from the migration file or a code comment.**

## Rule for reviewers

Do not change a plan number in site copy without citing the current enforced value
in `planCapabilities.ts`. If copy and code disagree, that is a finding to raise —
not a number to invent from the website.

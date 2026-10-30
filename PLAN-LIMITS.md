# Plan limits — source of truth for website copy

Website copy about plan allowances **must match the enforced product**, not other
marketing copy, memory, or a figure from a previous draft. Before changing any
plan number in the site, check it against the app's plan definition (below).

## Plan allowances (app configuration)

| Allowance          | Free | Standard / Founding |
|--------------------|-----:|--------------------:|
| Stored clients     |   25 |                 500 |
| Bookings per month |   50 |           Unlimited |
| Active team members|    1 |                   5 |

- Bookings = **per calendar month** (the value and the period agree across the
  in-app check and the server-guard source).
- Keep **clients, bookings and staff as three separate allowances**. "50 bookings
  a month" is **not** "50 clients" — do not merge or substitute them.
- `Founding` is a price, not a bigger plan — it carries the **Standard** allowances.

## Two distinct things — do not conflate them

**1. App configuration (what the code says the limits are).**
- App definition (single source of truth): `SAY-OS-Production/src/lib/planCapabilities.ts`
  (`FREE_CAPABILITIES` / `PRO_CAPABILITIES`).
- Server-guard definition: `SAY-OS-Production/supabase/migrations/102_plan_cap_guard.sql`.
- These files *configure* the limits; they do not, by themselves, prove what runs in production.

**2. Production enforcement (what actually blocks a user in the live product).**
- **VERIFIED (client-side):** the configured values are present in the **deployed app
  bundle** — `app.say-salon.com/assets/index-*.js`: `maxClients` 25 / 500,
  `maxBookingsPerMonth` 50 / Infinity, `maxStaff` 1 / 5. So the in-app (client)
  enforcement is live and matches the configuration.
- **UNVERIFIED (server/database-side):** whether migration 102's DB triggers are
  actually installed in the production database is **not confirmed** — there is no
  authorised read-only DB connection, and migrations in this range are hand-applied
  and may lag the repo. **Do not infer production DB enforcement from the migration
  file or a code comment.**

## Rule for reviewers

Do not change a plan number in site copy without citing the current value in
`planCapabilities.ts`. If copy and configuration disagree, that is a finding to
raise — not a number to invent from the website. Questions about whether the
server-side guard is deployed belong in the app follow-up list, not in a copy change.

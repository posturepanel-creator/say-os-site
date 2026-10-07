# Release Log

## 2026-10-07 — Analytics correction & SEO cleanup

- **PR:** #6 (`seo-leadtrack-cleanup`)
- **Merge commit:** `cbbcf39` → `master`
- **Date:** 7 October 2026

### Changes shipped
- **GA4 stream fix:** the marketing site now uses the **website** stream `G-SWCB3H6QEF` (previously the app stream `G-QXYSM1LHV8` was used by mistake), site-wide and in the blog-atom template.
- **/pricing structured data:** `Product` → `SoftwareApplication` (removes the inappropriate Merchant-listings eligibility/warning); removed the non-standard `billingIncrement` property; no ratings/reviews invented. Offers: £0 Free / £79 per month Standard / £234 per six months Founding (confirmed intentional).
- **Consent-gated Google Analytics** added to 10 previously-uncovered marketing pages; **first-run consent banner** added to `/pricing` and `/talent`.
- **talent.html** pre-existing truncation (broken since the initial commit) repaired; the talent lead form now reveals success **only after an explicit storage acknowledgement** (`{saved:true}` / `{status:"success"}`), preserving inputs and allowing retry on failure.
- **`scripts/guard-analytics.js`** disables both GA IDs **and** the PostHog loader on Netlify `deploy-preview` / `branch-deploy` contexts.
- **Reproducible Playwright acceptance harness** added under `tests/` (separate from the Netlify build).

### Post-merge dashboard change (founder, 7 October 2026)
- Removed the separate Netlify **`Analytics`** snippet injection (the externally-injected, un-gated `G-SWCB3H6QEF` tag that duplicated the repo's consent-gated tag and fired without consent).
- Retained the **`meta`** snippet injection (Facebook domain verification `1b9ubfmr9h56snd4qj858rk3psadgn`).

### Final verification (7 October 2026)
Production (`say-salon.com`) and preview (`deploy-preview-6`), via hermetic network checks (stubbed gtag.js, aborted/recorded destinations — no real analytics hits, no leads submitted):

- Injected un-gated tag **removed**; Facebook verification meta **intact** (production and preview).
- Website GA (`G-SWCB3H6QEF`) loads **only after consent**; exactly **one** loader + **one** config (**no duplicate initialization**); PostHog loads once on consent (Group B pages).
- App ID `G-QXYSM1LHV8` **absent** everywhere.
- **Previews send no analytics** — GA and PostHog remain neutralised even after consent (build guard).
- `/pricing` schema validates clean: **0 errors / 0 warnings** (SoftwareApplication + BreadcrumbList).

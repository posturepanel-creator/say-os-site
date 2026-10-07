# Release Log

## 2026-10-07 — Published: "Can I refuse to treat a client?" (UK)

- **PR:** #8 (`publish/refuse-to-treat`)
- **Merge commit:** `f640f56` → `master`
- **Date:** 7 October 2026
- **Live URL:** https://say-salon.com/blog/can-i-refuse-to-treat-a-client-uk

### What shipped
- Ops/equality atom, published (`published: 2026-10-07`). Reviewed against authoritative sources over several rounds: Equality Act 2010 scoped to **England, Wales & Scotland** (NI separate); refusal *because of* a protected characteristic is unlawful, but a connected refusal is **not automatically unlawful** — different tests apply (s.15 objective justification; separate **anticipatory** reasonable-adjustments duty). Diagnosis ≠ decision (assess individual risk, consent, access); **presume capacity**. Separate valid-consent bullet; proportionate response to abuse/threats and disability-related behaviour. Policy wording/training/device IFU govern; a GP letter is not a green light.
- Article carries a **clickable Sources section** (legislation.gov.uk Part 3 / s.15 / s.6+Sch 1, EHRC Code Ch.7, MCA 2005 s.1).
- Internal links: "equality, consent & refusal" cluster (outbound) + A–Z hub link (inbound).

### Production verification (7 October 2026)
- Canonical, title, meta description correct; Article JSON-LD with publisher logo, image, `datePublished 2026-10-07`.
- **GA website ID `G-SWCB3H6QEF`** present; app ID `G-QXYSM1LHV8` absent; previews keep analytics disabled.
- Five clickable source links, four related links, blog hub link and sitemap entry all live.

## 2026-10-07 — Published: "How long should I keep client consultation and patch test records? (UK)"

- **PR:** #7 (`publish/consultation-records`)
- **Merge commit:** `5be0ffb` → `master`
- **Date:** 7 October 2026
- **Live URL:** https://say-salon.com/blog/how-long-should-i-keep-client-consultation-records-uk

### What shipped
- First of the previously-unpublished content atoms, published (`published: 2026-10-07`). Content reviewed against authoritative sources and corrected: Limitation Act 1980 scoped to **England & Wales** (Scotland/NI noted); 3-year and minors' positions framed as general rules **with exceptions**, including s.33 court discretion; insurer requirement stated **generically**; retention as a **documented schedule per record type**; deletion only after checking for an ongoing complaint/claim/justified need (UK GDPR does not mandate automatic deletion while a legitimate need remains).
- Internal links: new "records & retention" cluster in `scripts/render-answers.js` (outbound) + A–Z hub link in `blog/index.html` (inbound). Blog HTML + sitemap regenerate at build.

### Production verification (7 October 2026)
- Canonical, title, meta description correct; Article JSON-LD with publisher logo, image and `datePublished 2026-10-07`.
- GA uses the **website** ID `G-SWCB3H6QEF` (app ID `G-QXYSM1LHV8` absent); previews keep analytics disabled.
- Four related links, blog hub link and sitemap entry all present and live.

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

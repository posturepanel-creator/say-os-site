# Search Console — Request Indexing Checklist

_Working note, created 2026-08-07. Local & uncommitted — it won't deploy to the site._

**Before requesting anything:** wait for the Netlify deploy to finish, then confirm the live page shows the new content (e.g. `/aesthetics` title reads "Botox, Filler & Injectable Record", not "Beauty Passport"). Requesting before the deploy is live just re-crawls the old version.

How: Search Console → **URL Inspection** → paste URL → **Request indexing**.

## Priority — new or materially changed (do these)
- [ ] https://say-salon.com/blog/botox-aftercare  — new post
- [ ] https://say-salon.com/aesthetics  — re-slanted off "beauty passport" → "injectable record"

## Optional — changed but Google recrawls on its own (only if quota spare)
- [ ] https://say-salon.com/compare  — GDPR FAQ wording changed
- [ ] https://say-salon.com/blog/  — index now lists the new posts

## Already requested (don't repeat)
- [x] https://say-salon.com/blog/clients-who-rebook-themselves

## No action needed — just need recrawl time, NOT a request
- Canonical-fixed core pages (partners, education, talent, links, privacy, terms) — done 2026-08-05/06
- Internal-link cleanup (site-wide `.html` → clean URLs)
- Homepage no-show cluster cards
- Re-submitting the same URL does not speed up indexing — request once, then wait.

## After ~1–3 weeks, check
- [ ] GSC "Pages" report: did the "Discovered / Crawled – currently not indexed" count drop?
- [ ] GSC Performance → query `beauty passport` → is `client/` still the served URL (aesthetics should have dropped out)?
- [ ] GSC Performance → query `botox aftercare` → any impressions on the new post?

# Runtime acceptance — consent-gated analytics & lead tracking

`analytics-acceptance.js` is a reproducible, **hermetic** Playwright harness that verifies the
site's consent-gated Google Analytics (website stream `G-SWCB3H6QEF`), consent-gated PostHog,
and the readiness/advanced/talent lead flows — **without creating any real leads, emails, or
analytics hits**.

It serves the local repo as it would deploy **without** the externally injected Netlify tag
(the intended final state), and drives the real oaiq consent UI (first-run banner where a
`#say-consent-banner` div exists, else the Cookie-settings panel) in headless Chromium, one
isolated browser context per scenario.

## Hermetic by design (nothing real leaves the machine)
- `gtag.js` is **stubbed** — it records `config`/`event` calls to a local collector; the real
  Google Tag Manager library is never executed.
- GA / PostHog / OpenAI destinations are **aborted + recorded** (so destinations are asserted,
  nothing is sent). Google Fonts is allow-listed (webfont, not analytics).
- The n8n lead webhook (`/webhook/new-lead`) is **mocked per scenario** (confirmed save,
  HTTP 500, `200 {}`, `200` empty) so no real lead/email is ever created.

## Run
```sh
cd tests
npm install
npx playwright install chromium   # one-time browser download
node analytics-acceptance.js      # exit 0 = all checks pass
```
(Or `npm run setup` then `npm test`.)

## What it asserts
- Consent **accepted vs rejected**: GA (and PostHog on Group B pages) load **only after**
  consent; nothing loads on reject.
- Lead capture **confirmed vs failed/ambiguous**: `email_captured` fires exactly once only on
  an explicit `{saved:true}` / `{status:"success"}` ack; HTTP 500, `200 {}`, `200` empty →
  not fired, form preserved.
- **Dedup**: `email_captured` fires once despite repeat submits; started/completed once each.
- **Destinations**: website id `G-SWCB3H6QEF` only; the app id `G-QXYSM1LHV8` never appears;
  no email/PII in any GA call (email only in the mocked lead body).
- **First-run consent banner** present on pricing & talent; **talent lead form** reveals its
  success panel (guards against regression of the repaired truncation).

Note: this harness is intentionally **separate from the root `package.json`** so it is never
installed or run during the Netlify build.

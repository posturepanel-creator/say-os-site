# SAY readiness check — handoff for the existing marketing site

Implement this as a native page in Anca's existing SAY marketing website, deployed on its existing Netlify site. Use the website's verified branding, architecture and deployment workflow.

## Files

- readiness.ts: seven questions, answer options, prioritisation, result calculation and follow-up permission text. This module has no external dependencies.
- readiness-check-reference.tsx: functional UI reference. Adapt React, component imports, routes and styling to the existing website. Reuse installed components rather than adding packages just to match the prototype.
- styles-reference-only.css: reference layout and responsive rules. The velvet-green prototype palette is rejected for the marketing website. Do not copy its global CSS or overwrite the website's theme.

## Experience

For practitioners offering advanced-skin treatments. Seven short questions, one per screen, three choices, Back/Continue, visible progress, about one minute. Start with the first question visible. Keep the Beauty Passport visible as a client-held, shared record. Provide the useful result before optional email capture. Never require an account, trial signup or client invitation in this aisle flow.

The result describes a self-reported consultation process. It does not approve a treatment or certify legal/insurance compliance. Show up to three practical priorities. Missing pre-arrival practitioner review must be highlighted even if other answers are strong. All-routine answers show maintenance advice.

## Lead capture

Replace the reference `/api/leads` endpoint with the existing marketing site's lead-capture mechanism. The Cloudflare D1 backend used by the prototype is not included and must not be copied into Netlify. There are no production records or credentials in this package.

Collect only an email, result title, up to three priorities, source/UTM attribution, permission version and timestamp. Keep questionnaire answers in the page until an explicit email submission. Require affirmative follow-up permission; no pre-ticked checkbox. Validate server-side and use durable storage. Show success only after a confirmed save. Preserve the result and entered email on a save failure. Do not claim an email has been sent unless an actual sending service confirms it. Specify where Anca can see the submitted requests.

Consent: “I’d like SAY to contact me about my result and the Beauty Passport.”
Version: `show-followup-v1`.

Keep first-party source tags via `source` or `utm_source`, and preserve other existing UTM attribution conventions. With the site's existing analytics setup, record `readiness_check_started`, `readiness_check_completed` and `email_captured` without sending email addresses or health information to analytics. Deduplicate repeated renders and repeated submissions. Respect the site's consent handling.

## UK wording

The prototype links to https://www.gov.uk/government/consultations/licensing-of-non-surgical-cosmetic-procedures . Verify current official guidance before publication. Describe England as moving towards the proposed licensing scheme, without claiming it is already in force or that this page makes a business compliant. Preserve the distinction between England's proposals, existing local requirements and the other UK jurisdictions.

## Validation

The prototype's full UI flow was validated at 390 × 844 and 320 × 700. Back preserved selections, Continue was disabled until an answer was chosen, a disposable email saved, consent was required, No thanks left the result available and restart reset it. At 320px with 200% text there was no horizontal overflow. All 2,187 answer combinations passed count, priority and missing-review invariants. Revalidate the implementation in the actual website, including a Netlify deployment and a durable test submission.

The private prototype was https://say-skin-readiness.posturepanel.chatgpt.site . It may be inaccessible to CC; the included source is sufficient. No access or deployment changes to that prototype are needed.

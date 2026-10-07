# Draft / Unpublished Atom Inventory

_As of 2026-10-07. Lives on the **`draft-storage`** branch only. This branch is **storage**: do **not** merge it into `master` or deploy it._

## Unpublished drafts — `published: null` (excluded from output by the publish gate)
Safe to build anywhere; the renderer skips them. Preserved here because they previously existed only as untracked files in the editing worktree.

1. can-i-do-a-facial-or-peel-on-a-client-with-active-acne-uk
2. can-i-do-a-facial-or-peel-on-a-client-with-melasma-uk
3. can-i-massage-a-client-with-a-slipped-disc-or-sciatica-uk
4. can-i-refuse-to-treat-a-client-uk  *(currently in source/wording review for publication — see below)*
5. can-i-treat-a-client-who-has-just-had-a-vaccine-uk
6. can-i-treat-a-client-with-a-history-of-skin-cancer-uk
7. do-i-need-a-council-licence-for-microneedling-or-spmu-uk
8. do-i-need-a-licence-for-laser-hair-removal-or-ipl-uk
9. do-i-need-insurance-to-rent-a-chair-in-a-salon-uk

## Preserved with a pre-existing publish date — NOT approved to publish
These carry a `published:` date set earlier, but **the date does not constitute approval to publish.** They are absent from `master` (never deployed / not live). Preserved here **unchanged**.

- can-i-treat-a-client-who-has-been-drinking-alcohol-uk — `published: 2026-09-13`
- can-i-treat-a-client-with-a-heart-condition-or-after-a-stroke-uk — `published: 2026-09-13`

> ⚠️ Because these two carry dates, the renderer **would** build them if this branch were ever deployed. They are kept out of production **solely** by this branch never being merged or deployed. Do not merge `draft-storage` into `master`.

## Already published & live on `master` (reference only — not stored on this branch)
- how-long-should-i-keep-client-consultation-records-uk — `published: 2026-10-07` (PR #7) — **LIVE**
- can-i-treat-a-client-with-a-cold-flu-or-covid-symptoms-uk — `published: 2026-10-03` — **LIVE**
- can-i-treat-a-client-with-a-metal-implant-or-joint-replacement-uk — `published: 2026-10-03` — **LIVE**
- can-i-treat-a-client-with-a-thyroid-condition-uk — `published: 2026-10-03` — **LIVE**

> Note: the stale `C:\Dev\say-os-site` editing worktree (branch `master` @ `299f713`) still shows untracked `published: null` shadows of the three now-live atoms above. Reconcile with the founder before pulling; do not reset/clean that worktree.

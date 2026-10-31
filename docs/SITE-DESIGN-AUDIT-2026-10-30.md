# SAY-OS site design audit — 2026-10-30

- **Scope:** every HTML page in the site root + `salon-software-london/index.html` (london) + `blog/index.html` (blog index). Blog articles excluded.
- **Method:** static source analysis (read-only) of the production tree. Branch `chore/site-design-audit` off `master` at `bded37c`. No edits.
- **Not present:** `contact.html` (contact is a `mailto:` only), `dpa.html` (no DPA page exists).
- **Format:** each violation as `file:line` · rule · current value. For pages that redefine the palette/fonts in their own `:root`, the root-cause token lines are listed; **every `var()` usage downstream inherits the off-brand value** (not individually enumerated).

## Rule reference (locked system)
Background `#0F2818`; cards `#183222`. Text: `#EDE5D4` headings, `#D4C5A9` body, `#96A097` metadata only. Gold `#C9A961` flat (no gradients). Fonts: Cormorant Garamond (300/600) + Outfit (400/500) only. No near-black, no mint/teal/green, no `#C8352E`, no `#FFFFFF`. Container `1180px` / `24px`. Nav & footer identical across pages.

---

## Summary — violation counts per page

| Page | File | Palette | Fonts | Gradient (btn/text) | Copy | Container | Meta-colour misuse | Total |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| Homepage | `index.html` | 9 | 5 | 0 | 0 | 0 (✓1180) | 2 | **16** |
| Pricing | `pricing.html` | 4 | 4 | — | 1 | 1 | 5 | **15** |
| Salon Owners | `partners.html` | 8 | 3* | 6 | 8 | 1 | — | **26** |
| Talent | `talent.html` | 11 | 3* | 4 | 10 | 1 | — | **29** |
| Educators | `education.html` | 6 | 3* | 2 | 2 | 1 | — | **14** |
| Privacy | `privacy.html` | 2 | 2 | — | — | 1 | — | **5** |
| Terms | `terms.html` | 2 | 2 | — | — | 1 | — | **5** |
| Aesthetics | `aesthetics.html` | 2 | 0 | — | 0 | 1 | — | **3** |
| Compare | `compare.html` | 8 | 3* | — | 3 | 1 | — | **15** |
| Links | `links.html` | 8 | 3* | — | 2 | 1 | — | **14** |
| Blog index | `blog/index.html` | 0 ✓ | ~1 | — | 0 | 1 | — | **2** |
| London | `salon-software-london/index.html` | 1 | 0 ✓ | — | 0 | 1 | 1 | **3** |

\* "Fonts = 3" on the forked pages counts the systemic DM Sans body + DM Mono labels + non-brand fallbacks as grouped families; every label/eyebrow on those pages uses DM Mono.

**Biggest systemic issue:** `partners`, `talent`, `education`, `compare`, `links` each ship a **forked `:root`** that overrides the whole palette and font stack (see below). `pricing` ships a second variant. Only `index`, `london`, `privacy`, `terms`, `blog/index` use the brand base `#0F2818`/`#183222`.

---

## Cross-cutting: forked palettes (root cause for 5 pages)

| File:line | Token | Current value | Should be |
|---|---|---|---|
| `partners.html:20` | `--velvet-black` | `#030a07` | `#0F2818` |
| `partners.html:21` | `--velvet-deep` | `#061a12` | `#183222` |
| `partners.html:22-23` | `--velvet-primary/light` | `#0f2e20` / `#1a4d36` | `#1E3828` / `#24402E` |
| `partners.html:24-25` | `--gold-brushed/accent` | `#e6c985` / `#9e824c` | `#C9A961` (flat) |
| `partners.html:26` | `--alabaster` | `#fdfbf7` (near-white) | `#EDE5D4` |
| `talent.html:20-30` | same set + `--pearl:#ffffff` (28), `--copper:#c47a3a` (29), `--copper-light:#e8955a` (30) | near-black/`#e6c985`/`#fdfbf7`/`#ffffff`/orange | brand palette |
| `education.html:19` | `--velvet-*`/`--gold-*` + sage | `#030a07`…/`#e6c985`; sage `#3a8a6a`,`#4a9e7f` | brand palette (no teal) |
| `compare.html:94-101` | `--velvet-*`/`--gold-*`/`--alabaster` | `#030a07`…/`#e6c985`/`#fdfbf7` | brand palette |
| `links.html:20-27` | `--black/deep/forest/gold/alabaster` | `#030a07`…/`#e6c985`/`#7a6235`/`#fdfbf7` | brand palette |
| `pricing.html:69-70` | `--bg`/`--surface`/`--surface-2`/`--gold-2` | `#030a07` / `#0d2216` / `#123020` / `#c1a368` | `#0F2818`/`#183222`/—/`#C9A961` |

Consequence: on these pages the **page background is `#030a07`/`#0d2216` (near-black, not `#0F2818`)**, cards are `#061a12`/`#123020` (not `#183222`), gold is `#e6c985` (not `#C9A961`), and body/heading text is `#fdfbf7` (near-white, not `#EDE5D4`).

## Cross-cutting: nav & footer are NOT identical

Navs and footers diverge on every page — link sets, fonts, background, and positioning all differ.

**Nav (primary links / CTA):**
| Page | Nav links / CTA | Notes |
|---|---|---|
| index | Pricing · Blog · **Start Free** | `nav` fixed, `padding:20px 48px`, gradient bg, Cormorant logo + Outfit links |
| pricing | Pricing · Blog · **Start Free** | `nav` `padding:20px 24px; max-width:1080px`, DM Sans/DM Mono |
| partners | **Apply for Access** (only) | fixed `20px 48px`, forked gold border `rgba(230,201,133,…)`, DM Mono CTA |
| talent | Solo Professionals · Salon Owners · **Join the Waitlist** | forked palette/fonts |
| education | **Apply for Partnership** (only) | forked palette/fonts |
| compare | **Start Free** | forked palette/fonts |
| london | **See plans** | `.nav` **sticky** (not fixed), `background:rgba(15,40,24,0.95)` |
| blog/index | **Get Free Access** | `.blog-nav` |
| aesthetics | **Start Free** | — |
| privacy / terms | (no standard nav bar) | legal layout |
| links | (no nav) | linktree layout |

**Footer links:**
| Page | Footer links |
|---|---|
| index | Pricing · Salon Owners · London · Educators · Blog · Contact · Privacy Policy · Terms of Service (+ © + ElevenLabs badge) |
| pricing | Home · Compare · Salon Owners · Blog · Privacy Policy · Terms of Service |
| partners | Solo Professionals · Educators · Contact · Privacy Policy · Terms of Service |
| talent | Solo Professionals · Salon Owners · Educators · Talent Enquiries · Privacy Policy · Terms of Service |
| education | Solo Professionals · Salon Owners · Education Enquiries · Privacy Policy · Terms of Service |
| compare | Solo Professionals · Salon Owners · Educators · Talent · Privacy Policy · Terms of Service |
| london | What the Beauty Passport is · Privacy · Terms · say-salon.com |
| blog/index | say-salon.com · app.say-salon.com |
| aesthetics | say-salon.com · Privacy · Terms |
| privacy / terms | Privacy · Terms |
| links | (none) |

→ **No two pages share an identical nav or footer.** Only `index` and `pricing` share nav link *labels* (Pricing/Blog/Start Free) but differ in fonts, padding and max-width.

## Cross-cutting: container width / side padding (rule = 1180 / 24)

| Page | File:line | max-width | side padding | Status |
|---|---|---|---|---|
| index | `index.html:1199` | **1180px** | **24px** | ✓ (legacy dead rules at 357/428/463/526/771 still say 1100px) |
| pricing | `pricing.html:76` | 1080px | 24px | ✗ |
| partners | `partners.html:64,76,87…` | 1100px | 48px | ✗ |
| talent | `talent.html:242,258…` | 1100px | 48px | ✗ |
| education | `education.html:58,70…` | 1100px | 48px | ✗ |
| compare | `compare.html:125` | 1100px | 24px | ✗ |
| london | `salon-software-london/index.html:53` | 860px | 1.5rem (24px) | ✗ |
| blog/index | `blog/index.html:35` | 720px | 2rem | ✗ (narrow listing) |
| privacy / terms | footer `:284` / `:175` | 720px | legal article | ✗ (narrow legal) |
| links | (linktree) | narrow | — | ✗ |
| aesthetics | (not captured) | — | — | review |

---

## Per-page violations

### Homepage — `index.html`
- `59` · near-black token · `--text-main: #1a1a1a`
- `160`,`161` · `#000` in `mask-image` radial-gradient (decorative mask)
- `293` · green accent · `background: #4ade80` (pulse dot)
- `1206`,`1213`,`1236`,`1242`,`1247`,`1268` · off-palette body colour · `color:#C7BBA3` (should be `#D4C5A9`)
- `1230` · off-gold on button · `.hp-btn.primary:hover{background:#D9BD7A}`
- `1202`,`1214`,`1218` · non-brand font · `font-family:'DM Mono',monospace` (eyebrow, `.soon`, `.ptag`)
- **Blog-teaser block (lines 1626–1634):** `1627` near-white `color:#fdfbf7`; `1629`–`1632` near-black card `background:#0d2216`; `1626` `font-family:'DM Mono'` + `1634` `font-family:'DM Sans'`; `1634` off-gold `color:#c1a368`
- `1226` (`.hp-note`), `1250` (`.hp-company`) · meta colour on description · `color:var(--text-muted)` (`#96A097`)
- Container ✓ 1180/24. Buttons use flat gold ✓. Prices £0/£79/£234/£39 ✓. No talent/hire "coming soon". (NB `1354` "…coming soon" is marketing-automation copy, not talent/hire → not flagged.)

### Pricing — `pricing.html`
- `69` · page bg near-black · `--bg:#030a07` (must be `#0F2818`)
- `69` · card near-black · `--surface:#0d2216`, `--surface-2:#123020` (must be `#183222`)
- `70` · off-gold · `--gold-2:#c1a368`
- `74` · non-brand body font · `font-family:'DM Sans',sans-serif`
- `86`,`121` · non-brand · `font-family:'DM Mono',monospace` (eyebrow, footer-copy); `97` `'DM Sans'`
- `89`,`98`,`103`,`107`,`110`,`115` · meta colour on body/description/FAQ · `color:var(--muted)` (hero p, price-sub, note, clientrow, faq-a)
- `76` · container `max-width:1080px` (not 1180)
- `180` · copy · `<li class="soon">Talent marketplace — coming soon</li>`
- Prices in set ✓.

### Salon Owners — `partners.html`
- `20`–`26` · forked palette (bg `#030a07`, cards `#061a12`, gold `#e6c985`, text `#fdfbf7`) — see cross-cutting table
- `94` · green · `.intel-val.green{color:#4ade80}`; `385` green bar `linear-gradient(...,#4ade80,#4ade80)`
- `30` non-brand body `'DM Sans'`; `40,48,52,55,92,96,107,115,122,124,131,143,148,150` · `'DM Mono'` labels/eyebrows
- `43` · font-weight 700 · `.hero h1 strong{font-weight:700;…}`
- Gold gradient on **text**: `43` `.hero h1 strong`, `47` `.hero-stat-n`, `114` `.stat-val`; on **buttons**: `50` `.btn-primary`, `129` `.form-submit`; bar `98` `.intel-bar-fill` — all `linear-gradient(135deg,var(--gold-brushed),var(--gold-accent))`
- `64,76,87,102,113,119` · container 1100px / padding 48px
- Copy: `247` "Apply for Access" (nav), `276` "Apply for Founding Access", `512` "Apply for Founding Partner Access", `475` "Apply for Access" (form); `267-268` "Soon" / "Flat-fee talent hiring"; `341-342` "Talent Marketplace … Coming soon"; `395` "Talent Marketplace · Coming soon"
- Prices not in set: `370` £18,420, `371` £2,104, `372` £11.4

### Talent — `talent.html`
- `20`–`30` · forked palette + `--pearl:#ffffff` (**#FFFFFF**, line 28) + copper/orange `--copper:#c47a3a` (29), `--copper-light:#e8955a` (30)
- `205`,`207` · green · `color/background:#4ade80` (avail dot)
- non-brand fonts DM Sans/DM Mono (e.g. `329` `.coming-soon-label 'DM Mono'`); `132` font-weight 700
- Gold/copper gradient on **buttons** `133`,`150`,`385`; on **text** `403` `.counter-num{…background:linear-gradient…}`
- `242,258,280,333` container 1100px / 48px
- Copy (talent page): `453` "launching soon", `466` "Flat placement fee", `497`/`514`/`766` "Launching Soon", `677` "one flat fee per placement", `324`/`329`/`718`/`733`/`748` "coming-soon" overlay/"Available at Launch"
- Prices not in set: `533` £35, `552` £28, `571` £30, `714` £38

### Educators — `education.html`
- `19` · forked palette (`#030a07`/`#061a12`/`#0f2e20`/`#1a4d36`/`#e6c985`/`#9e824c`)
- `45`,`122` · teal/green + gradient on **buttons** · `.btn-sage` / `.form-submit` `background:linear-gradient(135deg,var(--sage),#3a8a6a)`; sage greens `#3a8a6a`,`#4a9e7f`
- non-brand fonts DM Sans (`45`) / DM Mono (eyebrows)
- `58,70,80,86` container 1100px / 48px
- `417` · copy · "Talent profile (coming soon)"; nav CTA "Apply for Partnership" (`Apply for…` pattern)
- Prices £0 ✓.

### Privacy — `privacy.html`  *(legal)*
- `31` · **`#C8352E`** red + rose · `.art9-flag{background:rgba(200,53,46,0.15);color:#e8665e;…}`
- Fonts: `19` body `font-family:'Outfit', system-ui, sans-serif` (non-brand fallback `system-ui`); `21`,`23` `font-family:'Cormorant Garamond', Georgia, serif` (non-brand fallback `Georgia`)
- Base `#0F2818`/`#183222` ✓; gold `#C9A961` ✓; meta `#96A097` ✓ (defn `17`). Container legal (720px footer, narrow).

### Terms — `terms.html`  *(legal)*
- `29` · **`#C8352E`** red · `.warning{background:rgba(200,53,46,0.08);border:1px solid rgba(200,53,46,0.2);…}`
- `30` · pink/rose text + non-brand sans · `.warning p{color:#e8a09b}` (inherits body `Outfit, system-ui, sans-serif`)
- Fonts: `19` body `'Outfit', system-ui, sans-serif`; `21`,`23` `'Cormorant Garamond', Georgia, serif` (non-brand fallbacks)
- Base/gold/meta ✓. Container legal (720px, narrow).

**Legal-pages colour/font inventory (privacy, terms; dpa absent):** colours used = `#0F2818` (bg), `#183222` (card), `#C9A961` (gold), `#EDE5D4` (cream), `#96A097` (meta), plus the non-brand **`#C8352E`** (as `rgba(200,53,46)`), **`#e8665e`** (privacy rose), **`#e8a09b`** (terms rose). Fonts = `Outfit` + `Cormorant Garamond` (brand) with non-brand fallbacks `system-ui`, `sans-serif`, `Georgia`, `serif`. The Terms disclaimer `.warning` and Privacy `.art9-flag` are the rose/`#C8352E` boxes called out in the brief.

### Aesthetics — `aesthetics.html`
- `60` · off-gold · `--gold-hover:#D4B872`
- `65` · non-brand amber accent · `--caution:#B4800A`
- Base `#0F2818`/`#183222` ✓, meta `#96A097` ✓, surface `#24402E` ✓. Fonts appear brand (no DM/mono flagged). Container not captured — review.

### Compare — `compare.html`
- `94`–`101` · forked palette (bg `#030a07`, cards `#061a12`, gold `#e6c985`, text `#fdfbf7`)
- `228` · green · `.yes{color:#4ade80}`
- non-brand fonts DM Sans/DM Mono
- `125` container `max-width:1100px` / 24px
- Copy: `417`,`525`,`543` "Coming soon" (comparison cells incl. talent-marketplace row)
- Prices not in set: `555` £50, `556` £20, `557` £30

### Links — `links.html`
- `20`–`27` · forked palette (bg `#030a07`, cards `#061a12`, gold `#e6c985`/`#7a6235`, text `#fdfbf7`)
- `273` · green · `color:#4ade80`
- non-brand fonts DM Sans/DM Mono
- Copy: `419` "Talent marketplace (coming soon)", `435` "Coming soon" badge
- Container: linktree layout (narrow, not 1180)

### Blog index — `blog/index.html`
- Colours ✓ all brand (`#0F2818`/`#183222`/`#C9A961`/`#EDE5D4`/`#D4C5A9`).
- `35` · container `max-width:720px` (narrow listing, not 1180)
- Fonts: blog template may use `'DM Mono'` for eyebrows (review) — otherwise brand.

### London — `salon-software-london/index.html`
- `39` · off-gold · `--gold-hover:#D4B872`
- `60`,`70`,`77` · meta colour on description/subhead/body · `color:var(--whisper)` (`#96A097`) on `.hero p.muted`, `.section__sub`, `.journey p`
- `53` · container `max-width:860px` / `padding:0 1.5rem`
- Base `#0F2818`/`#183222` ✓ and fonts Cormorant/Outfit ✓ — closest to brand of the non-homepage pages.

---

## Clean / not-violated
- **Personal names:** none found on any page (founder attribution on homepage is "Founder, SAYOS", no name). ✓
- **"free forever":** not present anywhere. ✓
- **Homepage** container, flat-gold buttons, and price set are correct.
- **Blog index** colours are fully on-brand.

## Notes
- `aesthetics.html`, `compare.html`, `links.html` are in the site root but weren't in the brief's enumerated list; included here for completeness. `contact.html` and `dpa.html` do not exist.
- Decorative background gradients (hero radials, `stats-strip`, 1px divider gradients) were **not** counted as violations — the rule targets gradients on **buttons or text**; those are listed per page where present.

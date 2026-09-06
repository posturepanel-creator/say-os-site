#!/usr/bin/env node
/**
 * SAY-OS Marketing Site — Content Atom Renderer
 * Renders each markdown "content atom" in /content/answers/*.md into a
 * static blog page at /blog/{slug}.html, using the same shell + blog.css
 * as the hand-written posts. The existing generate-sitemap.js then picks
 * them up automatically (it scans /blog/*.html), so no sitemap change is
 * needed. Run this BEFORE generate-sitemap.js in the build.
 *
 * Usage: node scripts/render-answers.js
 * Zero dependencies (node stdlib only) — matches the site's no-install build.
 *
 * SAFETY: will NOT overwrite a /blog/*.html file that this script did not
 * generate (guarded by the GEN_MARKER below), so the 23 hand-crafted posts
 * are protected even if an atom slug ever collides.
 */

const fs = require("fs");
const path = require("path");

const SITE_URL = "https://say-salon.com";
const APP_URL = "https://app.say-salon.com";
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "content", "answers");
const BLOG_DIR = path.join(ROOT, "blog");
const GEN_MARKER = "<!-- generated:atom -->";

const CATEGORY_LABELS = {
  "safety-contraindication": "Safety & Contraindications",
  ops: "Salon Operations",
};

// ---- tiny helpers -------------------------------------------------------

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Inline markdown: **bold** and [text](url). Escapes HTML first.
function inline(s) {
  let out = escapeHtml(s);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const safeUrl = url.replace(/"/g, "%22");
    return `<a href="${safeUrl}">${text}</a>`;
  });
  return out;
}

// Parse `---` frontmatter. Returns { data, body }.
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    data[kv[1]] = val;
  }
  return { data, body: m[2] };
}

// Minimal block-level markdown → HTML. Handles #/##/###, "-" bullet lists,
// and paragraphs. Covers exactly what the atoms use. Returns { h1, html }.
function renderBody(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const parts = [];
  let h1 = null;
  let para = [];
  let list = [];

  const flushPara = () => {
    if (para.length) {
      parts.push(`<p>${inline(para.join(" ").trim())}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      parts.push(
        `<ul>\n${list.map((li) => `  <li>${inline(li)}</li>`).join("\n")}\n</ul>`
      );
      list = [];
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      flushPara();
      flushList();
      continue;
    }
    if (t.startsWith("### ")) {
      flushPara();
      flushList();
      parts.push(`<h3>${inline(t.slice(4))}</h3>`);
    } else if (t.startsWith("## ")) {
      flushPara();
      flushList();
      parts.push(`<h2>${inline(t.slice(3))}</h2>`);
    } else if (t.startsWith("# ")) {
      flushPara();
      flushList();
      if (h1 === null) h1 = t.slice(2).trim(); // capture, don't emit (hero shows it)
      else parts.push(`<h2>${inline(t.slice(2))}</h2>`);
    } else if (/^[-*]\s+/.test(t)) {
      flushPara();
      list.push(t.replace(/^[-*]\s+/, ""));
    } else {
      flushList();
      para.push(t);
    }
  }
  flushPara();
  flushList();
  return { h1, html: parts.join("\n\n  ") };
}

// Drop a trailing SAY-OS pitch paragraph. Atoms self-close with a SAY-OS
// plug; the template already carries a CTA block, so strip the in-body one
// to avoid double-pitching. Only removes the LAST block, and only if it's a
// paragraph (not a heading/list) that mentions SAY-OS.
function stripTrailingPitch(body) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  let i = blocks.length - 1;
  while (i >= 0 && !blocks[i].trim()) i--; // skip trailing blank blocks
  if (i < 0) return body;
  const last = blocks[i].trim();
  const isParagraph = !last.startsWith("#") && !/^[-*]\s/.test(last);
  if (isParagraph && /SAY[-‑–]?OS/i.test(last)) {
    blocks.splice(i, 1);
    return blocks.join("\n\n").replace(/\n+$/, "") + "\n";
  }
  return body;
}

// First paragraph text, trimmed to ~155 chars, for meta description.
function metaDescription(body) {
  const firstPara = body
    .replace(/\r\n/g, "\n")
    .split("\n\n")
    .map((b) => b.trim())
    .find((b) => b && !b.startsWith("#") && !/^[-*]\s/.test(b));
  const text = (firstPara || "").replace(/[*`#]/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= 155) return text;
  return text.slice(0, 152).replace(/\s+\S*$/, "") + "…";
}

// ---- related-atom clusters ----------------------------------------------
// Curated topical clusters for cross-linking. An atom's "Related questions"
// = other atoms sharing any cluster (deduped, capped at RELATED_MAX). Atoms
// may belong to several clusters (e.g. keloid is skin + post-procedure).
// Add new atom slugs here so they inherit related links automatically.
const RELATED_MAX = 4;
const CLUSTERS = [
  // Retinoids / skin-thinning topicals + waxing
  [
    "can-i-wax-a-client-using-retinol-or-tretinoin-uk",
    "can-i-wax-or-peel-a-client-on-roaccutane-uk",
    "can-i-wax-a-client-using-steroid-creams-or-oral-steroids-uk",
  ],
  // Laser / IPL
  [
    "can-i-do-laser-or-ipl-hair-removal-on-tanned-skin-uk",
    "can-i-do-laser-or-ipl-on-a-client-taking-antibiotics-uk",
    "can-i-do-laser-or-ipl-on-darker-skin-fitzpatrick-v-vi-uk",
    "can-i-wax-or-laser-over-a-mole-uk",
    "can-i-wax-or-peel-a-client-with-recent-sunburn-or-sunbed-use-uk",
  ],
  // Bleeding / circulation
  [
    "can-i-massage-a-client-with-high-blood-pressure-uk",
    "can-i-massage-a-client-with-dvt-or-history-of-blood-clots-uk",
    "can-i-wax-or-massage-a-client-with-varicose-veins-uk",
    "can-i-wax-or-do-microneedling-on-a-client-taking-blood-thinners-uk",
    "can-i-massage-a-client-with-lymphoedema-or-after-lymph-node-removal-uk",
  ],
  // Contagious skin / bloodborne infections
  [
    "can-i-do-a-facial-on-a-client-with-a-cold-sore-uk",
    "can-i-treat-a-client-with-ringworm-impetigo-or-scabies-uk",
    "can-i-treat-a-client-with-shingles-or-chickenpox-uk",
    "can-i-do-a-pedicure-on-a-client-with-a-fungal-nail-infection-uk",
    "can-i-cut-or-colour-hair-for-a-client-with-head-lice-uk",
    "can-i-do-lashes-or-brows-on-a-client-with-an-eye-infection-uk",
    "can-i-treat-a-client-with-hepatitis-b-c-or-hiv-uk",
  ],
  // Inflammatory / scarring skin conditions
  [
    "can-i-treat-a-client-with-an-eczema-or-psoriasis-flare-uk",
    "can-i-treat-a-client-with-rosacea-uk",
    "can-i-treat-a-client-prone-to-keloid-scarring-uk",
  ],
  // Allergies / patch testing / reactions
  [
    "can-i-do-gel-nails-on-a-client-with-an-acrylate-allergy-uk",
    "can-i-treat-a-client-with-a-latex-allergy-uk",
    "can-i-treat-a-client-with-a-nut-allergy-uk",
    "can-i-spray-tan-a-client-with-asthma-uk",
    "do-i-need-a-patch-test-for-lash-lift-or-brow-lamination-uk",
    "how-often-patch-test-hair-colour-uk",
    "how-do-i-record-client-allergies-and-reactions-safely-uk",
    "what-to-do-if-a-client-has-an-allergic-reaction-mid-treatment-uk",
  ],
  // Systemic health / medication
  [
    "can-i-treat-a-client-with-diabetes-uk",
    "can-i-treat-a-client-with-epilepsy-in-my-salon-uk",
    "can-i-treat-a-client-undergoing-chemotherapy-uk",
    "can-i-treat-a-client-on-immunosuppressants-or-biologics-uk",
    "can-i-treat-a-client-on-mounjaro-or-wegovy-uk",
    "can-i-use-microcurrent-or-radiofrequency-on-a-client-with-a-pacemaker-uk",
    "can-i-massage-a-client-with-osteoporosis-uk",
    "can-i-massage-a-client-with-lymphoedema-or-after-lymph-node-removal-uk",
  ],
  // Pregnancy / consent / capacity / age
  [
    "which-salon-treatments-are-unsafe-during-pregnancy-uk",
    "which-salon-treatments-need-caution-for-breastfeeding-clients-uk",
    "can-i-treat-a-client-with-dementia-or-who-cant-consent-uk",
    "can-i-colour-hair-or-tint-lashes-for-under-16s-uk",
  ],
  // Post-procedure / tattoo / surgery / scars
  [
    "can-i-do-a-facial-or-massage-on-a-client-who-just-had-botox-or-fillers-uk",
    "can-i-wax-massage-or-spray-tan-over-a-new-tattoo-uk",
    "can-i-treat-a-client-after-recent-surgery-or-over-a-new-scar-uk",
    "can-i-treat-a-client-prone-to-keloid-scarring-uk",
  ],
  // Salon operations
  [
    "do-i-need-consent-to-text-appointment-reminders-uk",
    "how-do-i-build-a-salon-rota-that-covers-my-busiest-times",
    "how-do-i-fill-last-minute-gaps-in-my-salon-schedule",
    "how-do-i-get-clients-to-rebook-before-they-leave",
    "how-do-i-raise-my-prices-without-losing-clients",
    "how-to-reduce-salon-no-shows-uk",
    "how-to-handle-last-minute-cancellations-salon-uk",
    "should-i-charge-booking-deposits",
  ],
];

// Ordered related slugs for a given atom (before publish-filtering / cap).
function relatedSlugs(slug) {
  const out = [];
  for (const cluster of CLUSTERS) {
    if (!cluster.includes(slug)) continue;
    for (const s of cluster) {
      if (s !== slug && !out.includes(s)) out.push(s);
    }
  }
  return out;
}

// ---- page template ------------------------------------------------------

function pageHtml({ title, slug, categoryLabel, desc, drafted, published, heroH1, articleHtml, related }) {
  const canonical = `${SITE_URL}/blog/${slug}`;
  const pub = published && published !== "null" ? published : drafted;
  const escTitle = escapeHtml(title);
  const escDesc = escapeHtml(desc);
  const relatedHtml = (related && related.length)
    ? `
  <nav class="related-block" aria-label="Related questions">
    <h2>Related questions</h2>
    <ul>
${related.map((r) => `      <li><a href="${r.slug}">${escapeHtml(r.title)}</a></li>`).join("\n")}
    </ul>
  </nav>
`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${GEN_MARKER}
  <title>${escTitle} | SAY Salon</title>
  <meta name="description" content="${escDesc}">
  <link rel="canonical" href="${canonical}">
  <!-- Open Graph -->
  <meta property="og:title" content="${escTitle}">
  <meta property="og:description" content="${escDesc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="SAY Salon">
  <meta property="og:image" content="${SITE_URL}/blog/assets/say-og-default.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escTitle}">
  <meta name="twitter:description" content="${escDesc}">
  <meta name="twitter:image" content="${SITE_URL}/blog/assets/say-og-default.jpg">
  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": ${JSON.stringify(title)},
    "description": ${JSON.stringify(desc)},
    "author": { "@type": "Organization", "name": "SAY-OS", "url": "${SITE_URL}" },
    "publisher": { "@type": "Organization", "name": "SAY-OS", "url": "${SITE_URL}" },
    "datePublished": "${pub}",
    "dateModified": "${pub}",
    "mainEntityOfPage": "${canonical}"
  }
  </script>
  <script>
  window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
  gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  gtag('js',new Date());
  window.sayLoadAnalytics=function(){if(window.__sayGaLoaded)return;window.__sayGaLoaded=true;gtag('consent','update',{analytics_storage:'granted'});gtag('config','G-QXYSM1LHV8');var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=G-QXYSM1LHV8';document.head.appendChild(s);};
  try{if(localStorage.getItem('say_consent_analytics')==='granted'){window.sayLoadAnalytics();}}catch(e){}
  </script>
  <link rel="stylesheet" href="blog.css">
</head>
<body>

<nav class="blog-nav">
  <a href="${SITE_URL}" class="blog-nav__logo"><img src="/logo.png" alt="" height="34" style="height:34px;width:auto;border-radius:8px">SAY<span>.</span></a>
  <a href="${APP_URL}" class="blog-nav__cta">Get Free Access</a>
</nav>

<header class="blog-hero">
  <div class="blog-hero__category">${escapeHtml(categoryLabel)}</div>
  <h1>${escapeHtml(heroH1)}</h1>
</header>

<article class="blog-article">

  ${articleHtml}
${relatedHtml}
  <div class="cta-block">
    <h2>Every client, remembered — safely.</h2>
    <p>SAY-OS keeps each client's contraindications, allergies and history in one place, and flags them at booking — so the right call happens before they're in the chair.</p>
    <a href="${APP_URL}?utm_source=blog&utm_medium=seo&utm_campaign=${slug}" class="cta-block__button">Get Free Early Access</a>
    <div class="cta-tagline">Your beauty. Remembered.</div>
  </div>

</article>

<footer class="blog-footer">
  <p>&copy; 2026 SAY-OS by Servicesforyou Ltd. &nbsp;|&nbsp; <a href="${SITE_URL}">say-salon.com</a> &nbsp;|&nbsp; <a href="${APP_URL}">app.say-salon.com</a></p>
  <p class="footer-grant" style="margin-top:16px"><a href="https://elevenlabs.io/startup-grants"><img src="https://eleven-public-cdn.elevenlabs.io/payloadcms/cy7rxce8uki-IIElevenLabsGrants%201.webp" alt="ElevenLabs" style="width:160px"></a></p>
</footer>

<!-- Consent Banner -->
<div id="say-consent-banner" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:9998;padding:16px;">
  <div style="max-width:640px;margin:0 auto;background:#183222;border:1px solid rgba(201,169,97,0.12);border-radius:20px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.5);font-family:Outfit,sans-serif;">
    <h3 style="font-family:Cormorant Garamond,serif;font-weight:600;font-size:18px;color:#EDE5D4;margin:0 0 6px;">Your privacy, your choice</h3>
    <p style="font-size:13px;line-height:1.6;color:#D4C5A9;margin:0 0 16px;">We use one analytics cookie (Google Analytics) to understand how this site is used and improve it. Nothing loads until you choose. <a href="/privacy" style="color:#C9A961;text-decoration:underline;text-underline-offset:2px;">Privacy Policy</a></p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <button onclick="sayConsentChoose('denied')" style="flex:1;min-width:140px;padding:12px;border-radius:12px;font-size:13px;font-weight:500;color:#EDE5D4;background:transparent;border:1px solid rgba(150,160,151,0.20);cursor:pointer;">Reject analytics</button>
      <button onclick="sayConsentChoose('granted')" style="flex:1;min-width:140px;padding:12px;border-radius:12px;font-size:13px;font-weight:500;color:#0F2818;background:#C9A961;border:1px solid #C9A961;cursor:pointer;">Accept analytics</button>
    </div>
  </div>
</div>
<script>
(function(){var KEY='say_consent_analytics';var stored=null;try{stored=localStorage.getItem(KEY);}catch(e){}if(stored!=='granted'&&stored!=='denied'){document.getElementById('say-consent-banner').style.display='block';}window.sayConsentChoose=function(choice){try{localStorage.setItem(KEY,choice);}catch(e){}if(choice==='granted'&&window.sayLoadAnalytics)window.sayLoadAnalytics();document.getElementById('say-consent-banner').style.display='none';};})();
</script>
</body>
</html>
`;
}

// ---- main ---------------------------------------------------------------

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log(`No content/answers/ dir — nothing to render. (${SRC_DIR})`);
    return;
  }
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".md"));
  let rendered = 0;
  let skipped = 0;
  let unpublished = 0;

  // PASS 1: index every PUBLISHED atom's slug → title, so cross-links can
  // resolve link text and skip any related slug that isn't published yet.
  const titleBySlug = {};
  for (const file of files) {
    const { data } = parseFrontmatter(fs.readFileSync(path.join(SRC_DIR, file), "utf-8"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.published || "").trim())) continue;
    const slug = data.slug || file.replace(/\.md$/, "");
    titleBySlug[slug] = data.title || slug;
  }

  // PASS 2: render.
  for (const file of files) {
    const raw = fs.readFileSync(path.join(SRC_DIR, file), "utf-8");
    const { data, body: rawBody } = parseFrontmatter(raw);

    // PUBLISH GATE: only render atoms with a real ISO `published:` date.
    // Draft atoms (published: null / empty) stay in the repo but never ship.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.published || "").trim())) {
      unpublished++;
      continue;
    }

    const body = stripTrailingPitch(rawBody);
    const slug = data.slug || file.replace(/\.md$/, "");
    const related = relatedSlugs(slug)
      .filter((s) => titleBySlug[s]) // only link published atoms
      .slice(0, RELATED_MAX)
      .map((s) => ({ slug: s, title: titleBySlug[s] }));
    const outPath = path.join(BLOG_DIR, `${slug}.html`);

    // SAFETY: never clobber a hand-written post.
    if (fs.existsSync(outPath)) {
      const existing = fs.readFileSync(outPath, "utf-8");
      if (!existing.includes(GEN_MARKER)) {
        console.warn(`SKIP ${slug}.html — exists and is NOT atom-generated (hand-written post). Rename the atom slug to avoid collision.`);
        skipped++;
        continue;
      }
    }

    const { h1, html } = renderBody(body);
    const title = data.title || h1 || slug;
    const heroH1 = h1 || title;
    const desc = metaDescription(body) || title;
    const categoryLabel = CATEGORY_LABELS[data.category] || "Salon Guidance";

    const out = pageHtml({
      title,
      slug,
      categoryLabel,
      desc,
      drafted: data.drafted || "",
      published: data.published || "",
      heroH1,
      articleHtml: html,
      related,
    });
    fs.writeFileSync(outPath, out, "utf-8");
    rendered++;
  }

  console.log(`Atoms rendered: ${rendered} → /blog/  (unpublished/draft: ${unpublished}, skipped: ${skipped})`);
}

main();

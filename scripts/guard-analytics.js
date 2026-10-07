#!/usr/bin/env node
/**
 * Preview-safe analytics guard — runs LAST in the build, after page generation.
 *
 * On non-production Netlify contexts (deploy-preview / branch-deploy) this
 * DISABLES analytics loading and sending in the built HTML — for BOTH known GA4
 * measurement IDs (the website stream and the app stream), regardless of which
 * one a page carries — so preview/branch traffic never reaches the production
 * "SAY-OS Marketing" property. It does NOT substitute a fake ID:
 *   - each GA library loader URL is neutralised to a no-op data: URI, so gtag.js
 *     never loads and no beacons are sent; and
 *   - the gtag('config', <id>) call is removed, so no direct config/send fires.
 * With gtag.js absent, any remaining direct gtag('event', …) calls only push to
 * the in-page dataLayer array — no network request.
 *
 * NOTE: this only transforms repo-built HTML. A tag injected OUTSIDE the build
 * (e.g. a Netlify snippet-injection "before </head>") cannot be reached here and
 * must be handled in the Netlify dashboard.
 *
 * Netlify CONTEXT: production -> intact; deploy-preview / branch-deploy ->
 * disabled; (unset / local) -> intact (safe default). Zero dependencies.
 */
const fs = require("fs");
const path = require("path");

const CONTEXT = process.env.CONTEXT || "";
const NON_PROD = new Set(["deploy-preview", "branch-deploy"]);
const GA_IDS = ["G-SWCB3H6QEF", "G-QXYSM1LHV8"]; // website stream, app stream

const REPLACEMENTS = [];
for (const id of GA_IDS) {
  REPLACEMENTS.push(["https://www.googletagmanager.com/gtag/js?id=" + id, "data:text/javascript,/*analytics-disabled-on-preview*/"]);
  REPLACEMENTS.push(["gtag('config','" + id + "')", "void 0 /*analytics-disabled-on-preview*/"]);
  REPLACEMENTS.push(["gtag('config', '" + id + "')", "void 0 /*analytics-disabled-on-preview*/"]);
}

if (!NON_PROD.has(CONTEXT)) {
  console.log(`guard-analytics: CONTEXT="${CONTEXT || "(unset)"}" — production/local, analytics left intact.`);
  process.exit(0);
}

const ROOT = path.resolve(__dirname, "..");
let changed = 0, scanned = 0;

function apply(html) {
  let out = html;
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  return out;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      scanned++;
      const html = fs.readFileSync(p, "utf8");
      const out = apply(html);
      if (out !== html) { fs.writeFileSync(p, out, "utf8"); changed++; }
    }
  }
}

walk(ROOT);
console.log(`guard-analytics: CONTEXT="${CONTEXT}" — GA loading/sending disabled (both IDs) in ${changed}/${scanned} HTML files.`);

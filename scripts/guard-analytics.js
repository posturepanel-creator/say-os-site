#!/usr/bin/env node
/**
 * Preview-safe analytics guard — runs LAST in the build, after page generation.
 *
 * Every page hardcodes the production GA4 measurement ID, so a Netlify
 * deploy-preview or branch-deploy would send events to the PRODUCTION marketing
 * property. On those non-production contexts this DISABLES analytics loading and
 * sending in the built HTML (it does NOT substitute a fake measurement ID):
 *   - the GA library loader URL is neutralised to a no-op data: URI, so
 *     gtag.js never loads and no network beacons are ever sent; and
 *   - the gtag('config', <prod id>) call is removed, so no direct config/send
 *     reaches production even if something else loaded a tag.
 * With gtag.js absent, any remaining direct gtag('event', …) calls only push to
 * the in-page dataLayer array — they make no network request.
 *
 * (The OpenAI advertising pixel is gated separately, at runtime by host, in
 * oaiq.js.)
 *
 * Netlify CONTEXT:
 *   production      -> left intact
 *   deploy-preview  -> analytics disabled
 *   branch-deploy   -> analytics disabled
 *   (unset / local) -> left intact (safe default)
 * Zero dependencies (node stdlib only).
 */
const fs = require("fs");
const path = require("path");

const CONTEXT = process.env.CONTEXT || "";
const NON_PROD = new Set(["deploy-preview", "branch-deploy"]);

// (from, to) string replacements that disable GA loading + sending.
const REPLACEMENTS = [
  // 1) Neutralise the GA library loader so gtag.js never loads (no beacons).
  ["https://www.googletagmanager.com/gtag/js?id=G-QXYSM1LHV8", "data:text/javascript,/*analytics-disabled-on-preview*/"],
  // 2) Remove the config call (both minified and spaced forms) so no send fires.
  ["gtag('config','G-QXYSM1LHV8')", "void 0 /*analytics-disabled-on-preview*/"],
  ["gtag('config', 'G-QXYSM1LHV8')", "void 0 /*analytics-disabled-on-preview*/"],
];

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
console.log(`guard-analytics: CONTEXT="${CONTEXT}" — GA loading/sending disabled in ${changed}/${scanned} HTML files.`);

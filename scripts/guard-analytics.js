#!/usr/bin/env node
/**
 * Preview-safe analytics guard.
 *
 * Every page hardcodes the production GA4 measurement ID, so a Netlify
 * deploy-preview or branch-deploy would send events to the PRODUCTION
 * marketing property. On those non-production contexts this script rewrites
 * the built HTML to a no-op measurement ID, so preview/branch traffic never
 * reaches production analytics.
 *
 * Uses Netlify's existing CONTEXT env var:
 *   - production      -> left intact
 *   - deploy-preview  -> neutralised
 *   - branch-deploy   -> neutralised
 *   - (unset / local) -> left intact (safe default; local never has consent anyway)
 *
 * Runs AFTER render-answers + generate-sitemap, on the publish directory.
 * Zero dependencies (node stdlib only).
 */
const fs = require("fs");
const path = require("path");

const CONTEXT = process.env.CONTEXT || "";
const PROD_GA = "G-QXYSM1LHV8";
const NOOP_GA = "G-PREVIEWNOOP"; // non-existent property; events go nowhere real
const NON_PROD = new Set(["deploy-preview", "branch-deploy"]);

if (!NON_PROD.has(CONTEXT)) {
  console.log(`guard-analytics: CONTEXT="${CONTEXT || "(unset)"}" — production/local, GA left intact.`);
  process.exit(0);
}

const ROOT = path.resolve(__dirname, "..");
let changed = 0, scanned = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      scanned++;
      const html = fs.readFileSync(p, "utf8");
      if (html.includes(PROD_GA)) {
        fs.writeFileSync(p, html.split(PROD_GA).join(NOOP_GA), "utf8");
        changed++;
      }
    }
  }
}

walk(ROOT);
console.log(`guard-analytics: CONTEXT="${CONTEXT}" — neutralised GA in ${changed}/${scanned} HTML files (${PROD_GA} -> ${NOOP_GA}).`);

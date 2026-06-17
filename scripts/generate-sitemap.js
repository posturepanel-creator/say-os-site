#!/usr/bin/env node
/**
 * SAY-OS Marketing Site — Sitemap Generator
 * Scans core pages + /blog/ posts and writes sitemap.xml
 * with real per-file lastmod dates.
 *
 * Usage: node scripts/generate-sitemap.js
 * Runs automatically via: npm run build (see package.json)
 */

const fs = require("fs");
const path = require("path");

const SITE_URL = "https://say-salon.com";
const ROOT = path.resolve(__dirname, "..");
const BLOG_DIR = path.join(ROOT, "blog");
const OUTPUT = path.join(ROOT, "sitemap.xml");

// Core pages (manually maintained — add new top-level pages here)
const CORE_PAGES = [
  { path: "/", file: "index.html", changefreq: "weekly", priority: "1.0" },
  { path: "/partners.html", file: "partners.html", changefreq: "weekly", priority: "0.9" },
  { path: "/education.html", file: "education.html", changefreq: "monthly", priority: "0.8" },
  { path: "/talent.html", file: "talent.html", changefreq: "monthly", priority: "0.8" },
  { path: "/client/", file: "client/index.html", changefreq: "monthly", priority: "0.8" },
  { path: "/skin-type/", file: "skin-type/index.html", changefreq: "monthly", priority: "0.7" },
  { path: "/links.html", file: "links.html", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy.html", file: "privacy.html", changefreq: "yearly", priority: "0.3" },
  { path: "/terms.html", file: "terms.html", changefreq: "yearly", priority: "0.3" },
];

function getLastmod(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.mtime.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function buildUrlEntry(loc, lastmod, changefreq, priority) {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

function generate() {
  const entries = [];

  // Core pages
  for (const page of CORE_PAGES) {
    const filePath = path.join(ROOT, page.file);
    const lastmod = getLastmod(filePath);
    entries.push(buildUrlEntry(`${SITE_URL}${page.path}`, lastmod, page.changefreq, page.priority));
  }

  // Blog index
  const blogIndex = path.join(BLOG_DIR, "index.html");
  if (fs.existsSync(blogIndex)) {
    entries.push(buildUrlEntry(`${SITE_URL}/blog/`, getLastmod(blogIndex), "weekly", "0.8"));
  }

  // Blog posts — scan /blog/ for .html files (excluding index.html, css, images)
  if (fs.existsSync(BLOG_DIR)) {
    const files = fs.readdirSync(BLOG_DIR)
      .filter((f) => f.endsWith(".html") && f !== "index.html")
      .sort();

    for (const file of files) {
      const slug = file.replace(".html", "");
      const filePath = path.join(BLOG_DIR, file);
      const lastmod = getLastmod(filePath);
      // Lowercase /blog/{slug} — canonical URL format
      entries.push(buildUrlEntry(`${SITE_URL}/blog/${slug}`, lastmod, "monthly", "0.7"));
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  fs.writeFileSync(OUTPUT, xml, "utf-8");

  const blogCount = fs.existsSync(BLOG_DIR)
    ? fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".html") && f !== "index.html").length
    : 0;

  console.log(`Sitemap generated: ${CORE_PAGES.length} core pages + 1 blog index + ${blogCount} blog posts`);
  console.log(`Written to: ${OUTPUT}`);
}

generate();

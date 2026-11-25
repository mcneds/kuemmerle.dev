import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSearchIndex } from "./build-search-index.mjs";
import { renderEntry } from "./render-project-entry.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const origin = "https://kuemmerle.dev";
const sections = { quick: "quick", standalone: "projects", construction: "construction" };
const catalog = JSON.parse(readFileSync(join(root, "projects/catalog.json"), "utf8"));
const check = process.argv.includes("--check");
const outputs = new Map();
const cardIds = new Set();

for (const entry of catalog) {
  if (!/^[a-z0-9-]+$/.test(entry.id ?? "") || cardIds.has(entry.id)) {
    throw new Error(`Invalid or duplicate project ID: ${entry.id}`);
  }
  if (!Object.hasOwn(sections, entry.category)) {
    throw new Error(`Unknown category for ${entry.id}: ${entry.category}`);
  }
  cardIds.add(entry.id);
}

for (const [category, directory] of Object.entries(sections)) {
  const pagePath = join(root, directory, "index.html");
  const html = readFileSync(pagePath, "utf8");
  const start = "<!-- BEGIN GENERATED PROJECT CARDS -->";
  const end = "<!-- END GENERATED PROJECT CARDS -->";
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error(`Missing project card markers in ${directory}/index.html`);
  }
  const cards = catalog
    .filter((entry) => entry.category === category)
    .map((entry) => renderEntry(entry).trimEnd().replace(/[ \t]+$/gm, "").replace(/^ +(?=\S)/gm, (indent) => `    ${indent}`))
    .join("\n");
  outputs.set(pagePath, `${html.slice(0, startIndex + start.length)}${cards}\n        ${html.slice(endIndex)}`);
}

function collectPages(directory) {
  const pages = [];
  const index = join(directory, "index.html");
  if (existsSync(index)) pages.push(index);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) pages.push(...collectPages(join(directory, entry.name)));
  }
  return pages;
}

const pages = [
  join(root, "index.html"),
  ...["contact", "resume", "fun", ...Object.values(sections)]
    .flatMap((directory) => collectPages(join(root, directory)))
];

// Sitemap URLs point to whole, published pages. Card-only projects have
// stable fragment links in the HTML and do not need separate sitemap entries.
const sitemapUrls = pages.flatMap((page) => {
  const html = readFileSync(page, "utf8");
  const robots = html.match(/<meta\b[^>]*\bname=["']robots["'][^>]*>/i)?.[0];
  if (robots && /\bnoindex\b/i.test(robots)) return [];

  const route = relative(root, page).split(sep).slice(0, -1).map(encodeURIComponent).join("/");
  const url = `${origin}/${route ? `${route}/` : ""}`;
  const canonical = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["']/i)?.[1];
  return !canonical || canonical === url ? [url] : [];
}).sort();

outputs.set(join(root, "sitemap.xml"), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`),
  '</urlset>',
  ''
].join("\n"));

outputs.set(join(root, "projects/search-index.json"), JSON.stringify(buildSearchIndex(root, catalog), null, 2) + "\n");

for (const [file, content] of outputs) {
  if (check) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== content) {
      console.error(`Regenerate ${relative(root, file)} with node scripts/build-portfolio.mjs`);
      process.exitCode = 1;
    }
  } else {
    writeFileSync(file, content);
  }
}

import { readFileSync } from "node:fs";
import { join } from "node:path";

const entities = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
const plainText = (markup) => markup
  .replace(/<[^>]+>/g, " ")
  .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key) => {
    if (!key.startsWith("#")) return entities[key] ?? entity;
    const hex = key[1].toLowerCase() === "x";
    const value = Number.parseInt(key.slice(hex ? 2 : 1), hex ? 16 : 10);
    return value <= 0x10ffff ? String.fromCodePoint(value) : entity;
  })
  .replace(/\s+/g, " ").trim();

const readAttribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

// Index only explicit fact elements, never navigation, forms, or the full page.
const factsFrom = (markup, path) => {
  const facts = [];
  const ids = new Set();
  for (const match of markup.matchAll(/<([a-z][\w-]*)\b[^>]*\bdata-project-fact="([^"]+)"[^>]*>/gi)) {
    const [tag, element, kind] = match;
    const id = readAttribute(tag, "id");
    const end = markup.indexOf(`</${element}>`, match.index + tag.length);
    if (!id || ids.has(id) || end < 0) throw new Error(`Invalid search fact on ${path}`);
    ids.add(id);
    const text = plainText(markup.slice(match.index + tag.length, end));
    if (text) facts.push({ kind, text, url: `${path}#${encodeURIComponent(id)}` });
  }
  return facts;
};

export function buildSearchIndex(root, catalog) {
  const facts = {};
  for (const { id, detailUrl } of catalog) {
    if (!/^\/[\w/-]+\/$/.test(detailUrl ?? "")) continue;
    const markup = readFileSync(join(root, detailUrl.slice(1), "index.html"), "utf8");
    facts[id] = factsFrom(markup, detailUrl);
  }

  const path = "/resume/";
  const resume = readFileSync(join(root, "resume/index.html"), "utf8");
  const heading = resume.match(/(<h3[^>]*\bdata-search-experience="([^"]+)"[^>]*>)(.*?)<\/h3>/s);
  if (!heading) throw new Error("Missing searchable experience heading");
  const anchor = readAttribute(heading[1], "id");
  const contribution = factsFrom(resume, path).find((fact) => fact.kind === "role");
  if (!anchor || !contribution) throw new Error("Missing searchable experience source");
  const experience = [{
    id: heading[2],
    title: plainText(heading[3]),
    category: "experience",
    type: "experience",
    actionUrl: `${path}#${anchor}`,
    solution: contribution.text,
    searchFacts: [contribution]
  }];
  return { facts, experience };
}

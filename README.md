# kuemmerle.dev

Add or edit projects in [projects/catalog.json](projects/catalog.json). Copy an
existing entry and give it a unique `id`. Use `quick`, `standalone`, or
`construction` for its category. If it has a full project page, set its
`detailUrl`. For a snapshot, the ID provides a permanent link to the card.

Build the project listings and sitemap from the repository root with Node.js:

```sh
node scripts/build-portfolio.mjs
```

This updates the generated blocks in the three section pages and the search
index. The index adds annotated case-study facts and the public résumé
experience section to the project catalog. Use `searchAliases` for accurate
alternate terms that recruiters might search. The sitemap lists published HTML pages, including new project pages
added under a section. Use `node scripts/build-portfolio.mjs --check` to check
whether the generated files are current.

For automatic regeneration on Cloudflare Pages, set the project's build command
to `node scripts/build-portfolio.mjs` and keep the repository root as the build
output directory. For a static upload without a build step, run the command
before publishing.

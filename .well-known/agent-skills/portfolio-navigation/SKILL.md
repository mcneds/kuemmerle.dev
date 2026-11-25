---
name: portfolio-navigation
description: Navigate kuemmerle.dev and operate its project filters when a user asks to open a portfolio section or locate a project.
---

# Navigate kuemmerle.dev

This public portfolio requires no login or agent registration. Access details
are at https://kuemmerle.dev/auth.md. The content-use policy at
https://kuemmerle.dev/robots.txt allows search and AI summaries of public content.
AI training is disallowed.

## Browser navigation

When WebMCP is available, use `navigate_portfolio` with a `section` of `home`,
`projects`, `quick`, `construction`, `resume`, `contact`, or `fun`.
This opens the selected section in the current tab.

Use `search_portfolio_projects` with a `query` of up to 200 characters.
It matches words across titles, descriptions, tags, and skills in all sections.
The tool returns matching titles, summaries, and URLs, including related links.
On a project library page it also updates the visible filter. An empty query
returns the full catalog and clears the filter when present.

## Ordinary browser fallback

The section URLs are `/`, `/projects/`, `/quick/`, `/construction/`, `/resume/`,
`/contact/`, and `/fun/`. The three project libraries (`/projects/`, `/quick/`,
and `/construction/`) accept a `q` query parameter and provide a visible
search input and Clear button. Detailed projects have their own pages;
smaller entries use anchors within a library. Use the displayed project
links rather than constructing URLs from titles.

You may open `/contact/` or draft a message for the user. Leave form
submission to the user.

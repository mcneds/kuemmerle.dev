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

Use `search_portfolio_projects` with a `query` of up to 200 characters to
update the visible project filter. It searches titles, project descriptions,
tags, and skills. Results include links to matches in other project sections.
An empty query clears the filter. From a page without a project library,
the tool opens `/projects/?q=<URL-encoded query>`.

## Ordinary browser fallback

The section URLs are `/`, `/projects/`, `/quick/`, `/construction/`, `/resume/`,
`/contact/`, and `/fun/`. The three project libraries (`/projects/`, `/quick/`,
and `/construction/`) accept a `q` query parameter and provide a visible
search input and Clear button. Detailed projects have their own pages;
smaller entries use anchors within a library. Use the displayed project
links rather than constructing URLs from titles.

You may open `/contact/` or draft a message for the user. Leave form
submission to the user.

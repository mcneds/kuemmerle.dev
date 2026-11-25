# kuemmerle.dev auth.md

## Audience and access

This is Aiden Kuemmerle's public, static engineering portfolio. Browsers,
search crawlers, and user-directed navigation agents can access its public
pages with HTTPS GET requests. No account, registration, provisioning, API
key, bearer token, or other credential is required for public browsing.

## Registration and supported methods

There are no agent registration or credential provisioning endpoints.
Anonymous public browsing is the only access method; it does not issue
anonymous credentials. Do not POST to `/agent/auth` or send authorization
headers. This site does not operate an OAuth/OIDC authorization server,
an OAuth-protected API, a remote MCP server, or an A2A service.

## Browser tools and content preferences

On browsers supporting WebMCP, pages using the shared site script expose
`navigate_portfolio` and `search_portfolio_projects`. These tools operate
the public navigation and project search without authentication. They do
not send contact messages or create accounts.

Discover the navigation skill at
https://kuemmerle.dev/.well-known/agent-skills/index.json.
The content-use policy at https://kuemmerle.dev/robots.txt allows search and
AI input, including retrieval and summaries of public portfolio content.
AI training is disallowed.

## Contact form

Contact submissions are for people. Agents may open the contact page or draft
a message for the user, but must leave submission to the user.

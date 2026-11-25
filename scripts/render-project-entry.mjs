const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderLinkedText = (value) => {
  const normalized = String(value || "")
    .replace(/<a\b[^>]*href=(["'])(https?:\/\/[^"'<>\s]+)\1[^>]*>[\s\S]*?<\/a>/gi, "$2")
    .replace(/<\/?a\b[^>]*>/gi, "")
    .replace(/&lt;a\b[^&]*href=&quot;(https?:\/\/[^&\s]+)&quot;[^&]*&gt;[\s\S]*?&lt;\/a&gt;/gi, "$1")
    .replace(/&lt;a\b[^&]*href=&#39;(https?:\/\/[^&\s]+)&#39;[^&]*&gt;[\s\S]*?&lt;\/a&gt;/gi, "$1")
    .replace(/&lt;\/?a\b[^&]*&gt;/gi, "");
  return escapeHtml(normalized)
    .replace(/(https?:\/\/[^\s<"']+)/g, (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    )
    .replace(/\n/g, "<br>");
};

const renderPills = (items) =>
  items.map((item) => `<span class="projectPill">${escapeHtml(item)}</span>`).join("");

export const renderEntry = (entry) => {
  const badge = entry.type === "detail" ? "Detailed" : "Single entry";
  const typeLabel = entry.type === "detail" ? "Detailed project page" : "Single-entry snapshot";
  const previewTags = entry.tags.slice(0, 3);
  const previewSkills = entry.skills.slice(0, 3);
  const heroStyle = entry.heroAspect ? ` style="aspect-ratio: ${escapeHtml(entry.heroAspect)};"` : "";
  const heroMediaStyle = entry.heroPositionY ? ` style="object-position: 50% ${escapeHtml(entry.heroPositionY)};"` : "";
  const heroMarkup = entry.heroVideo
    ? `<video
        src="${escapeHtml(entry.heroVideo)}"
        autoplay
        muted
        loop
        playsinline
        preload="metadata"
        ${heroMediaStyle}
        aria-label="${escapeHtml(entry.alt)}"
        onerror="const fallback = document.createElement('div'); fallback.className = 'projectEntryVideoFallback'; fallback.textContent = this.textContent; this.replaceWith(fallback);"
      >${escapeHtml(entry.alt)}</video>`
    : entry.heroIframe
    ? `<div class="projectEntryIframeViewport">
        <iframe
          src="${escapeHtml(entry.heroIframe)}"
          title="${escapeHtml(entry.alt)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>`
    : `<img loading="lazy" src="${escapeHtml(entry.hero)}" alt="${escapeHtml(entry.alt)}"${heroMediaStyle}>`;
  const detailLink = entry.type === "detail" && entry.detailUrl
    ? {
        href: entry.detailUrl,
        label: entry.detailLabel || "Open full project page",
        newTab: Boolean(entry.detailNewTab)
      }
    : null;
  const actionLink = !detailLink && entry.actionUrl
    ? {
        href: entry.actionUrl,
        label: entry.actionLabel || "Open project page",
        newTab: Boolean(entry.actionNewTab)
      }
    : null;
  const ctaLink = detailLink || actionLink;
  const attrsForLink = (link) =>
    ` href="${escapeHtml(link.href)}"${link.newTab ? ' target="_blank" rel="noopener noreferrer"' : ""}`;
  const linkAttrs = ctaLink ? attrsForLink(ctaLink) : "";
  const linkMarkup = ctaLink
    ? `<a class="projectEntryLink"${linkAttrs}>${escapeHtml(ctaLink.label)}</a>`
    : "";
  const extraLinkMarkup = (entry.extraLinks || []).length
    ? `<div class="projectEntryActions">
        ${(entry.extraLinks || [])
          .map((link) =>
            `<a class="projectEntryLink" ${attrsForLink({
              href: link.href,
              newTab: Boolean(link.newTab)
            })}>${escapeHtml(link.label)}</a>`
          )
          .join("")}
      </div>`
    : "";
  const headingMarkup = ctaLink
    ? `<a class="projectEntryHeadingLink"${linkAttrs}>
          <h2 class="projectEntryTitle">${escapeHtml(entry.title)}</h2>
          <p class="projectEntryType">${escapeHtml(typeLabel)}</p>
        </a>`
    : `<h2 class="projectEntryTitle">${escapeHtml(entry.title)}</h2>
        <p class="projectEntryType">${escapeHtml(typeLabel)}</p>`;
  const heroContentMarkup = ctaLink && !entry.heroIframe
    ? `<a class="projectEntryHeroLink"${linkAttrs} aria-label="${escapeHtml(ctaLink.label)}: ${escapeHtml(entry.title)}">
        ${heroMarkup}
      </a>`
    : heroMarkup;

  return `
    <article id="project-entry-${escapeHtml(entry.id)}" class="projectEntry${entry.type === "detail" ? " projectEntry--detail" : ""}" data-project-entry data-entry-id="${escapeHtml(entry.id)}">
      <div class="projectEntryHead">
        <div>
          ${headingMarkup}
        </div>
        <span class="projectEntryBadge">${escapeHtml(badge)}</span>
      </div>
      <figure class="projectEntryHero"${heroStyle}>
        ${heroContentMarkup}
      </figure>
      <div class="projectEntryBody">
        <section class="projectEntryPanel">
          <h3>Problem Definition</h3>
          <p>${escapeHtml(entry.problem)}</p>
        </section>
        <section class="projectEntryPanel">
          <h3>Problem Solution</h3>
          <p>${renderLinkedText(entry.solution)}</p>
        </section>
      </div>
      <div class="projectEntryMeta">
        <details class="projectMetaDetails" open>
          <summary>
            <span>Tags</span>
            <span class="projectMetaPreview">${renderPills(previewTags)}</span>
          </summary>
          <div class="projectPills">${renderPills(entry.tags)}</div>
        </details>
        <details class="projectMetaDetails" open>
          <summary>
            <span>Skills</span>
            <span class="projectMetaPreview">${renderPills(previewSkills)}</span>
          </summary>
          <div class="projectPills">${renderPills(entry.skills)}</div>
        </details>
      </div>
      ${linkMarkup}
      ${extraLinkMarkup}
    </article>
  `;
};

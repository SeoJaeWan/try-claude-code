function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPrimitive(value) {
  return `<p class="guide-text">${escapeHtml(value)}</p>`;
}

function renderList(items) {
  return `
    <ul class="guide-list">
      ${items
        .map((item) => `<li>${renderValue(item)}</li>`)
        .join("")}
    </ul>
  `;
}

function renderObject(value) {
  return `
    <dl class="guide-definition">
      ${Object.entries(value)
        .map(
          ([key, nestedValue]) => `
            <div class="guide-definition-row">
              <dt>${escapeHtml(key)}</dt>
              <dd>${renderValue(nestedValue)}</dd>
            </div>
          `
        )
        .join("")}
    </dl>
  `;
}

function renderCompositeList(items) {
  return `
    <ol class="guide-stack">
      ${items
        .map(
          (item, index) => `
            <li class="guide-stack-item">
              <span class="guide-stack-index">${index + 1}</span>
              <div class="guide-stack-body">${renderValue(item)}</div>
            </li>
          `
        )
        .join("")}
    </ol>
  `;
}

function renderValue(value) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return renderPrimitive(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "";
    }

    const isFlatList = value.every(
      (item) =>
        item === null ||
        item === undefined ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
    );

    return isFlatList ? renderList(value) : renderCompositeList(value);
  }

  if (typeof value === "object") {
    return renderObject(value);
  }

  return renderPrimitive(String(value));
}

function renderMetaPills(meta = {}) {
  const pills = [];

  if (meta.inputMode) {
    pills.push(`input: ${meta.inputMode}`);
  }

  if (meta.executionKind) {
    pills.push(`mode: ${meta.executionKind}`);
  }

  if (Array.isArray(meta.required) && meta.required.length > 0) {
    pills.push(`required: ${meta.required.join(", ")}`);
  }

  if (Array.isArray(meta.requiredAny) && meta.requiredAny.length > 0) {
    for (const fields of meta.requiredAny) {
      pills.push(`required any: ${fields.join(" | ")}`);
    }
  }

  if (meta.outputPattern) {
    pills.push(`output: ${meta.outputPattern}`);
  }

  if (Array.isArray(meta.filePatterns) && meta.filePatterns.length > 0) {
    for (const filePattern of meta.filePatterns) {
      pills.push(`file: ${filePattern}`);
    }
  }

  if (pills.length === 0) {
    return "";
  }

  return `
    <div class="pill-row">
      ${pills.map((pill) => `<span class="pill">${escapeHtml(pill)}</span>`).join("")}
    </div>
  `;
}

function renderExamples(commandId, examples) {
  return `
    <div class="example-stack">
      ${examples
        .map(
          (example, index) => `
            <pre
              class="example-block"
              data-testid="publisher-guide-example-${commandId}-${index}"
            ><code>${escapeHtml(example)}</code></pre>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProfileGroups(groups = []) {
  if (groups.length === 0) {
    return "";
  }

  return `
    <div class="profile-grid">
      ${groups
        .map(
          (group) => `
            <article class="profile-card">
              <h2>${escapeHtml(group.title)}</h2>
              ${renderValue(group.value)}
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCommandGroup(sectionId, group) {
  const body =
    group.kind === "examples"
      ? renderExamples(sectionId, group.value)
      : renderValue(group.value);

  return `
    <article
      class="group-card"
      data-testid="publisher-guide-group-${sectionId}-${group.id}"
    >
      <div class="group-card-header">
        <h3>${escapeHtml(group.title)}</h3>
      </div>
      <div class="group-card-body">
        ${body}
      </div>
    </article>
  `;
}

function renderSections(sections) {
  if (sections.length === 0) {
    return `
      <section class="empty-panel">
        <p class="guide-text">선택한 command에 대한 guide가 없습니다.</p>
      </section>
    `;
  }

  return sections
    .map(
      (section) => `
        <section
          id="${escapeHtml(section.id)}"
          class="command-section"
          data-testid="publisher-guide-command-${section.id}"
        >
          <header class="command-section-header">
            <div class="command-section-label">Command</div>
            <div class="command-section-title-row">
              <h2>${escapeHtml(section.title)}</h2>
              <span class="command-description">${escapeHtml(section.description)}</span>
            </div>
            ${renderMetaPills(section.meta)}
          </header>
          <div class="group-grid">
            ${section.groups.map((group) => renderCommandGroup(section.id, group)).join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function renderNavItems(sections) {
  return sections
    .map(
      (section) => `
        <a
          href="#${escapeHtml(section.id)}"
          class="nav-item"
          data-command-nav
          data-command-id="${escapeHtml(section.id)}"
          data-testid="publisher-guide-nav-item-${section.id}"
        >
          ${escapeHtml(section.title)}
        </a>
      `
    )
    .join("");
}

export function renderPublisherGuideHtml(model, options = {}) {
  const filteredSections = options.activeCommandId
    ? model.sections.filter((section) => section.id === options.activeCommandId)
    : model.sections;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(model.profile.id)} Guide</title>
  <style>
    :root {
      --bg: #f4f1e8;
      --surface: rgba(255, 255, 255, 0.82);
      --surface-strong: #ffffff;
      --border: rgba(40, 36, 28, 0.12);
      --text: #171411;
      --muted: #655b51;
      --accent: #b14d25;
      --accent-soft: rgba(177, 77, 37, 0.12);
      --shadow: 0 20px 45px rgba(52, 42, 29, 0.08);
      --radius-lg: 24px;
      --radius-md: 18px;
      --radius-sm: 12px;
      --page-width: 1180px;
    }

    * {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(177, 77, 37, 0.16), transparent 28rem),
        radial-gradient(circle at top right, rgba(72, 101, 87, 0.12), transparent 24rem),
        linear-gradient(180deg, #f8f5ee 0%, var(--bg) 100%);
      font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
      line-height: 1.6;
    }

    code,
    pre,
    .pill,
    .meta-grid dd {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }

    .page {
      max-width: var(--page-width);
      margin: 0 auto;
      padding: 48px 24px 80px;
    }

    .summary-card {
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(255, 250, 242, 0.94));
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
      padding: 32px;
      backdrop-filter: blur(18px);
    }

    .summary-top {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 18px;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: var(--accent);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-family: "Segoe UI", Arial, sans-serif;
    }

    .summary-card h1,
    .profile-card h2,
    .command-section h2,
    .group-card h3 {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      letter-spacing: -0.02em;
    }

    .summary-card h1 {
      font-size: clamp(2rem, 4vw, 3.4rem);
      line-height: 1.05;
      margin-bottom: 14px;
    }

    .summary-copy {
      margin: 0;
      font-size: 1.05rem;
      color: var(--muted);
      max-width: 70ch;
    }

    .readonly-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      padding: 10px 14px;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-family: "Segoe UI", Arial, sans-serif;
      white-space: nowrap;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 14px;
      margin: 26px 0 0;
    }

    .meta-grid div {
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      background: rgba(23, 20, 17, 0.04);
      border: 1px solid rgba(23, 20, 17, 0.05);
    }

    .meta-grid dt {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 6px;
      font-family: "Segoe UI", Arial, sans-serif;
      font-weight: 700;
    }

    .meta-grid dd {
      margin: 0;
      font-size: 0.92rem;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 18px;
      margin-top: 28px;
    }

    .profile-card,
    .group-card,
    .empty-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: 0 14px 30px rgba(30, 23, 18, 0.05);
      backdrop-filter: blur(12px);
    }

    .profile-card,
    .empty-panel {
      padding: 22px;
    }

    .profile-card h2 {
      font-size: 1rem;
      margin-bottom: 14px;
    }

    .command-nav {
      position: sticky;
      top: 12px;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 24px 0 28px;
      padding: 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.76);
      border: 1px solid var(--border);
      box-shadow: 0 16px 36px rgba(31, 24, 17, 0.08);
      backdrop-filter: blur(18px);
    }

    .nav-item {
      text-decoration: none;
      color: var(--muted);
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 0.9rem;
      font-family: "Segoe UI", Arial, sans-serif;
      font-weight: 700;
      transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .nav-item:hover,
    .nav-item[data-active="true"] {
      color: var(--accent);
      background: var(--accent-soft);
      transform: translateY(-1px);
    }

    .command-section + .command-section {
      margin-top: 22px;
    }

    .command-section-header {
      margin-bottom: 16px;
    }

    .command-section-label {
      color: var(--accent);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-family: "Segoe UI", Arial, sans-serif;
      margin-bottom: 8px;
    }

    .command-section-title-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: baseline;
      margin-bottom: 12px;
    }

    .command-section h2 {
      font-size: clamp(1.5rem, 3vw, 2.2rem);
    }

    .command-description {
      color: var(--muted);
      font-size: 0.98rem;
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .pill {
      display: inline-flex;
      padding: 8px 10px;
      border-radius: 999px;
      background: rgba(23, 20, 17, 0.05);
      color: var(--muted);
      font-size: 0.78rem;
    }

    .group-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
    }

    .group-card {
      overflow: hidden;
    }

    .group-card-header {
      padding: 18px 20px 12px;
      border-bottom: 1px solid rgba(23, 20, 17, 0.06);
    }

    .group-card h3 {
      font-size: 1rem;
    }

    .group-card-body {
      padding: 18px 20px 20px;
    }

    .guide-text {
      margin: 0;
      color: var(--text);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .guide-list,
    .guide-stack {
      margin: 0;
      padding-left: 20px;
    }

    .guide-list li + li,
    .guide-stack li + li {
      margin-top: 10px;
    }

    .guide-definition {
      margin: 0;
      display: grid;
      gap: 14px;
    }

    .guide-definition-row {
      display: grid;
      gap: 8px;
    }

    .guide-definition dt {
      color: var(--muted);
      font-size: 0.84rem;
      font-weight: 700;
      font-family: "Segoe UI", Arial, sans-serif;
      letter-spacing: 0.02em;
    }

    .guide-definition dd {
      margin: 0;
    }

    .guide-stack {
      list-style: none;
      padding: 0;
    }

    .guide-stack-item {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }

    .guide-stack-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      background: rgba(23, 20, 17, 0.06);
      font-size: 0.8rem;
      font-family: "Segoe UI", Arial, sans-serif;
      font-weight: 700;
      color: var(--muted);
    }

    .example-stack {
      display: grid;
      gap: 12px;
    }

    .example-block {
      margin: 0;
      padding: 14px;
      border-radius: var(--radius-sm);
      background: #171411;
      color: #f7f2e9;
      overflow-x: auto;
      font-size: 0.83rem;
      line-height: 1.55;
    }

    @media (max-width: 720px) {
      .page {
        padding: 24px 16px 56px;
      }

      .summary-card {
        padding: 24px 20px;
      }

      .summary-top {
        flex-direction: column;
      }

      .command-nav {
        top: 8px;
        border-radius: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="page" data-testid="publisher-guide-page">
    <header class="summary-card" data-testid="publisher-guide-summary">
      <div class="summary-top">
        <div>
          <p class="eyebrow">${escapeHtml(model.profile.alias)} Publisher Guide</p>
          <h1>${escapeHtml(model.profile.id)}</h1>
          <p class="summary-copy">${escapeHtml(model.profile.summary)}</p>
        </div>
        <div class="readonly-badge" data-testid="publisher-guide-readonly-badge">Read Only</div>
      </div>

      <dl class="meta-grid">
        <div>
          <dt>Alias</dt>
          <dd>${escapeHtml(model.profile.alias)}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>${escapeHtml(model.profile.role)}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>${escapeHtml(model.profile.mode)}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>${escapeHtml(model.profile.version)}</dd>
        </div>
      </dl>

      ${renderProfileGroups(model.profile.groups)}
    </header>

    <nav class="command-nav" data-testid="publisher-guide-nav">
      ${renderNavItems(filteredSections)}
    </nav>

    <main>
      ${renderSections(filteredSections)}
    </main>
  </div>

  <script>
    (() => {
      const navItems = Array.from(document.querySelectorAll("[data-command-nav]"));
      if (navItems.length === 0) {
        return;
      }

      const syncActive = () => {
        const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
        const fallbackId = navItems[0]?.dataset.commandId ?? "";
        const activeId = hash || fallbackId;

        for (const item of navItems) {
          item.dataset.active = item.dataset.commandId === activeId ? "true" : "false";
        }
      };

      window.addEventListener("hashchange", syncActive);
      syncActive();
    })();
  </script>
</body>
</html>`;
}

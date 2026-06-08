# Source Policy

## Source Priority

Use primary or authoritative sources first:

1. Official documentation for the relevant platform, framework, library, API, or product.
2. Standards/specifications such as WHATWG, W3C, IETF RFCs, TC39, or language references.
3. MDN for browser APIs, HTTP, cookies, CORS, storage, and web platform behavior.
4. Official GitHub repositories, release notes, changelogs, or migration guides.
5. Secondary sources only when primary sources are unavailable, and label them as secondary.

## Verification Rules

- Verify version-sensitive or time-sensitive claims before writing.
- Include version or date context when behavior depends on a specific release.
- Use sources for technical facts, API behavior, browser behavior, security rules, framework caching behavior, and performance claims.
- Treat benchmark numbers, measurements, and project-specific observations as user/project evidence, not universal truth.
- If browsing or source access is unavailable, say which claims remain unverified.

## Citation Style

- Add a final `## 출처` section.
- List only sources actually used.
- Prefer direct links to the exact relevant page, not a product homepage.
- In the prose, mention the source only when it helps the reader understand authority, for example `MDN에서는 ...라고 설명합니다`.

## Claim Labels

Use these labels mentally while drafting:

- `verified fact`: supported by a cited source.
- `project observation`: supported by user-provided code, logs, screenshots, or conversation context.
- `practical judgment`: an engineering recommendation based on trade-offs.
- `conversation-based inference`: inferred from the discussion but not independently verified.

Do NOT present `practical judgment` or `conversation-based inference` as a cited fact.

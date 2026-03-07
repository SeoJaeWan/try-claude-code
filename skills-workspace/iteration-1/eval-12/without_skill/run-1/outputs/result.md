# try-claude-code Project Documentation

## Project Overview

**Name:** try-claude-claude (Claude Code workflow plugin)
**Version:** 0.1.0
**Author:** seojaewan
**License:** MIT
**Branch:** 0.1.0

try-claude-code is a Claude Code workflow plugin that provides a structured, opinionated framework for AI-assisted software development. It packages agents, skills, references, and runtime scaffolding to enable Claude Code to follow consistent development workflows including planning, implementation, testing, code review, and documentation generation.

---

## Architecture

The plugin is organized into four top-level directories:

```
try-claude-code/
├── .claude-plugin/      # Plugin metadata (plugin.json)
├── agents/              # Agent definitions (specialized AI personas)
├── references/          # Shared reference documents (coding rules, design system)
├── skills/              # Skill definitions (structured workflows)
└── skills-workspace/    # Runtime workspace for skill execution outputs
```

### Runtime Directory (Consumer-Side)

When initialized in a consumer repository via `init-try`, the plugin creates:

```
<repo>/.claude/try-claude/
├── project.json         # Plugin state, managed reference tracking
├── references/          # Seeded copies of plugin references
├── plans/               # Task plans (plan.md artifacts)
├── reports/             # Generated review reports (accessibility, web-quality)
├── logs/                # Execution logs
├── codemaps/            # Auto-generated code structure docs (for AI agents)
└── humanmaps/           # Auto-generated HTML docs (for human readers)
```

---

## Skills (17 total)

Skills are structured workflow definitions that guide Claude Code through specific tasks. Each skill has a `SKILL.md` file with frontmatter metadata (name, description, model, allowed tools) and detailed step-by-step instructions.

### Initialization and Maintenance

| Skill | Description |
|-------|-------------|
| **init-try** | Bootstraps the `.claude/try-claude/` runtime directory in a consumer repo. Seeds managed references and creates `project.json`. |
| **migration** | Syncs repo-local managed references with the latest plugin defaults. Preserves user-edited markdown sections while updating unchanged ones. |
| **init-coding-rules** | Reads coding-rules references and dynamically generates ESLint, commitlint, husky, lint-staged, and TSConfig configurations. Supports Next.js, NestJS, React Native, Vite React, and base TypeScript. |
| **help-try** | FAQ-style help for plugin operations, runtime structure, MCP configuration, and init/migration workflows. Responds in Korean. |

### Development Workflows

| Skill | Model | Description |
|-------|-------|-------------|
| **planner-lite** | opus | Deterministic plan orchestrator with per-task git worktree isolation, sequential phase commits, and final merge. Coordinates multiple agents across sequential or parallel phases. |
| **frontend-dev** | opus | React/Next.js/Expo development workflow. Custom hooks, state management, API integration. Follows TDD (Red-Green) workflow with plan-driven test files. |
| **backend-dev** | opus | Backend API development workflow. Auto-detects framework (NestJS, Express, Fastify, Spring Boot, Django, Go, Rails). Follows TDD workflow. |
| **ui-publish** | sonnet | UI/UX component creation (layout-first, no logic). Tailwind CSS, shadcn/ui, motion/react. Creates visual components that frontend-dev later connects to logic. |
| **doc-update** | opus | Auto-generates CODEMAPS (markdown for AI agents) and HUMANMAPS (HTML for humans) from service code structure. Uses SHA256 hash-based incremental change detection. |

### Git Operations

| Skill | Model | Description |
|-------|-------|-------------|
| **commit** | haiku | Commits changes following Conventional Commits rules. Validates with commitlint if available. |
| **pr** | haiku | Creates GitHub Pull Requests using `gh` CLI with structured PR body format. |

### Web Quality Review (5-area audit system)

| Skill | Model | Description |
|-------|-------|-------------|
| **web-quality-audit** | opus | Orchestrator for comprehensive 5-area web quality review. Generates unified HTML + CSV reports. |
| **accessibility-review** | opus | KWCAG2.2 (Korean Web Content Accessibility Guidelines) 33-item review + semantic HTML compliance. Supports Playwright automated checks for contrast, keyboard accessibility, and dynamic ARIA. |
| **best-practices** | sonnet | Security (5 items), compatibility (5 items), and code quality (4 items) review. |
| **seo** | sonnet | Technical SEO, on-page SEO, and structured data review (10 items). |
| **performance** | sonnet | Loading performance review covering critical rendering path, images, JavaScript, and fonts (11 items). |
| **core-web-vitals** | sonnet | LCP, INP, and CLS anti-pattern detection (11 items). |

---

## Agents (4 total)

Agents are specialized AI personas with defined roles, tool access, and behavioral instructions.

| Agent | Model | Description |
|-------|-------|-------------|
| **web-quality-reviewer** | sonnet | Orchestrates the 5-area web quality audit. Delegates to accessibility-review, best-practices, SEO, performance, and core-web-vitals skills. |
| **playwright-test-planner** | sonnet | Explores running web applications via browser to create comprehensive E2E test plans. |
| **playwright-test-generator** | haiku | Converts test plans into executable Playwright test files by executing steps in the browser and recording actions. |
| **playwright-test-healer** | sonnet | Debugs and repairs broken Playwright tests by analyzing failures, updating selectors, and fixing assertions. |

---

## References

Shared knowledge documents that skills and agents consult during execution.

### Coding Rules (9 documents)

| File | Content |
|------|---------|
| `code-style.md` | Arrow functions, props destructuring, no nested ternary, early return |
| `comments.md` | JSDoc requirements, "explain why not what" principle, TODO/FIXME format |
| `completion.md` | Standard checklist for task completion verification |
| `folder-structure.md` | Component architecture, hooks root resolution, Next.js App Router structure |
| `git.md` | Conventional Commits message format, branch naming |
| `naming.md` | camelCase/PascalCase conventions, event handlers, arrays, API naming, DB naming |
| `package-manager.md` | Package manager policy |
| `testing.md` | E2E-first TDD strategy, test file structure, unit vs E2E decision criteria |
| `typescript.md` | TSConfig policy, type assertions, type guards, generics, utility types |

### Coding Rules Scripts

Located at `references/coding-rules/scripts/`, these generate boilerplate:

- `generate.mjs` -- Entry point for boilerplate generation (component, hook, api-hook, test-suite, structure)
- `conventions.mjs` -- Convention enforcement utilities
- `naming.mjs` -- Naming convention validation
- `generators/component.mjs` -- React component boilerplate
- `generators/hook.mjs` -- Custom hook boilerplate
- `generators/api_hook.mjs` -- API hook (query/mutation) boilerplate

### Design System (5 documents)

| File | Content |
|------|---------|
| `theme-tokens.md` | Color system, spacing, border radius, responsive strategy, shadows |
| `font.md` | Typography system (Pretendard Variable), font loading |
| `components.md` | Button, Badge, Card, Input/TextArea, Toggle component specs |
| `pages.md` | Page layout principles, common patterns, platform differences |
| `references.md` | Design references, Mobbin search keywords |

### Domain

- `sample-domain.md` -- Sample domain categories and managed vs user-owned classification

---

## Key Workflows

### 1. Project Initialization

```
init-try  -->  migration  -->  init-coding-rules
```

1. `init-try` creates the `.claude/try-claude/` runtime directory and seeds references
2. `migration` updates references on plugin version upgrades (preserves user edits)
3. `init-coding-rules` generates ESLint/commitlint/husky configs from coding-rules

### 2. Feature Development (Plan-Driven)

```
planner-lite  -->  ui-publish  -->  frontend-dev / backend-dev  -->  doc-update  -->  commit  -->  pr
```

1. `planner-lite` reads a `plan.md` and orchestrates execution across git worktrees
2. `ui-publish` creates layout-only UI components (no business logic)
3. `frontend-dev` / `backend-dev` add functionality via TDD workflow
4. Playwright test agents automatically generate E2E tests after UI creation
5. `doc-update` regenerates CODEMAPS/HUMANMAPS documentation
6. `commit` and `pr` handle version control

### 3. Web Quality Audit

```
web-quality-audit  -->  accessibility-review + best-practices + seo + performance + core-web-vitals
```

The `web-quality-reviewer` agent orchestrates all 5 review areas against changed files, producing unified HTML + CSV reports under `.claude/try-claude/reports/`.

---

## Plugin Configuration

### plugin.json

```json
{
  "name": "try-claude-claude",
  "version": "0.1.0",
  "description": "Claude Code workflow plugin providing agents, skills, commands, and references for structured AI-assisted development."
}
```

### Managed References

The `project.json` file tracks 15 managed reference files with section-level SHA256 hashes. This enables the migration skill to perform granular updates -- only overwriting sections the user has not manually edited.

### Model Allocation

- **opus**: Complex workflows (planner-lite, frontend-dev, backend-dev, doc-update, web-quality-audit, accessibility-review)
- **sonnet**: Moderate complexity (ui-publish, web-quality-reviewer, best-practices, seo, performance, core-web-vitals, playwright-test-planner, playwright-test-healer)
- **haiku**: Simple tasks (commit, pr, playwright-test-generator)

---

## Technology Stack Coverage

### Frontend
- React 18+, Next.js 15 (App Router), React Native (Expo SDK 52+)
- Tailwind CSS, shadcn/ui, motion/react
- TanStack Query, Zustand, Jotai

### Backend (Auto-detected)
- NestJS, Express, Fastify (Node.js)
- Spring Boot (Java/Kotlin)
- Django, FastAPI, Flask (Python)
- Gin, Echo, Fiber (Go)
- Rails (Ruby)

### Testing
- Playwright (E2E, with planner/generator/healer pipeline)
- Vitest (unit testing, frontend)
- Framework-native test runners (backend)

### Quality Standards
- KWCAG2.2 (Korean Web Content Accessibility Guidelines, 33 items)
- Core Web Vitals (LCP, INP, CLS)
- SEO best practices (10 items)
- Security and compatibility best practices (14 items)
- Performance optimization (11 items)

---

## File Inventory

### Root Files
- `.gitignore` -- Ignores `.claude` directory
- `.claude-plugin/plugin.json` -- Plugin metadata

### Skills (17 SKILL.md files)
- `skills/accessibility-review/SKILL.md`
- `skills/backend-dev/SKILL.md`
- `skills/best-practices/SKILL.md`
- `skills/commit/SKILL.md`
- `skills/core-web-vitals/SKILL.md`
- `skills/doc-update/SKILL.md`
- `skills/frontend-dev/SKILL.md`
- `skills/help-try/SKILL.md`
- `skills/init-coding-rules/SKILL.md`
- `skills/init-try/SKILL.md`
- `skills/migration/SKILL.md`
- `skills/performance/SKILL.md`
- `skills/planner-lite/SKILL.md`
- `skills/pr/SKILL.md`
- `skills/seo/SKILL.md`
- `skills/ui-publish/SKILL.md`
- `skills/web-quality-audit/SKILL.md`

### Agents (4 agent definition files)
- `agents/playwright-test-generator.md`
- `agents/playwright-test-healer.md`
- `agents/playwright-test-planner.md`
- `agents/web-quality-reviewer.md`

### References (15 managed reference files)
- `references/coding-rules/` (9 files + scripts/)
- `references/design/` (5 files)
- `references/sample-domain.md`

### Scripts
- `skills/init-try/scripts/run.mjs` -- init-try bootstrap script
- `skills/init-try/scripts/runtime-state.mjs` -- Runtime state management
- `skills/migration/scripts/run.mjs` -- Migration sync script
- `references/coding-rules/scripts/generate.mjs` -- Boilerplate generator
- `references/coding-rules/scripts/conventions.mjs` -- Convention utilities
- `references/coding-rules/scripts/naming.mjs` -- Naming validation
- `references/coding-rules/scripts/generators/component.mjs` -- Component generator
- `references/coding-rules/scripts/generators/hook.mjs` -- Hook generator
- `references/coding-rules/scripts/generators/api_hook.mjs` -- API hook generator

# Project Structure

Generated: 2026-03-07
By: doc-update skill

## Overview
- **Project:** try-claude-claude (v0.1.0)
- **Description:** Claude Code workflow plugin providing agents, skills, commands, and references for structured AI-assisted development.
- **Author:** seojaewan
- **License:** MIT
- **Stack:** Claude Code Plugin (Node.js / MJS scripts, Markdown-driven skill and agent definitions)
- **Backend:** No (plugin infrastructure only, no app-level backend)
- **Frontend:** No (plugin infrastructure only, no app-level frontend)
- **Database:** No

## Key Directories
- `.claude-plugin/`: Plugin manifest (`plugin.json`) with name, version, description
- `.claude/try-claude/`: Runtime state directory; holds `project.json` (schema version, sync metadata) and synced managed references
- `agents/`: Agent definition files (8 agents) -- each specifies role, skills, tools, and model
- `skills/`: Skill definition files (17 skills) -- each specifies workflow instructions for a specific capability
- `references/`: Shared reference documents consumed by skills and agents
  - `references/coding-rules/`: 9 coding convention documents (code-style, comments, completion, folder-structure, git, naming, package-manager, testing, typescript) plus generator scripts
  - `references/design/`: 5 design system documents (components, font, pages, references, theme-tokens)
  - `references/sample-domain.md`: Sample domain definition
- `skills-workspace/`: Evaluation and iteration workspace

---

## Agents (8)

| Agent | Description | Model | Skills |
|-------|-------------|-------|--------|
| **frontend-developer** | Frontend development expert for React, React Native, and Next.js | opus | frontend-dev |
| **backend-developer** | Backend development expert. Auto-detects framework and language | opus | backend-dev |
| **publisher** | UI/UX expert for visual component work with Tailwind CSS | sonnet | ui-publish |
| **doc-updater** | Documentation specialist for CODEMAPS and HUMANMAPS generation | opus | doc-update |
| **web-quality-reviewer** | Web quality review covering accessibility, best-practices, SEO, performance, Core Web Vitals | sonnet | web-quality-audit, accessibility-review, best-practices, core-web-vitals, performance, seo |
| **playwright-test-planner** | E2E test planner; explores running web apps via browser to create test plans | sonnet | -- |
| **playwright-test-generator** | Playwright E2E test generator; converts test plans into executable test files | haiku | -- |
| **playwright-test-healer** | Playwright E2E test healer; debugs and repairs broken tests | sonnet | -- |

---

## Skills (17)

### Development Skills
| Skill | Description | Model |
|-------|-------------|-------|
| **frontend-dev** | React/Next.js/Expo development with custom hooks and state management | opus |
| **backend-dev** | Backend API development, database integration, and authentication | opus |
| **ui-publish** | UI/UX component creation (layout-first, no logic) | sonnet |

### Quality & Review Skills
| Skill | Description | Model |
|-------|-------------|-------|
| **web-quality-audit** | Comprehensive web quality review across 5 areas (accessibility, best-practices, SEO, performance, Core Web Vitals) | opus |
| **accessibility-review** | Web accessibility review against KWCAG2.2; generates HTML + CSV reports | opus |
| **best-practices** | Modern web development best practices for security, compatibility, code quality | sonnet |
| **core-web-vitals** | Optimize Core Web Vitals (LCP, INP, CLS) | sonnet |
| **performance** | Web performance optimization for faster loading | sonnet |
| **seo** | Search engine visibility and ranking optimization | sonnet |

### Planning & Workflow Skills
| Skill | Description | Model |
|-------|-------------|-------|
| **planner-lite** | Deterministic plan orchestrator with per-task worktree isolation and sequential phase commits | opus |
| **commit** | Git commits following Conventional Commits rules | haiku |
| **pr** | GitHub Pull Request creation | haiku |

### Documentation & Setup Skills
| Skill | Description | Model |
|-------|-------------|-------|
| **doc-update** | CODEMAPS and HUMANMAPS auto-generation from service code structure | opus |
| **init-try** | Bootstrap repo-local try-claude runtime under `.claude/try-claude/` | -- |
| **init-coding-rules** | ESLint + commitlint + husky + lint-staged + TSConfig dynamic generation | sonnet |
| **migration** | Sync repo-local managed references with latest plugin defaults | -- |
| **help-try** | FAQ-style answers about try-claude setup, init/migration, and runtime structure | -- |

---

## References

### Coding Rules (`references/coding-rules/`)
- **code-style.md**: Props handling, conditional rendering, no nested ternary operators
- **comments.md**: JSDoc, comment principles (explain why not what), TODO/FIXME format
- **completion.md**: Standard checklist, exceptions, principles
- **folder-structure.md**: Component architecture, hooks structure, Next.js App Router structure
- **git.md**: Commit message guidelines, branch naming
- **naming.md**: Next.js exceptions, event handlers, array variables, API naming, DB naming
- **package-manager.md**: Package manager conventions
- **testing.md**: E2E-first strategy, test spec writing rules, unit test rules, file structure
- **typescript.md**: TSConfig merge policy, type assertions, type guards, generics, utility types

### Coding Rules Scripts (`references/coding-rules/scripts/`)
- **conventions.mjs**: Coding conventions utility
- **naming.mjs**: Naming convention utility
- **generate.mjs**: Code generator entry point
- **generators/**: Template generators for api_hook, component, hook, index, structure, test_suite

### Design System (`references/design/`)
- **components.md**: Component specifications (Button, Badge, Card, Input/TextArea, Toggle)
- **font.md**: Font system, loading methods, typography principles
- **pages.md**: Page layout principles, common patterns, platform differences
- **references.md**: Design references and Mobbin search keywords
- **theme-tokens.md**: Color system, spacing, radius, responsive strategy, shadows

### Other
- **sample-domain.md**: Sample domain definition with categories and managed vs user-owned concepts

---

## Skill Reference Files

| Skill | Reference | Purpose |
|-------|-----------|---------|
| accessibility-review | `kwcag22.md` | KWCAG 2.2 checklist |
| accessibility-review | `output-format.md` | Report output format spec |
| best-practices | `guide.md` | Best practices guide |
| core-web-vitals | `guide.md` | Core Web Vitals guide |
| doc-update | `humanmaps-spec.md` | HUMANMAPS HTML specification |
| performance | `guide.md` | Performance optimization guide |
| seo | `guide.md` | SEO optimization guide |
| web-quality-audit | `output-format.md` | Unified report output format |
| help-try | `faq.md` | FAQ content |

---

## Node Scripts

### doc-update scripts
- **`skills/doc-update/detect_changes.mjs`** (323 lines): SHA256 hash-based change detection; discovers service roots, outputs `changes.json`
- **`skills/doc-update/extract_structure.mjs`** (256 lines): Pre-extraction for Next.js routes + Prisma schema; outputs `extracted_structure.json`

### init-try scripts
- **`skills/init-try/scripts/run.mjs`**: Bootstrap script for `.claude/try-claude/` runtime
- **`skills/init-try/scripts/runtime-state.mjs`**: Runtime state management

### migration scripts
- **`skills/migration/scripts/run.mjs`**: Reference sync/migration script

### coding-rules generator scripts
- **`references/coding-rules/scripts/generate.mjs`**: Code generation entry point
- **`references/coding-rules/scripts/conventions.mjs`**: Coding conventions definitions
- **`references/coding-rules/scripts/naming.mjs`**: Naming conventions definitions
- **`references/coding-rules/scripts/generators/`**: Template generators (api_hook, component, hook, index, structure, test_suite)

---

## Runtime Architecture

The plugin uses a **managed references** pattern:
1. Plugin-level references live under `references/` in the plugin repo
2. `init-try` skill bootstraps `.claude/try-claude/` in the consumer repo, seeding reference copies
3. `migration` skill syncs managed references while preserving user-edited markdown sections
4. `project.json` tracks schema version, sync timestamps, and per-file section hashes for merge conflict resolution

### Agent-Skill Mapping
- Agents are the execution units; each agent declares which skills it uses
- Skills contain the detailed workflow instructions
- Some skills (best-practices, core-web-vitals, performance, seo) are sub-skills only invocable through the `web-quality-reviewer` agent
- The `planner-lite` skill orchestrates multi-agent workflows with worktree isolation

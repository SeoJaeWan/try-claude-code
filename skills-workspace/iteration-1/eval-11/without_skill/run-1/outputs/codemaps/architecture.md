# Architecture

## System Overview

try-claude-code is a Claude Code workflow plugin that orchestrates AI agents through skill-based workflows. The system uses a layered architecture where agents are dispatched to perform tasks using skill instructions and reference documents.

## Component Layers

### Layer 1: Agents (agents/)
Specialized AI agent definitions. Each agent has:
- A role description
- Assigned skills
- Allowed tools
- Model preference (opus/sonnet/haiku)
- Background execution capability

| Agent | Role | Skills | Model |
|-------|------|--------|-------|
| frontend-developer | React/Next.js/Expo development | frontend-dev | opus |
| backend-developer | API/DB/auth development (auto-detect framework) | backend-dev | opus |
| publisher | UI/UX component creation (layout-first) | ui-publish | sonnet |
| doc-updater | CODEMAPS + HUMANMAPS generation | doc-update | opus |
| web-quality-reviewer | 5-area web quality audit | web-quality-audit, accessibility-review, best-practices, core-web-vitals, performance, seo | sonnet |
| playwright-test-planner | E2E test plan creation | N/A (browser tools) | sonnet |
| playwright-test-generator | Test plan to Playwright code | N/A (browser tools) | haiku |
| playwright-test-healer | Debug and fix broken tests | N/A (browser + edit tools) | sonnet |

### Layer 2: Skills (skills/)
Reusable workflow definitions. Each skill has:
- A SKILL.md with instructions
- Optional reference documents
- Optional automation scripts

| Skill | Purpose | Agent |
|-------|---------|-------|
| frontend-dev | React/Next.js/Expo hooks + state management | frontend-developer |
| backend-dev | API endpoints, DB, auth (framework auto-detect) | backend-developer |
| ui-publish | Visual component creation (no logic) | publisher |
| doc-update | CODEMAPS + HUMANMAPS auto-generation | doc-updater |
| web-quality-audit | Unified 5-area web quality review | web-quality-reviewer |
| accessibility-review | KWCAG2.2 33-item accessibility audit | web-quality-reviewer |
| best-practices | Web best practices review | web-quality-reviewer |
| seo | Technical + on-page SEO review | web-quality-reviewer |
| performance | Loading/resource optimization review | web-quality-reviewer |
| core-web-vitals | LCP/INP/CLS review | web-quality-reviewer |
| planner-lite | Worktree-isolated plan execution | N/A (orchestrator) |
| commit | Conventional Commits git workflow | N/A (standalone) |
| pr | GitHub Pull Request creation | N/A (standalone) |
| init-try | Bootstrap .claude/try-claude runtime | N/A (standalone) |
| migration | Sync managed references | N/A (standalone) |
| init-coding-rules | ESLint/commitlint/husky config generation | N/A (standalone) |
| help-try | FAQ for plugin usage | N/A (standalone) |

### Layer 3: References (references/)
Shared knowledge documents consumed by skills and agents.

| Category | Files | Purpose |
|----------|-------|---------|
| coding-rules/ | 9 markdown files + scripts/ (7 MJS files) | Code style, naming, folder structure, git, testing, TypeScript, comments, completion, package-manager |
| design/ | 5 files | Theme tokens, components, pages, font, design references |
| sample-domain.md | 1 file | Domain knowledge template |

### Layer 4: Runtime (.claude/try-claude/)
Per-repository runtime state created by init-try:
- `project.json`: Plugin metadata and managed reference tracking
- `references/`: Seeded copies of plugin references (user-editable)
- `codemaps/`: Generated code structure documentation
- `humanmaps/`: Generated HTML documentation
- `plans/`: Task execution plans
- `reports/`: Quality audit reports
- `logs/`: Execution logs

## Data Flow

```
User Request
    |
    v
Orchestrator (planner-lite or direct)
    |
    v
Agent (specialized role)
    |
    +---> Skill Instructions (SKILL.md)
    |         |
    |         +---> Reference Documents
    |         +---> Automation Scripts
    |
    +---> Tools (Read, Write, Bash, Grep, Glob, etc.)
    |
    v
Output (code changes, reports, documentation)
```

## Key Workflows

### Development Workflow
1. planner-lite reads plan.md
2. Creates git worktree per task
3. Dispatches specialized agents per phase
4. Each phase commits sequentially
5. Merges task branch after completion

### Documentation Workflow
1. detect_changes.mjs scans for file changes (SHA256 hashing)
2. extract_structure.mjs pre-parses Next.js routes + Prisma schema
3. doc-updater generates CODEMAPS (.md) for AI consumption
4. doc-updater generates HUMANMAPS (.html) for human consumption

### Quality Review Workflow
1. web-quality-reviewer detects changed web files
2. Delegates to 5 specialized skills (accessibility, best-practices, SEO, performance, CWV)
3. Optionally runs Playwright automated checks
4. Generates unified HTML + CSV reports

### Reference Sync Workflow
1. init-try bootstraps .claude/try-claude/ with reference copies
2. migration syncs updates: unchanged sections updated, edited sections preserved
3. Section-aware tracking via SHA256 hashes in project.json

## Plugin Configuration

### plugin.json
```json
{
  "name": "try-claude-claude",
  "version": "0.1.0",
  "description": "Claude Code workflow plugin"
}
```

### project.json
Tracks managed references with per-section SHA256 hashes for merge-safe synchronization.

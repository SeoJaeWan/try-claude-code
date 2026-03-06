---
name: doc-update
description: CODEMAPS and HUMANMAPS auto-generation. Scans service code structure and generates documentation. Outputs to .claude/try-claude/codemaps/ and .claude/try-claude/humanmaps/.
model: opus
context: fork
agent: doc-updater
---

<Skill_Guide>
<Purpose>
CODEMAPS and HUMANMAPS auto-generation. Scans service code structure and generates documentation. Outputs to .claude/try-claude/codemaps/ and .claude/try-claude/humanmaps/.
</Purpose>

<Instructions>
# doc-update

Service code structure documentation (CODEMAPS + HUMANMAPS auto-generation).

---

## Target

**Service code only**. Detect roots automatically from the current execution root by scanning for
`app/`, `apps/`, `src/`, and `pages/` directories. Excludes `.claude/` and infrastructure folders.

---

## Output Location

**CODEMAPS:** `.claude/try-claude/codemaps/`

```
.claude/try-claude/codemaps/
├── INDEX.md          # Project overview
├── backend.md        # API endpoints (if backend detected)
├── frontend.md       # Pages, routes, components (if frontend detected)
├── database.md       # DB schema, tables (if database detected)
└── architecture.md   # Overall system architecture
```

---

## Workflow

0. (Pre-scan) Run Node scripts:
   a. `node <plugin-root>/skills/doc-update/detect_changes.mjs`
      → Output: `changes.json` (changed/added/deleted list + discovery metadata)
   b. `node <plugin-root>/skills/doc-update/extract_structure.mjs`
      → Output: `extracted_structure.json` (Next.js routes + Prisma models)
1. Read `changes.json` — identify the list of changed files
2. Read `extracted_structure.json` — use pre-extracted structure
3. Scan only changed files (not the entire codebase)
4. Update only the CODEMAPS sections for changed files
   - Unchanged files: skip
   - Deleted files: remove from CODEMAPS
5. Generate HUMANMAPS HTML directly (see HUMANMAPS Output section below)

---

## Detection Logic

### Service Root Discovery (auto, root-relative)
- `detect_changes.mjs` recursively discovers service roots from the current execution root.
- Candidate root names: `app`, `apps`, `src`, `pages`
- Infrastructure/test folders are excluded (for example: `.git`, `node_modules`, `.claude`, `.ai`, `dist`, `coverage`, `__tests__`).
- No repository-specific hardcoding is used (for example, no fixed `repo/*` path).
- `changes.json` includes:
  - `scan_roots`: discovered root directories (relative path list)
  - `discovery_mode`: currently `auto-root-scan`
  - `reason`: `ok`, `no_service_dirs_found`, or `scan_error`

### Backend Detection
- NestJS: `*.controller.ts`, `*.service.ts`, `*.module.ts`
- Express: `routes/`, `controllers/`, `middleware/`
- Fastify: `routes/`, `plugins/`

### Frontend Detection
- Next.js: `app/`, `pages/`, `components/`
- Expo: `app/`, `screens/`, `components/`
- React: `src/`, `components/`, `pages/`

### Database Detection
- Migrations: `migrations/`, `prisma/`, `supabase/migrations/`
- Schema: `schema.sql`, `schema.prisma`
- Config: `supabase/`, `prisma/`

---

## Language

### CODEMAPS (.md) — AI agent consumption
- **Write all content in English** (headings, descriptions, section labels, etc.)
- Keep code, file paths, technical terms, and proper nouns in their original form

### HUMANMAPS (.html) — Human consumption
- **Write all content in Korean** (titles, descriptions, navigation, section headings, etc.)
- Keep code, technical terms, API names, and other proper nouns in their original form
- Examples: "시작하기", "설치", "API 엔드포인트", "컴포넌트 구조"

---

## Output Format

### INDEX.md
```markdown
# Project Structure

Generated: {Date}
By: doc-update skill

## Overview
- Stack: {Tech stack}
- Backend: {Yes/No}
- Frontend: {Yes/No}
- Database: {Yes/No}

## Key Directories
- {Directory 1}: {Purpose}
- {Directory 2}: {Purpose}
```

### backend.md
```markdown
# Backend Structure

## Controllers
- {Controller 1}: {Endpoints}
- {Controller 2}: {Endpoints}

## Services
- {Service 1}: {Purpose}

## Modules
- {Module 1}: {Dependencies}
```

### frontend.md
```markdown
# Frontend Structure

## Pages/Routes
- {Route 1}: {Purpose}
- {Route 2}: {Purpose}

## Components
- {Component 1}: {Location}
- {Component 2}: {Location}

## Hooks
- {Hook 1}: {Purpose}
```

### database.md
```markdown
# Database Schema

## Tables
- {Table 1}: {Columns}
- {Table 2}: {Columns}

## Relationships
- {Relation 1}
- {Relation 2}

## RLS Policies
- {Policy 1}
```

---

## Node Scripts

### detect_changes.mjs

SHA256 hash-based change detection script.

**Run:**
```bash
node <plugin-root>/skills/doc-update/detect_changes.mjs
```

**Output:** `changes.json`
```json
{
  "changed": ["repo/..."],
  "added": ["repo/..."],
  "deleted": ["repo/..."],
  "scan_roots": ["repo/monet-registry/src", "repo/omcc/src"],
  "discovery_mode": "auto-root-scan",
  "reason": "ok",
  "unchanged_count": 142,
  "last_scan": "2026-02-18T10:30:00"
}
```

**Store:** `.doc-hashes.json` (same directory as the script; persisted between runs)

**Fallback:** On error, outputs empty changes.json → LLM performs full regeneration

---

### extract_structure.mjs

Pre-extraction script for Next.js routes + Prisma schema.

**Run:**
```bash
node <plugin-root>/skills/doc-update/extract_structure.mjs
```

**Prerequisite:** `changes.json` must be generated first

**Output:** `extracted_structure.json`

**Fallback:** If extraction fails for a file, it is added to `fallback_files` → LLM processes that file's raw source

---

## 부분 업데이트 모드 (기본값)

변경된 파일에 해당하는 CODEMAPS 섹션만 재생성합니다.

### 실행 절차

1. 변경 파일 감지:
   ```bash
   git diff HEAD --name-only
   ```

2. 영향받는 CODEMAPS 섹션 추출:
   - 변경 파일의 디렉토리 경로를 기반으로 해당 CODEMAPS 섹션 식별
   - 예: `src/auth/` 변경 → `CODEMAPS/auth.md` 재생성

3. 해당 섹션만 재생성

### 전체 재생성 조건

다음 경우 전체 재생성 (`--full` 플래그):
- 변경 파일 10개 이상
- 폴더 구조 변경 (신규 디렉토리 추가/삭제)
- 사용자가 `--full` 명시적 요청

---

## Trigger Policy

**Required:** Final Phase of any task that includes changes to auto-detected service roots (`app/`, `apps/`, `src/`, `pages/`)
**Excluded:** Changes limited to `.claude/`, config-only, or tooling tasks

---

## When Triggered

**Centralized trigger (recommended):**
- Run once in the final Phase, after all implementation, review, and integration is complete
- Orchestrated in plan.md

**Manual trigger (exception):**
```typescript
Task({
  subagent_type: "doc-updater",
  description: "Update CODEMAPS",
  prompt: "Update project documentation. New features were added."
})
```

---

## Features

- **Documentation-as-Code**: Auto-generated from actual code
- **Universal detection**: Works with monorepo/single repo
- **Stack agnostic**: Detects Next.js, NestJS, Expo, etc.
- **Service code only**: Excludes .claude/ system files

---

## Important Notes

- Only updates sections for changed files (incremental update)
- Does NOT touch .claude/ folder
- Scans service roots auto-detected from the current execution root (`app/`, `apps/`, `src/`, `pages/`)
- Run after significant structure changes
- Change detection: detect_changes.mjs detects changed files using SHA256 hashes
- Pre-extraction: extract_structure.mjs pre-parses Next.js routes + Prisma schema
- Silent fallback: On script error, automatically falls back to full regeneration

---

## HUMANMAPS Output (human-readable HTML)

After CODEMAPS generation, generate HUMANMAPS HTML **directly** within this skill (no publisher delegation).

**Output location:** `.claude/try-claude/humanmaps/`

CODEMAPS to HUMANMAPS 1:1 mapping:

| CODEMAPS (.md)    | HUMANMAPS (.html)    |
|-------------------|----------------------|
| INDEX.md          | index.html           |
| backend.md        | backend.html         |
| frontend.md       | frontend.html        |
| database.md       | database.html        |
| architecture.md   | architecture.html    |

Conditional generation: the corresponding HTML is only generated when the CODEMAPS file exists

---

## HUMANMAPS Page Spec

Read `references/humanmaps-spec.md` for the full HUMANMAPS HTML specification (common layout, per-page requirements).
</Instructions>
</Skill_Guide>

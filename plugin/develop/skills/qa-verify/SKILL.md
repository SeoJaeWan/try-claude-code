---
name: qa-verify
description: "Post-phase QA verification that runs after all plan phases complete. Classifies diff into frontend/backend/db tracks, executes read-only checks in parallel (agent-browser for UI routes, GET-only curl for API, migration up + INFORMATION_SCHEMA for DB), and writes findings to plans/{task}/qa/. Report-only — never fixes, never blocks merge. Run inside the `qa-verifier` agent."
model: sonnet
---

<Skill_Guide>
<Purpose>
Verify that a completed task worktree actually behaves the way the plan said it would.
Classify the diff, run read-only checks per track in parallel, write a structured report.
Never fix. Never block.
</Purpose>

<Instructions>
# qa-verify

Read-only post-phase verification workflow.

---

## Inputs (passed in the dispatch prompt by runner)

- Working directory: worktree path (e.g. `worktrees/task-A`)
- Plan file: `plans/{task-name}/plan.md`
- Base branch: value from plan `**Branch:**` header's source (the branch the worktree was created from)

All shell commands below run with `cd` already inside the worktree. Do NOT create new worktrees.

---

## Core principles (repeat as guardrails)

1. **Read-only.** Never edit product code. Only files under `plans/{task}/qa/**` may be written.
2. **No fixes.** Bugs get reported with repro, not patched.
3. **Not a gate.** FAIL in the report does not block merge. Runner shows the summary and the user decides.
4. **Fail-open per track.** If a prerequisite for one track is missing, skip that track and continue others.

---

## Step 1 — Classify the diff

```bash
git diff $BASE..HEAD --name-only > /tmp/qa-changed-files.txt
```

Classify each changed file into one or more tracks:

| Track | Trigger patterns |
|---|---|
| **frontend** | `app/**`, `pages/**`, `src/pages/**`, `src/components/**`, `src/app/**`, `*.tsx`, `*.jsx`, `*.vue`, `*.svelte` |
| **backend** | `src/main/java/**`, `api/**`, `server/**`, `routes/**`, `controllers/**`, `handlers/**`, `*.controller.*`, `*Controller.*` |
| **db** | `migrations/**`, `db/migrate/**`, `prisma/**`, `*.sql`, `**/entity/**`, `**/entities/**` |

If the only changes are in docs/config (`*.md`, `.github/**`, `*.yml`, `*.json` configs, `.eslintrc*`, `tsconfig*`), skip all tracks and write a report that states "no code changes requiring runtime QA" and exit.

If a plan `## Acceptance` section exists in `plans/{task}/plan.md` or any phase file, collect all acceptance bullets. These are the primary ground truth. If none exist, fall back to inferred checks described in each track below.

---

## Step 2 — Prepare output directory

```bash
mkdir -p plans/{task-name}/qa
mkdir -p plans/{task-name}/qa/frontend
mkdir -p plans/{task-name}/qa/backend
mkdir -p plans/{task-name}/qa/db
```

Only create subdirs for active tracks. Skip dirs for inactive tracks.

---

## Step 3 — Run tracks in parallel

Dispatch up to three Bash commands with `run_in_background: true`, one per active track. Each writes its own log file. After all complete, aggregate.

### Frontend track

Prerequisite: a dev server must already be running on one of `3000 / 4000 / 5173 / 8080`. Do NOT start one.

```bash
# Background script for frontend track
(
  # Detect dev server
  PORT=""
  for p in 3000 4000 5173 8080; do
    if curl -sf -o /dev/null "http://localhost:$p/" --max-time 2; then
      PORT=$p
      break
    fi
  done
  if [ -z "$PORT" ]; then
    echo "SKIP: no dev server on 3000/4000/5173/8080" > plans/{task-name}/qa/frontend/findings.md
    exit 0
  fi

  # For each changed frontend file, derive route(s) and walk them with agent-browser.
  # Minimal checklist per route:
  # - page renders without throwing
  # - no console errors (via agent-browser console logs)
  # - no obvious broken link (via agent-browser snapshot check)
  # - for each acceptance bullet that names a route/element, verify it

  # Example per route (repeat for each derived route):
  # npx agent-browser open "http://localhost:$PORT/<route>"
  # npx agent-browser snapshot > plans/{task-name}/qa/frontend/<route>.snapshot.txt
  # npx agent-browser screenshot "body" plans/{task-name}/qa/frontend/<route>.png

  # Write findings.md per page with PASS/PARTIAL/FAIL + repro steps + screenshot refs.
  echo "frontend track complete" >> plans/{task-name}/qa/frontend/findings.md
) > plans/{task-name}/qa/frontend/log.txt 2>&1 &
```

### Backend track

Prerequisite: dev API server running. Auto-detect via GET to `/` or `/health` on 3000/4000/8080/8000.

**HTTP method policy (critical):**

- `GET` / `HEAD` — call for real with `curl`. Verify `2xx`, response shape matches DTO (if present).
- `POST` / `PUT` / `PATCH` / `DELETE` — **do NOT call**. Static-verify only:
  - Handler file exists and exports the route
  - Request DTO file exists
  - Response DTO file exists
  - Validation statements present in handler

```bash
(
  # Detect API server
  API_PORT=""
  for p in 3000 4000 8080 8000; do
    if curl -sf -o /dev/null "http://localhost:$p/health" --max-time 2 \
       || curl -sf -o /dev/null "http://localhost:$p/" --max-time 2; then
      API_PORT=$p
      break
    fi
  done
  if [ -z "$API_PORT" ]; then
    echo "SKIP: no API server on 3000/4000/8080/8000" > plans/{task-name}/qa/backend/findings.md
    exit 0
  fi

  # For each changed controller/handler file:
  # 1. Extract route + method from the file (grep for @GetMapping / router.get / etc.)
  # 2. If GET: curl and capture response JSON to plans/{task-name}/qa/backend/responses/{slug}.json
  # 3. If mutation: open the handler file, confirm request DTO / response DTO / validation are present
  # Record findings with route, method, status (PASS/STATIC/FAIL), evidence path.

  echo "backend track complete" >> plans/{task-name}/qa/backend/findings.md
) > plans/{task-name}/qa/backend/log.txt 2>&1 &
```

### DB track

Prerequisite: database connection available via whatever the project uses (`.env`, docker-compose service, etc.). Do NOT start one.

```bash
(
  # Detect migration tool from changed files and package manifests:
  # - prisma/schema.prisma → `npx prisma migrate deploy` (dry-run preferred: `prisma migrate diff`)
  # - flyway config → `flyway migrate` against dev DB
  # - Rails migrations → `bin/rails db:migrate:status`
  # - plain SQL in migrations/ → psql / mysql client

  # Step DB-1: run migration up against the dev DB
  # Step DB-2: query INFORMATION_SCHEMA (or equivalent) to confirm:
  #   - added columns exist with expected type
  #   - added indexes/constraints exist
  #   - FK targets correct
  # Step DB-3: static-check that a down/rollback file exists (do NOT execute it)

  # If connection fails at any step, write SKIP with reason and exit 0.
  echo "db track complete" >> plans/{task-name}/qa/db/findings.md
) > plans/{task-name}/qa/db/log.txt 2>&1 &
```

### Wait for all tracks

Use `wait` in a parent shell, or check each background job's log file size + a sentinel line until present. Cap each track at 5 minutes; kill and record `TIMEOUT` if exceeded.

---

## Step 4 — Aggregate report

Write `plans/{task-name}/qa/report.md`:

```markdown
# QA Report — {task-name}

**Base:** {BASE}
**HEAD:** {HEAD_SHA}
**Generated:** {ISO timestamp}

## Summary

| Track | Status | PASS | PARTIAL | FAIL | SKIP |
|---|---|---|---|---|---|
| frontend | ✅/⚠️/❌/— | n | n | n | n |
| backend | ✅/⚠️/❌/— | n | n | n | n |
| db | ✅/⚠️/❌/— | n | n | n | n |

## Acceptance coverage

- Total acceptance bullets: N
- Verified: N
- Unverified (no route/endpoint to exercise): N

## Findings

### frontend
(paste from plans/{task-name}/qa/frontend/findings.md — omit if skipped)

### backend
(paste from plans/{task-name}/qa/backend/findings.md — omit if skipped)

### db
(paste from plans/{task-name}/qa/db/findings.md — omit if skipped)

## Evidence

- Screenshots: plans/{task-name}/qa/frontend/*.png
- Response samples: plans/{task-name}/qa/backend/responses/*.json
- Per-track logs: plans/{task-name}/qa/{track}/log.txt
```

---

## Step 5 — Commit the QA artifacts

```bash
git add plans/{task-name}/qa/
git commit -m "docs(qa): add post-phase QA report for {task-name}"
```

This is the ONLY commit qa-verifier makes. It contains only files under `plans/{task}/qa/`.

---

## Step 6 — Report back to runner

Output to the main conversation as plain text:

```
QA 완료.
- frontend: {status summary}
- backend: {status summary}
- db: {status summary}
- 상세: plans/{task-name}/qa/report.md
```

Then end the turn. Do NOT use AskUserQuestion. The runner will pick up the summary in Step 4.

---

## What to avoid

- Do NOT call mutation endpoints (POST/PUT/PATCH/DELETE) with real data.
- Do NOT modify product source files or tests.
- Do NOT start a dev server or database. If one is missing, skip that track.
- Do NOT run destructive DB commands (DROP, TRUNCATE, DELETE without WHERE). Migration up is allowed; down is not executed.
- Do NOT use BLOCK-style language that pressures the runner to reject the merge.
- Do NOT commit outside of `plans/{task-name}/qa/`.
- Do NOT open new worktrees or use EnterWorktree.
- Do NOT pull in specialist subagents — this is a single-agent workflow; parallelism is via background Bash only.
</Instructions>
</Skill_Guide>

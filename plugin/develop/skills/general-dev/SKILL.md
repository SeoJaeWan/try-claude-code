---
name: general-dev
description: "Infrastructure and DevOps development. Handles Docker, CI/CD, nginx, environment config, monorepo build scripts, and tasks outside frontend/backend scope. Use when the task involves Dockerfiles, GitHub Actions workflows, nginx config, .env setup, or deployment scripts. Triggers on: 'add Docker support', 'set up CI/CD', 'configure nginx', 'create .env template', 'write a deploy script', or any infra work that no single dev domain owns. Run inside the `general-developer` agent."
---

<Skill_Guide>
<Purpose>
Infrastructure and DevOps development. Handles Docker, CI/CD pipelines, nginx, environment configuration, monorepo build scripts, and tasks that belong to neither frontend nor backend.
</Purpose>

<Instructions>
# general-dev

Expert infrastructure and DevOps workflow.

---

## Scope

Own work that does NOT belong to frontend-dev or backend-dev:

- Docker, docker-compose, nginx configuration
- CI/CD pipelines (GitHub Actions, etc.)
- Environment variable management (.env templates, secrets config)
- Monorepo root-level build scripts and tooling
- Infrastructure-as-code, deploy scripts
- Cross-service orchestration config

---

## Boundary rules

- Do NOT touch frontend files (components, hooks, pages, styles, frontend config like tsconfig/ESLint). That is frontend-dev's job.
- Do NOT touch backend files (API endpoints, DB operations, migrations, authentication, server logic). That is backend-dev's job.
- Do NOT install packages for frontend or backend — each team installs what they need.
- If a task overlaps with frontend or backend, handle only the infrastructure portion and leave the rest.

---

## Implementation Steps

1. Read plan from `plans/<slug>.plan.md` or `plans/<slug>/plan.md`
2. Consult the project dev-wiki — follow `plugin/develop/references/dev-wiki-lookup.md` to narrow candidate files and pick up recorded conventions (skip silently if no wiki)
3. Implement the required infrastructure changes
4. Validate configuration syntax where possible (e.g., `docker compose config`, `nginx -t`, YAML lint)
5. Return results based on plan.md

</Instructions>
</Skill_Guide>

---
name: general-dev
description: Infrastructure and DevOps development. Handles Docker, CI/CD, nginx, environment config, monorepo build scripts, and tasks outside frontend/backend scope.
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

1. Read plan from `plans/{task-name}/plan.md`
2. Read `codemaps/infra.md` (if present)
3. Implement the required infrastructure changes
4. Validate configuration syntax where possible (e.g., `docker compose config`, `nginx -t`, YAML lint)
5. Return results based on plan.md

</Instructions>
</Skill_Guide>

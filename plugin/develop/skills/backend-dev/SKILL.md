---
name: backend-dev
description: "Backend API development, database integration, and authentication. Auto-detects framework and language from project files. Use for API endpoints, DB operations, server logic, and backend testing."
model: opus
context: fork
agent: backend-developer
---

<Skill_Guide>
<Purpose>
Backend API development, database integration, and authentication.
Auto-detects framework and language from project files.
Use for API endpoints, DB operations, server logic, and backend testing.
</Purpose>

<Instructions>
# backend-dev

Expert backend development workflow — API endpoints, DB operations, auth, and server logic.

## Convention Discovery (do this before writing any code)

Every project has its own backend conventions — package structure, naming rules, error
handling patterns, dependency injection style. Your job is to discover them from the
existing code, not to guess or impose defaults. Skip any step whose target does not
exist in the project.

### 1. Detect the stack

Identify the framework and language from project files — build files (`pom.xml`,
`build.gradle`, `package.json`, etc.), directory structure, and existing source code.
Also check which ORM, auth library, and test framework are in use.

### 2. Scan existing patterns

Read 2-3 representative examples of each layer (controller, service, repository, DTO/model)
that already exist in the project. Extract conventions by observation:

- **Directory structure**: package-by-feature or package-by-layer? Where do controllers, services, repos, DTOs, entities live?
- **Naming**: `ProductController` vs `productController`? DTO suffix patterns? (`CreateProductRequest`, `ProductDto`, etc.)
- **Error handling**: global exception handler? per-controller try/catch? error response shape?
- **Validation**: annotation-based (@Valid, class-validator)? manual? middleware?
- **Dependency injection**: constructor injection, field injection, or framework-specific pattern?
- **Response shape**: wrapped (`{ data, message, status }`) or raw entity?
- **Database access**: repository pattern, DAO, direct query, ORM conventions?
- **Test patterns**: unit test location, naming, mocking approach?

### 3. Summarize conventions before implementing

Before writing any code, state the discovered conventions in 5-10 bullet points.
This ensures you and the project are aligned. If you cannot find enough examples
(e.g., greenfield project), fall back to the framework's official conventions.

## HTTP Error Response Handling

Every API endpoint must include proper error responses. Match the project's existing
error response format. If no pattern exists, use this as a baseline:

| Status             | When to use                          | Example                                  |
| ------------------ | ------------------------------------ | ---------------------------------------- |
| `400 Bad Request`  | Invalid input, validation failure    | DTO validation fails                     |
| `401 Unauthorized` | Missing or invalid authentication    | No/expired JWT token                     |
| `403 Forbidden`    | Insufficient permissions             | User accessing admin route               |
| `404 Not Found`    | Resource does not exist              | `GET /products/:id` with non-existent ID |
| `409 Conflict`     | Duplicate resource or state conflict | Creating user with existing email        |

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md` (if present)
2. Read `codemaps/backend.md`, `codemaps/database.md` (if present)
3. **Run Convention Discovery** (above) — scan existing code for patterns
4. Implement the required logic, following discovered conventions exactly
5. If plan includes `tests/`: copy test files to source tree, run Red verification
6. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
7. Run tests — confirm ALL pass (Green)
8. If plan includes `e2e/`: if E2E fails, fix implementation, NOT tests
9. Return results based on plan.md

## What to avoid

- Do NOT invent conventions that do not exist in the codebase — follow what is already there
- Do NOT assume a specific framework before checking — always detect first
- Do NOT change existing package/directory organization to match some "ideal" structure
- Do NOT add libraries that are not already in the project without asking

</Instructions>
</Skill_Guide>

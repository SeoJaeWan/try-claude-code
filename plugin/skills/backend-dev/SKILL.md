---
name: backend-dev
description: Backend API development, database integration, and authentication. Auto-detects framework and language from project files. Use for API endpoints, DB operations, server logic, and backend testing.
model: opus
context: fork
agent: backend-developer
---

<Skill_Guide>
<Purpose>
Backend API development, database integration, and authentication. Auto-detects framework and language from project files. Use for API endpoints, DB operations, server logic, and backend testing.
</Purpose>

<Instructions>
# backend-dev

Expert backend development workflow.

---

## CLI 필수 사용

이 프로젝트는 `tcb` CLI로 module, entity, DTO를 관리한다. **모든 작업에서 반드시 `tcb`를 실행해야 한다.**

1. 먼저 `tcb --help`를 실행하여 사용 가능한 명령어를 확인한다
2. 요청받은 작업에 맞는 `tcb` 명령어를 매칭한다 (module, entity, requestDto, responseDto, batch 등)
3. 해당 명령어의 `tcb help <command> --text`로 사용법을 읽는다
4. `tcb <command> --apply`로 실행한다

---

## HTTP Error Response Handling

모든 API endpoint에 적절한 에러 응답을 포함한다.

| Status | When to use | Example |
|---|---|---|
| `400 Bad Request` | Invalid input, validation failure | DTO validation fails |
| `401 Unauthorized` | Missing or invalid authentication | No/expired JWT token |
| `403 Forbidden` | Insufficient permissions | User accessing admin route |
| `404 Not Found` | Resource does not exist | `GET /products/:id` with non-existent ID |
| `409 Conflict` | Duplicate resource or state conflict | Creating user with existing email |

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md`
2. Read `codemaps/backend.md`, `codemaps/database.md` (if present)
3. **`tcb --help`를 실행**하고 요청에 맞는 명령어를 찾는다
4. **`tcb help <command> --text`로 사용법을 읽고, `tcb <command> --apply`로 scaffold를 생성**한다
5. 생성된 파일 안에서 로직을 구현한다
6. If plan includes `tests/`: copy test files to source tree, run Red verification
7. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
8. Run tests — confirm ALL pass (Green)
9. If plan includes `e2e/`: if E2E fails, fix implementation, NOT tests
10. Return results based on plan.md
  </Instructions>
  </Skill_Guide>

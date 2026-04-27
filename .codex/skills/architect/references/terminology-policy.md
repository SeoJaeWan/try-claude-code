# Korean-First Plan Terminology

Use this policy when writing visible `plan.md` prose, phase detail prose, upstream `brainstorm` / `design-discovery` handoff tables, and `plan-review` findings.

## Core Rule

Visible planning text is Korean-first. Keep English only when the word is an exact technical identifier, a product/tool/library name, a file path, a command, an environment variable, a package/API/schema key, an agent name, or a canonical taxonomy ID that another skill must match literally.

Do not use English planner shorthand in human-readable prose when a natural Korean term exists.

## Allowed English

- Code identifiers, file paths, commands, package names, API names, database names, framework names, and product names: `mysql`, `components`, `useQuery`, `package.json`, `npm test`
- Required plan fields and machine-readable keys: `Branch`, `Worktree dir`, `Phase`, `Agent`, `owner_agent`, `input`, `output`, `negative/no-op`, `failure/validation`
- Canonical visual comparison IDs and fields from `visual-parity-contract.md`: `structural parity`, `full-fidelity parity`, `frame-surface`, `comparison mode`, `gating metric`
- Tags, rule IDs, branch names, slugs, and other registry or routing identifiers

When a canonical English key is needed, keep it in code spans and explain the surrounding sentence in Korean.

## Preferred Korean Terms

| Avoid in visible prose | Prefer |
| --- | --- |
| surface | 대상 영역, 화면 영역, 변경 대상, 공개 경계 |
| public surface | 공개 경계, 외부로 드러나는 계약 |
| touched public surface | 영향받는 공개 경계 |
| user action | 사용자 행동 |
| completion condition | 완료 조건 |
| routing | 배정, 전달 경로, 진행 경로 |
| boundary | 경계, 변경 경계 |
| contract | 계약 |
| metadata | 보조 정보 |
| owner | 소유자, 담당자 |
| phase | 단계 |
| local surface -> canonical surface role mapping | 로컬 영역을 표준 영역 역할로 매핑 |

Use `라우팅` only for URL/router behavior. Use `routing` only when it is a literal schema key or command output.

Use `boundary`, `contract`, `owner`, `phase`, or `metadata` only as exact field names, code identifiers, or quoted source text. In explanatory Korean prose, use the Korean terms above.

## Review Standard

Treat terminology drift as a review finding when it affects scanability or forces a human reviewer to translate planner shorthand. Escalate it from `minor` to `major` when mixed terminology hides user-visible behavior, public contracts, ownership, completion criteria, or verification meaning.

# Test Manifest

## Files

| Artifact File | Boundary Type | Boundary Name | Placement Intent | Constraints | Scenario Types |
| --- | --- | --- | --- | --- | --- |
| `command-router.test.mjs` | `utility` | `commandRouter` | `shared` | [C-CLI-001] | expected, defensive |
| `help-renderer.test.mjs` | `utility` | `helpRenderer` | `shared` | [C-CLI-002] | expected, defensive |
| `profile-loader.test.mjs` | `utility` | `profileLoader` | `shared` | [C-CLI-003] | expected, defensive, exception |
| `publisher-frontend-profile.test.mjs` | `validator` | `publisherFrontendProfileValidator` | `shared` | [C-CLI-004], [C-CLI-006] | expected, defensive, edge |
| `backend-profile.test.mjs` | `validator` | `backendProfileValidator` | `shared` | [C-CLI-005], [C-CLI-006] | expected, defensive, exception |

## Implementation Placement

- 최종 배치는 구현 단계에서 `packages/dev-cli`의 test runner와 소스 배치 규칙을 읽고 resolve한다.
- core contract 테스트는 `packages/dev-cli` 내부 test tree에 co-locate하거나 `tests/` 루트로 둘 수 있다.
- profile validator 테스트는 구현 단계에서 validator module 근처로 이동하되, 시나리오와 assertion은 그대로 유지한다.

## Coverage

- Total constraints: 6
- Constraints with expected coverage: 6
- Constraints with defensive coverage: 6
- Constraints with explicit edge/exception review: 6
- Coverage: 100%


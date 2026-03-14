# Test Manifest

## Files

| Artifact File | Boundary Type | Boundary Name | Placement Intent | Constraints | Scenario Types |
| --- | --- | --- | --- | --- | --- |
| `profile-summary.service.spec.ts` | `service` | `AppService.buildProfileSummary` | `api` | [C-PROFILE-001], [C-PROFILE-002], [C-PROFILE-004] | expected, defensive, edge |
| `profile-summary.controller.spec.ts` | `controller` | `AppController.getProfileSummary` | `api` | [C-PROFILE-003], [C-PROFILE-004] | expected, defensive |

## Implementation Placement

- Resolve final destination during implementation using Nest/Jest `src/**/*.spec.ts` conventions
- Keep assertions and scenarios unchanged when relocating plan artifacts
- If destination is still unclear after reading local conventions, stop and ask the user

## Notes

- Controller boundary는 외부 의존 예외 처리를 새로 만들지 않는다. defensive coverage는 "정규화된 0-count 응답도 래핑 없이 전달" 시나리오로 고정한다.

## Coverage

- Total constraints: 4
- Constraints with expected coverage: 4
- Constraints with defensive coverage: 4
- Constraints with explicit edge/exception review: 4
- Coverage: 100%

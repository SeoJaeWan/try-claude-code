# eval-3-profile-flow Guard Test Summary

## Journey

Login → Profile edit (name + skill selection) → Save → Verify dashboard greeting reflects change → Re-enter profile to confirm data persistence

**Journey ID:** JOURNEY-PROFILE-001
**App URL:** http://localhost:3000

## Generated Test File

`features/next-app/tests/guard/profile/login-profile-edit-dashboard.spec.ts`

## Test Results

All 5 tests passed in 6.2s.

```
✓ [JOURNEY-PROFILE-001] 프로필 이름·스킬 수정 후 저장 시 대시보드 인사말에 반영된다 (1.4s)
✓ [JOURNEY-PROFILE-001] 프로필 수정 후 재진입해도 변경된 데이터가 유지된다(857ms)
✓ [JOURNEY-PROFILE-001] 페이지 새로고침 후 프로필 데이터가 localStorage에서 복원된다 (708ms)
✓ [JOURNEY-PROFILE-001] 프로필 수정 취소 시 원래 이름이 유지되고 대시보드 인사말이 변경되지 않는다 (652ms)
✓ [JOURNEY-PROFILE-001] 이름 빈칸 저장 시 에러 표시 — 데이터 변경 없이 프로필 폼 유지 (647ms)
```

## Scenarios Covered

| Type | Test | Description |
|---|---|---|
| Happy flow | 이름·스킬 수정 후 저장 → 대시보드 인사말 반영 | Name and skill selection, save, dashboard greeting update verified |
| State persistence | 수정 후 재진입 데이터 유지 | After navigating away and back, profile shows updated data |
| State persistence | 새로고침 후 localStorage 복원 | Page reload restores profile from localStorage; auth_user verified directly |
| Branch flow (data invariant) | 취소 시 변경 없음 | Cancel during edit leaves original name unchanged in profile and dashboard |
| Branch flow (validation) | 이름 빈칸 저장 시 에러 | Empty name save shows validation error, no data change, no toast |

## Key Implementation Notes

### Data-testid Attributes Used

| testid | Location |
|---|---|
| `profile-edit-btn` | Profile page — view mode edit button |
| `profile-view` | Profile page — view mode container |
| `profile-form` | Profile page — edit mode form container |
| `profile-name` | Profile edit form — name input |
| `profile-save` | Profile edit form — save button |
| `profile-cancel` | Profile edit form — cancel button |
| `profile-saved` | Profile page — success toast |
| `profile-display-name` | Profile view — displayed name text |
| `profile-skills-toggle` | MultiSelect component — dropdown toggle button |
| `multiselect-dropdown` | MultiSelect component — dropdown container |
| `multiselect-option-{skill}` | MultiSelect component — individual option label |
| `multiselect-chip-{skill}` | MultiSelect component — selected skill chip |
| `greeting` | Dashboard page — greeting heading |
| `nav-logout` | Navbar — logout button |

### Bug/Quirk Discovered During Exploration

The MultiSelect dropdown does not close on `Escape` key — it uses a `mousedown` handler on the document to close when clicking outside. Pressing `Escape` did not close it, causing the save button to be covered by the dropdown overlay. The fix was to click a field outside the dropdown (the name input) to trigger the mousedown-outside handler before clicking save.

### localStorage Keys

- `auth_user`: JSON-serialized User object (id, email, name, bio, skills, birthDate, avatarFileName)
- `auth_login_at`: timestamp of last login
- `auth_users`: array of all registered users
- `cookie-consent`: cookie consent flag (set in beforeEach via addInitScript to prevent cookie banner overlay)

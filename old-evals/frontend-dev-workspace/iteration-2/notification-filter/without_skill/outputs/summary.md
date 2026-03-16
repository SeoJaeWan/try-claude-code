# Phase 1 Implementation Summary

## Task

Plan `sample-frontend-dashboard-notification-filter`의 Phase 1을 실행하여 `NotificationList` 컴포넌트에 all/unread 필터, empty state, error 우선 노출 계약을 구현했다.

## What Was Done

### 1. `NotificationList.tsx` 수정

- `FilterMode` 타입(`"all" | "unread"`)과 `filter` state를 추가했다.
- 기본 진입 필터는 `all`이다.
- 두 개의 segmented filter 버튼(`notifications-filter-all`, `notifications-filter-unread`)을 리스트 상단에 배치했다.
- `unread` 필터 선택 시 `read === false`인 알림만 표시한다.
- 필터 결과가 0건이면 `notifications-empty` data-testid를 가진 empty state를 노출한다.
- API error 시에는 filter 버튼 없이 `notifications-error`만 노출한다 (error 우선 계약).
- loading 상태에서도 filter 버튼 없이 skeleton만 노출한다.

### 2. `dashboard/page.tsx`

- 변경 없음. `NotificationList` 컴포넌트가 필터 로직을 자체 포함하므로 dashboard 페이지 수정이 불필요하다.

### 3. E2E 테스트 배치

- `plans/.../e2e/dashboard-notification-filter.spec.ts`를 `features/next-app/tests/dashboard-notification-filter.spec.ts`로 복사하여 기존 테스트 관례에 맞게 배치했다.

## Locator Registry

| data-testid | Element | Status |
| --- | --- | --- |
| `notifications-filter-all` | 전체 필터 버튼 | 신규 추가 |
| `notifications-filter-unread` | 읽지 않음 필터 버튼 | 신규 추가 |
| `notifications-empty` | 빈 결과 상태 메시지 | 신규 추가 |
| `notifications-list` | 알림 리스트 컨테이너 | 기존 유지 |
| `notification-{id}` | 개별 알림 항목 | 기존 유지 |
| `notifications-loading` | 로딩 스켈레톤 | 기존 유지 |
| `notifications-error` | 에러 메시지 | 기존 유지 |

## Files Modified

- `features/next-app/components/NotificationList.tsx` -- 필터 state, filter UI, empty state 추가

## Files Created

- `features/next-app/tests/dashboard-notification-filter.spec.ts` -- E2E spec 배치

## Output File Structure

```
skills/frontend-dev-workspace/iteration-2/notification-filter/without_skill/outputs/
  summary.md
  components/
    NotificationList.tsx
  tests/
    dashboard-notification-filter.spec.ts
```

## Verification

- `pnpm --dir features/next-app lint`
- `pnpm --dir features/next-app exec playwright test tests/dashboard-notification-filter.spec.ts`

## Exit Criteria Checklist

- [x] 기본 진입 시 전체 알림이 보인다 (filter default = "all")
- [x] unread filter가 읽지 않은 알림만 남긴다 (read === false 필터링)
- [x] unread 결과가 없으면 empty state가 노출된다 (notifications-empty)
- [x] API error 시 error UI가 filter 결과보다 우선한다 (filter 버튼 미노출)

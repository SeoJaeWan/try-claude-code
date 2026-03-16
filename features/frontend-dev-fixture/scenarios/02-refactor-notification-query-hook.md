# Scenario 02. Notification query 훅 리팩토링

## Prompt

`알림 조회 로직을 프로젝트 컨벤션에 맞게 정리해줘. NotificationList는 query 결과를 소비하는 쪽에 집중하고, 조회 로직은 훅 경계로 정리해줘.`

## Seed Context

- `hooks/apis/queries/useGetNotifications/index.ts`
- `components/NotificationList.tsx`
- `app/dashboard/page.tsx`

## Expected Outcome

- legacy `useEffect + fetch` 훅이 더 명확한 query hook 경계로 정리된다.
- `NotificationList`는 filter UI와 render branch에 집중한다.
- loading / error / empty 흐름이 명확히 유지된다.

## Review Points

- 조회 로직이 component로 역류하지 않는다.
- 훅 이름과 경로가 일관된다.
- `notifications-loading`, `notifications-error`, `notifications-empty` locator 계약이 깨지지 않는다.

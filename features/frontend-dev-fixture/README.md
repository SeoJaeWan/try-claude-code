# frontend-dev-fixture

`frontend-dev` 스킬 전용 독립 fixture다.

이 환경은 페이지에 남아 있는 인라인 상태와 fetch 로직을 custom hook 경계로 밀어내는 작업을 검증한다.
핵심은 `CLI 사용 증빙`이 아니라 최종 결과가 hook 중심 컨벤션을 지키는지다.

## 이 환경에서 보는 것

- page에서 훅 조합만 남기는 구조
- `use*` 훅 이름
- API query/mutation 훅 경로 규칙
- `handle*` 이벤트 핸들러
- loading / error / empty state 경계 분리

## 주요 seed

- `app/login/page.tsx`
  - 인라인 form state와 submit 로직이 남아 있다.
- `app/signup/page.tsx`
  - 로그인과 유사한 인라인 form seed다.
- `app/profile/page.tsx`
  - 프로필 draft 상태와 저장 로직이 page 내부에 있다.
- `components/NotificationList.tsx`
  - query 결과와 filter UI를 소비하는 surface다.
- `hooks/apis/queries/useGetNotifications/index.ts`
  - `useEffect + fetch` 기반 legacy query seed다.
- `hooks/apis/queries/useFetchOrder/index.ts`
  - query-style seed다.

## 시나리오

- `scenarios/01-extract-login-form-hooks.md`
- `scenarios/02-refactor-notification-query-hook.md`
- `scenarios/03-create-order-query-hook.md`
- `scenarios/04-extract-profile-edit-hook.md`
- `scenarios/05-compose-signup-hooks.md`

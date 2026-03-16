# Scenario 01. Login 인라인 로직 훅 추출

## Prompt

`로그인 페이지 인라인 상태와 제출 로직을 프로젝트 컨벤션에 맞게 훅으로 분리해줘. 페이지는 조합만 담당하게 정리해줘.`

## Seed Context

- `app/login/page.tsx`
- `lib/validators.ts`
- `contexts/AuthContext.tsx`

## Expected Outcome

- form 상태/유효성 검증 훅과 submit/API 훅 경계가 분리된다.
- page는 훅 import와 view wiring 중심으로 정리된다.
- `handleSubmit` 같은 내부 핸들러 규칙을 따른다.

## Review Points

- page에 직접적인 `useState`와 비즈니스 로직이 남지 않는다.
- 훅 이름이 `use*`로 시작한다.
- 새 훅이 hook 경로 컨벤션에 맞게 배치된다.

# Scenario 05. Signup form 훅 조합

## Prompt

`회원가입 페이지도 프로젝트 컨벤션에 맞게 훅 조합 구조로 정리해줘. 로그인 페이지와 비슷한 수준의 경계로 맞춰줘.`

## Seed Context

- `app/signup/page.tsx`
- `lib/validators.ts`
- `contexts/AuthContext.tsx`

## Expected Outcome

- signup form 상태 훅은 `hooks/utils/auth`, submit 흐름 훅은 `hooks/apis/auth/mutations` 경계가 드러난다.
- 페이지는 UI shell과 훅 조합 중심으로 단순화된다.
- 중복 validation 로직이 필요한 만큼만 추출된다.

## Review Points

- `useSignupForm`, `usePostSignup` 같은 컨벤션 이름을 쓴다.
- confirm password validation 흐름이 보존된다.
- page에서 직접적인 fetch/business logic이 남지 않는다.

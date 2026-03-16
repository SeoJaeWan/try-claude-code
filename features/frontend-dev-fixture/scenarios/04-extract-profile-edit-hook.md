# Scenario 04. Profile 편집 상태 훅 추출

## Prompt

`프로필 편집 페이지의 draft 상태와 저장 로직을 프로젝트 컨벤션에 맞게 훅으로 분리해줘. 페이지는 field wiring과 section layout만 담당하게 정리해줘.`

## Seed Context

- `app/profile/page.tsx`
- `contexts/AuthContext.tsx`
- `components/DatePicker.tsx`
- `components/MultiSelect.tsx`
- `components/FileUpload.tsx`

## Expected Outcome

- draft 상태, validation, save/cancel 흐름이 `hooks/utils/profile` 아래 별도 훅으로 정리된다.
- page에는 섹션 렌더링과 handler 연결만 남는다.
- 저장 성공/에러 상태가 더 읽기 쉬운 경계로 정리된다.

## Review Points

- page에 다수의 인라인 `useState`가 그대로 남지 않는다.
- 훅이 `hooks/utils/profile/use*` 경로와 profile edit use case를 대표하는 이름을 가진다.
- 기존 testid와 저장 흐름이 유지된다.

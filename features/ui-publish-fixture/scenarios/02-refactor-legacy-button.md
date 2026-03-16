# Scenario 02. Legacy Button 컨벤션 리팩토링

## Prompt

`Button 컴포넌트를 프로젝트 컨벤션에 맞게 정리해줘. 기존 동작은 유지하고 현재 구조상의 컨벤션 위반을 해소해줘.`

## Seed Context

- `components/Button.tsx`
- `app/showcase/page.tsx`

## Expected Outcome

- legacy flat file가 folder 기반 구조로 정리된다.
- 컴포넌트는 화살표 함수 형태로 유지된다.
- 기존 `label`, `tone` 동작은 그대로 보존된다.
- showcase import가 새 구조에 맞게 정리된다.

## Review Points

- 결과 구조가 `button/index.tsx` 또는 동급 folder/index 규칙을 따른다.
- `ButtonProps` 접미사를 유지한다.
- flat seed를 그대로 남겨 중복 정의하지 않는다.

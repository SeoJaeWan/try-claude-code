# Scenario 03. DashboardLayout 리팩토링

## Prompt

`DashboardLayout 컴포넌트를 프로젝트 컨벤션에 맞게 정리해줘. 사이드바, 헤더, 메인 콘텐츠 영역은 유지하고 구조만 더 명확하게 정리해줘.`

## Seed Context

- `components/DashboardLayout.tsx`
- `app/dashboard/page.tsx`

## Expected Outcome

- layout 컴포넌트가 폴더 기반 컴포넌트 컨벤션으로 이동한다.
- `children` 중심 shell 역할은 유지된다.
- visual-only 책임만 남고 business logic은 추가하지 않는다.

## Review Points

- header / sidebar / main 영역이 명확히 드러난다.
- responsive breakpoint class가 유지되거나 개선된다.
- 새 경로에 맞게 사용처 import가 정리된다.

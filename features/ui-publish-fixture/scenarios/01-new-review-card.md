# Scenario 01. ReviewCard 신규 생성

## Prompt

`ReviewCard 컴포넌트를 프로젝트 컨벤션에 맞게 추가해줘. 사용자 아바타, 별점(1~5), 리뷰 본문, 작성일이 필요해.`

## Seed Context

- `app/showcase/page.tsx`
- `app/globals.css`
- `components/EmptyState.tsx`

## Expected Outcome

- 신규 컴포넌트가 folder 기반 구조로 추가된다.
- 컴포넌트 이름은 `ReviewCard`이고 props 타입은 `ReviewCardProps`다.
- visual-only 구현으로 끝나야 한다.
- 아바타, 별점, 본문, 작성일 영역이 모두 존재한다.

## Review Points

- flat `ReviewCard.tsx`를 만들지 않는다.
- `useEffect`, `fetch`, `useQuery`, `useMutation` 같은 로직이 들어가지 않는다.
- Tailwind class를 사용해 일관된 card shell을 만든다.

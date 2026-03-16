# Scenario 03. Order query hook 신규 생성

## Prompt

`주문 상세를 조회하는 프론트 훅을 프로젝트 컨벤션에 맞게 추가해줘. query 훅 형태로 만들고, 호출부에서 loading/error를 다룰 수 있게 해줘.`

## Seed Context

- `hooks/apis/order/queries/useGetOrderDetail/index.ts`
- `lib/types.ts`
- `app/page.tsx`

## Expected Outcome

- order query 훅이 `hooks/apis/order/queries/useGetOrderDetail` 규칙에 맞는 이름과 반환 shape를 가진다.
- loading / error / refetch 같은 소비 포인트가 드러난다.
- 필요하면 호출 surface를 새로 만들되 page는 조합 역할을 유지한다.

## Review Points

- query 훅 경로와 이름이 `hooks/apis/{domain}/queries/useGet*` 규칙을 따른다.
- 훅 반환값 이름이 일관된다.
- view와 data fetching 책임이 섞이지 않는다.

# useFetchOrder API Hook - Summary

## What was done

프로젝트의 기존 구조(Next.js 16, React 19, TypeScript, `@/*` path alias)를 분석한 후, 주문 데이터를 query 방식으로 가져오는 `useFetchOrder` 커스텀 훅을 구현했습니다.

프로젝트에 TanStack Query 등 외부 데이터 패칭 라이브러리가 설치되어 있지 않으므로, React의 `useState`/`useEffect`/`useCallback`/`useRef`만을 사용하여 query 패턴(자동 fetch, loading/error 상태, refetch, abort)을 직접 구현했습니다.

## Created files

| File | Description |
|------|-------------|
| `types.ts` | Order, OrderItem, OrderStatus 등 주문 관련 타입 정의 및 훅의 파라미터/반환 타입 |
| `useFetchOrder.ts` | query 방식의 주문 조회 커스텀 훅 본체 |
| `useFetchOrder.test.ts` | Jest + React Testing Library 기반 단위 테스트 (5개 케이스) |
| `summary.md` | 이 문서 |

## Final file paths

- `skills/frontend-dev-workspace/iteration-2/api-hook-order/without_skill/outputs/types.ts`
- `skills/frontend-dev-workspace/iteration-2/api-hook-order/without_skill/outputs/useFetchOrder.ts`
- `skills/frontend-dev-workspace/iteration-2/api-hook-order/without_skill/outputs/useFetchOrder.test.ts`
- `skills/frontend-dev-workspace/iteration-2/api-hook-order/without_skill/outputs/summary.md`

## Hook features

- **자동 fetch**: `orderId`가 변경되면 자동으로 API를 호출합니다.
- **enabled 옵션**: `enabled: false`로 설정하면 요청을 지연시킬 수 있습니다.
- **refetch**: `refetch()` 함수를 통해 수동으로 데이터를 다시 가져올 수 있습니다.
- **AbortController**: 컴포넌트 언마운트 또는 orderId 변경 시 이전 요청을 자동 취소합니다.
- **상태 관리**: `data`, `isLoading`, `isError`, `error` 상태를 제공합니다.
- **API 엔드포인트**: `GET /api/orders/{orderId}`를 호출합니다.

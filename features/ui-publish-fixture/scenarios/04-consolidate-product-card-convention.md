# Scenario 04. ProductCard 컨벤션 통합

## Prompt

`ProductCard 관련 구조가 섞여 있는데 프로젝트 컨벤션에 맞게 하나로 정리해줘. 시각 동작은 유지하고 중복 구현은 제거해줘.`

## Seed Context

- `components/ProductCard.tsx`
- `components/ProductCard/index.tsx`

## Expected Outcome

- 중복된 `ProductCard` 구현이 하나의 컨벤션으로 수렴한다.
- flat/file와 folder/index가 동시에 남지 않는다.
- props와 시각 shell은 하나의 source of truth로 정리된다.

## Review Points

- import path가 일관된다.
- 이름은 `ProductCard`, props는 `ProductCardProps`로 유지된다.
- hover, image, price shell 등 visual affordance가 사라지지 않는다.

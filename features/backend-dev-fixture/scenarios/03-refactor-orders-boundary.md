# Scenario 03. Orders API boundary 정리

## Prompt

`orders 기능을 프로젝트 컨벤션에 맞게 다시 정리해줘. controller는 더 얇게 하고 request/response DTO와 entity 경계가 명확하게 보이도록 정리해줘.`

## Seed Context

- `src/main/java/com/example/app/orders/controller/OrdersController.java`
- `src/main/java/com/example/app/orders/service/OrdersService.java`
- `src/main/java/com/example/app/orders/repository/OrdersRepository.java`
- `src/main/java/com/example/app/orders/dto/*`
- `src/main/java/com/example/app/orders/entity/OrderEntity.java`

## Expected Outcome

- controller는 entity를 직접 노출하지 않는 방향으로 정리된다.
- request DTO, response DTO, entity가 각자 역할을 가진다.
- service는 mapping과 domain rule을 소유하고 controller는 HTTP wiring에 집중한다.

## Review Points

- entity를 API response로 그대로 반환하지 않는다.
- `@Valid`와 DTO 경계가 자연스럽게 드러난다.
- 기존 `/orders` endpoint surface는 유지된다.

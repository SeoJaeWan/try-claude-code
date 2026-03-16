# backend-dev-fixture

`backend-dev` 스킬 전용 Spring Boot fixture다.

목표는 `tcb`가 전제하는 Spring 기준 결과 컨벤션을 검증하는 것이다.
중요한 것은 "CLI를 썼는가"보다 최종 코드가 아래 규칙을 만족하는가다.

## 이 환경에서 보는 것

- `src/main/java/{basePackage}` 구조
- package-by-feature 배치
- `controller`, `service`, `repository`, `dto`, `entity` 경계
- root package 아래 application class 유지
- `@Valid`, `@ControllerAdvice` 같은 Spring 기본선

## basePackage

- `com.example.app`

## 주요 seed

- `src/main/java/com/example/app/orders/*`
  - package-by-feature 형태의 order seed
- `src/main/java/com/example/app/auth/*`
  - package-by-feature reference seed
- `src/main/java/com/example/app/controller/ProfileSummaryController.java`
- `src/main/java/com/example/app/service/ProfileSummaryService.java`
- `src/main/java/com/example/app/dto/ProfileSummaryResponse.java`
  - feature package로 정리되지 않은 legacy seed

## 시나리오

- `scenarios/01-create-payments-module.md`
- `scenarios/02-refactor-profile-summary-module.md`
- `scenarios/03-refactor-orders-boundary.md`
- `scenarios/04-create-audit-log-feature.md`

# Scenario 01. Payments feature 신규 생성

## Prompt

`결제 기능을 프로젝트 컨벤션에 맞게 추가해줘. Spring feature 구조가 보이도록 controller, service, repository, dto, entity 경계를 분명히 나눠줘.`

## Seed Context

- `pom.xml`
- `src/main/java/com/example/app/BackendDevFixtureApplication.java`
- 기존 `src/main/java/com/example/app/orders/*`

## Expected Outcome

- `payments` feature가 `src/main/java/com/example/app/payments/*` 아래에 생성된다.
- feature 안에 `controller`, `service`, `repository`, `dto`, `entity` 패키지가 드러난다.
- 요청/응답 DTO와 엔티티가 섞이지 않는다.

## Review Points

- 패키지 segment는 lower-case를 사용한다.
- 클래스 이름은 PascalCase를 사용한다.
- application class를 옮기지 않는다.

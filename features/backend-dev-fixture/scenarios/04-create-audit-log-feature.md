# Scenario 04. Audit log feature 신규 생성

## Prompt

`관리자용 audit log 조회 기능을 프로젝트 컨벤션에 맞게 추가해줘. Spring feature 구조를 유지하고 조회 API 중심으로 설계해줘.`

## Seed Context

- 기존 `src/main/java/com/example/app/auth/*`
- 기존 `src/main/java/com/example/app/orders/*`
- `src/main/java/com/example/app/global/exception/GlobalExceptionHandler.java`

## Expected Outcome

- `audit` 또는 동급 lower-case feature package가 추가된다.
- controller, service, repository, dto 경계가 분리된다.
- 나중에 role/guard를 붙일 수 있게 feature boundary가 열려 있다.

## Review Points

- audit log를 auth feature 안에 억지로 섞지 않는다.
- 패키지 구조가 `src/main/java/com/example/app/{feature}` 기준을 따른다.
- 응답 shape는 response DTO로 표현한다.

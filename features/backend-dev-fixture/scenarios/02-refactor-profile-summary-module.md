# Scenario 02. Root-level profile summary를 feature package로 리팩토링

## Prompt

`루트 패키지에 흩어져 있는 profile summary 관련 코드를 프로젝트 컨벤션에 맞게 별도 feature로 정리해줘. API 응답 계약은 유지해줘.`

## Seed Context

- `src/main/java/com/example/app/controller/ProfileSummaryController.java`
- `src/main/java/com/example/app/service/ProfileSummaryService.java`
- `src/main/java/com/example/app/dto/ProfileSummaryResponse.java`
- `src/test/java/com/example/app/service/ProfileSummaryServiceTest.java`

## Expected Outcome

- profile summary 코드가 root-level package에서 빠져나와 dedicated feature 아래로 이동한다.
- controller는 transport 역할만 하고 service가 summary 계산을 담당한다.
- response DTO shape와 테스트 의도는 유지된다.

## Review Points

- `com.example.app.controller` / `service` / `dto`에 feature-specific code가 계속 남지 않는다.
- feature path는 lower-case package를 사용한다.
- 테스트 경로도 새 feature 경계에 맞게 정리한다.

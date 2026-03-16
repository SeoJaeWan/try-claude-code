# Feature Fixtures

`features/`는 스킬별로 분리된 독립 fixture만 담는다.

- `ui-publish-fixture`
  - 시각 컴포넌트와 레이아웃 중심 환경
  - 신규 컴포넌트 생성, flat 파일 리팩토링, visual shell 분해 시나리오 포함
- `frontend-dev-fixture`
  - 훅 추출, 상태 분리, API query/mutation 조합 중심 환경
  - 페이지 인라인 로직을 훅 경계로 정리하는 시나리오 포함
- `backend-dev-fixture`
  - Spring Boot 기반 feature/module 구조 중심 환경
  - `src/main/java`, `basePackage`, package-by-feature 기준 시나리오 포함

평가 기준은 `CLI 사용 여부`가 아니라 `결과 컨벤션과 동작`이다.

- 경로/파일 구조
- 이름 규칙
- export 패턴
- thin controller / hook extraction 같은 경계 규칙
- 불필요한 legacy 파일 정리

각 fixture는 자체 `README.md`와 `scenarios/*.md`를 가진다.

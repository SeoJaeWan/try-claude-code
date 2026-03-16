# eslint-merge-existing with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 파일 미생성
- 계획 기반 평가

## 스킬 실행 흐름
1. SKILL.md 읽기 → init-coding-rules 스킬 로드
2. coding-rules 문서 9개 전체 읽기
3. package.json 분석 → 프레임워크 감지
4. 기존 설정 파일 감사 → .eslintrc.json 기존 파일 발견, 규칙 비교 분석

## 4-Group 승인 계획 제시 (병합 전략 포함)
| 그룹 | 설정 파일 | 병합 전략 |
|------|----------|----------|
| 1. ESLint | `.eslintrc.json` 업데이트 | 기존 규칙 유지 + coding-rules 규칙 추가/오버라이드 |
| 2. commitlint | `commitlint.config.js` 신규 생성 | coding-rules 기반 신규 생성 |
| 3. husky + lint-staged | `.husky/pre-commit`, `lint-staged.config.js` | coding-rules 기반 신규 생성 |
| 4. TSConfig | `tsconfig.json` 업데이트 | 기존 설정 유지 + strict 옵션 병합 |

## 기존 설정 vs coding-rules 비교
```
기존 규칙 (유지):
  - @typescript-eslint/no-explicit-any: error
  - react/jsx-no-target-blank: warn

coding-rules 추가:
  - import/order (그룹별 정렬)
  - naming-convention (camelCase, PascalCase)
  - no-console: warn

충돌 해결:
  - semi: 기존 'always' → coding-rules 'never' → coding-rules 우선 적용
```

## 주요 특징
- 기존 .eslintrc.json 파일을 읽고 coding-rules와 규칙별 비교 수행
- 충돌하는 규칙에 대해 coding-rules 우선 정책 명시
- 기존 커스텀 규칙은 보존하면서 coding-rules 규칙 병합
- 4-group 승인 계획에 병합 전략 컬럼 추가
- 패키지 자동 설치 없이 설치 명령만 안내 (no-auto-install)

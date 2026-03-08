# init-coding-rules 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/init-coding-rules/SKILL.md

## 9개 coding-rules 문서 읽기
- code-style, naming, typescript, git, package-manager, comments, testing, folder-structure, completion

## 프레임워크 감지
- package.json 기반 (Next.js/NestJS/Vite React/React Native/Base TypeScript)
- 현재: package.json 없음 -> Base TypeScript

## 4개 그룹별 승인 워크플로우
1. ESLint 규칙 (14개 규칙 매핑)
2. TSConfig strict 옵션
3. commitlint 설정
4. husky + lint-staged

## Config 파일 생성
- .eslintrc.json, tsconfig.json, commitlint.config.mjs, .husky/pre-commit
- pnpm add -D 명령 제공 (자동 실행 안 함)

# backend-dev 평가 (Korean prompt, without_skill)

## 접근 방식
- 일반적인 NestJS 구조로 auth 모듈 생성
- auth.module.ts, auth.controller.ts, auth.service.ts, DTOs, guards, strategies
- POST /auth/register, POST /auth/login, GET /auth/profile
- JWT + Passport 전략
- DB snake_case 네이밍 (password_hash, created_at, updated_at)

## 한계
- 저장소에 NestJS 프로젝트가 없어서 실제 수정 불가
- generate.mjs, coding-rules 참조 없음

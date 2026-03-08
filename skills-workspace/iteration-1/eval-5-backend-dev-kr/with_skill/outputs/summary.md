# backend-dev 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/backend-dev/SKILL.md

## NestJS 모듈 구조 (generate.mjs 활용)
- `node references/coding-rules/scripts/generate.mjs structure auth --type module --framework nestjs --create`
- src/auth/auth.controller.ts, auth.service.ts, auth.module.ts, dto/

## coding-rules/folder-structure.md 준수
- NestJS 컨벤션: src/{path}/{path}.module.ts, controller.ts, service.ts, dto/
- 폴더 네이밍: camelCase

## DB snake_case 네이밍
- 테이블: users, refresh_tokens (snake_case 복수)
- 컬럼: password_hash, user_id, created_at, expires_at
- 인덱스: idx_users_email
- FK: user_id REFERENCES users(id)

## generate.mjs 사용
- structure 서브커맨드 + --framework nestjs --type module
- package.json에서 @nestjs/core 감지

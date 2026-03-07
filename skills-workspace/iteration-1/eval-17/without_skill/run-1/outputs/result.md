# NestJS 인증 API 구현 시뮬레이션 (without_skill)

## 아키텍처
NestJS 모듈 기반 인증 시스템

## 생성할 파일
1. `src/auth/auth.module.ts` — 인증 모듈
2. `src/auth/auth.controller.ts` — 인증 컨트롤러
3. `src/auth/auth.service.ts` — 인증 서비스
4. `src/auth/dto/login.dto.ts` — 로그인 DTO
5. `src/auth/dto/register.dto.ts` — 회원가입 DTO
6. `src/auth/guards/jwt-auth.guard.ts` — JWT 가드
7. `src/auth/strategies/jwt.strategy.ts` — JWT 전략
8. `src/auth/strategies/local.strategy.ts` — 로컬 전략

## API 엔드포인트
- `POST /auth/register` — 회원가입
- `POST /auth/login` — 로그인
- `POST /auth/refresh` — 토큰 갱신
- `POST /auth/logout` — 로그아웃
- `GET /auth/me` — 현재 사용자 조회

## 기술 스택
- NestJS + TypeScript
- Passport.js + JWT
- bcrypt (비밀번호 해싱)
- class-validator (DTO 검증)

## 워크플로우
1. NestJS CLI로 모듈 생성
2. Passport + JWT 설정
3. User 엔티티 및 서비스 구현
4. Guard 및 Strategy 구현
5. 컨트롤러 엔드포인트 구현
6. 테스트 작성 및 실행

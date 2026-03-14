# Backend Folder Structure Rules

---

## Module-Based Architecture

백엔드 프로젝트는 도메인(기능) 단위로 모듈을 구성한다. 하나의 모듈 디렉토리 안에 해당 도메인의 controller, service, repository, DTO, entity를 모두 배치한다.

```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   ├── entities/
│   │   └── user.entity.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── strategies/
│       └── jwt.strategy.ts
├── orders/
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.module.ts
│   ├── dto/
│   │   ├── create-order.dto.ts
│   │   └── update-order.dto.ts
│   └── entities/
│       └── order.entity.ts
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── main.ts
```

---

## Module Placement Criteria

| Condition | Location |
|---|---|
| 독립된 도메인 기능 | `src/{domain}/` (모듈 디렉토리) |
| 공통 유틸리티/헬퍼 | `src/common/` |
| 설정/환경 관련 | `src/config/` |
| DB 마이그레이션 | `src/migrations/` 또는 프레임워크 관례 |

---

## File Naming Convention

프레임워크 관례를 따른다:

| File Type | Pattern | Example |
|---|---|---|
| Controller | `{domain}.controller.ts` | `orders.controller.ts` |
| Service | `{domain}.service.ts` | `orders.service.ts` |
| Module | `{domain}.module.ts` | `orders.module.ts` |
| Entity | `{name}.entity.ts` | `order.entity.ts` |
| DTO | `{action}-{domain}.dto.ts` | `create-order.dto.ts` |
| Guard | `{name}.guard.ts` | `jwt-auth.guard.ts` |
| Strategy | `{name}.strategy.ts` | `jwt.strategy.ts` |
| Interface | `{name}.interface.ts` | `order.interface.ts` |
| Test | `{domain}.{type}.spec.ts` | `orders.service.spec.ts` |

---

## Test File Placement

테스트 파일은 대상 파일과 같은 디렉토리에 co-locate한다:

```
src/orders/
├── orders.service.ts
├── orders.service.spec.ts      ← 같은 디렉토리
├── orders.controller.ts
└── orders.controller.spec.ts   ← 같은 디렉토리
```

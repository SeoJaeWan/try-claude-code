# Backend Folder Structure Rules

---

## Module-Based Architecture

Backend projects are organized by domain (feature) modules. Each module directory contains the domain's controller, service, repository, DTO, and entity files.

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
| Independent domain feature | `src/{domain}/` (module directory) |
| Shared utilities/helpers | `src/common/` |
| Configuration/environment | `src/config/` |
| DB migrations | `src/migrations/` or framework convention |

---

## File Naming Convention

Follow framework conventions:

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

Test files are co-located with the target file in the same directory:

```
src/orders/
├── orders.service.ts
├── orders.service.spec.ts      ← same directory
├── orders.controller.ts
└── orders.controller.spec.ts   ← same directory
```

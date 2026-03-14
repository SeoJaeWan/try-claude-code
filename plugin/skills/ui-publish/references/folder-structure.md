# UI Component Folder Structure Rules

---

## Components Folder Structure

```
components/
├── common/              # 공통 (2+ 페이지에서 사용)
│   ├── header/index.tsx
│   └── button/index.tsx
├── {domain}/            # 도메인별
│   └── problemCard/index.tsx
└── providers/index.tsx  # Context Providers
```

### Component Placement Criteria

| Condition | Location |
| ------------------------ | -------------------------- |
| Used in 2 or more pages | `components/common/` |
| Used in a specific domain only | `components/{domain}/` |
| Exclusive to a page | `app/{domain}/components/` |

---

## Sub-component Extraction Rules

Sub-components nested inside a parent component folder
must be **moved to the shared location immediately the moment they are used anywhere else**.

| Target | Initial Location | Location After Reuse |
| ---- | --------- | ------------------- |
| Sub-component exclusive to parent | `components/{domain}/{parent}/{child}/index.tsx` | `components/common/{child}/index.tsx` |

---

## Component File Convention

컴포넌트는 디렉토리 패턴으로 생성한다: `{ComponentName}/index.tsx`

```
components/
├── ProductCard/
│   └── index.tsx        ← export default
├── EmptyState/
│   └── index.tsx
└── StatsCard/
    └── index.tsx
```

---

## UI Component Principle

UI 컴포넌트는 **레이아웃만** 담당한다. 로직(useState, useEffect, fetch)은 포함하지 않고, props로만 데이터를 받는다.

| 허용 | 금지 |
|---|---|
| Props destructuring | `useState` |
| Tailwind CSS classes | `useEffect` |
| Conditional rendering (props 기반) | `fetch` / API 호출 |
| Event handler props (`onClick`) | 직접 상태 관리 |

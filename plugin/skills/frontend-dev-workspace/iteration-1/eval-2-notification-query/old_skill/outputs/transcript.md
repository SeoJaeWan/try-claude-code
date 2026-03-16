# Transcript: Notification Query Refactoring (old-frontend-dev skill)

## Task

알림 조회 로직을 프로젝트 컨벤션에 맞게 정리. NotificationList는 query 결과를 소비하는 쪽에 집중하고, 조회 로직은 훅 경계로 정리.

## Steps Taken

### 1. Read SKILL.md (old-frontend-dev)

Read `plugin/skills/old-frontend-dev/SKILL.md`. Key instructions:
- Read coding-rules.md before writing code
- Always attempt boilerplate generation first via generate.mjs
- Extract inline logic from components into custom hooks
- Follow `{hooksRoot}` conventions from coding-rules.md

### 2. Read All Input Files

- **package.json**: Next.js 16.1.6, React 19.2.3 project. No TanStack Query dependency.
- **hooks/apis/queries/useGetNotifications/index.ts**: Manual fetch with useState/useEffect. Has `"use client"` directive. Uses inline `fetch("/api/notifications")` without endpoint constants.
- **components/NotificationList.tsx**: Consumes useGetNotifications hook. Contains filter UI state (all/unread). Already well-structured for UI consumption.
- **app/dashboard/page.tsx**: Dashboard page that renders NotificationList. No notification logic here - clean.

### 3. Read Coding Rules

Read `plugin/skills/old-frontend-dev/references/coding-rules.md`. Key rules:
- API hook naming: `use` + verb + resource (useGetNotifications is correct)
- Array variables: use plural nouns (notifications is correct)
- API endpoint constants: `VERB_RESOURCE` pattern required
- Hooks root resolution: `hooks/` exists in the fixture
- Each hook uses directory pattern: `{hookName}/index.ts`

### 4. Attempted Boilerplate Generation

Ran `node generate.mjs api-hook useGetNotifications --method query --endpoint "/api/notifications"`. Script failed due to missing module (`test_suite.mjs`). Per SKILL.md instructions, skipped boilerplate and implemented manually.

### 5. Analysis and Implementation Plan

**Current issues identified:**
1. `useGetNotifications` lacks `API_ENDPOINTS` constant (coding-rules violation)
2. Hook uses `.then()` chain instead of async/await (less readable)
3. No `refetch` capability exposed
4. `Notification` interface is not exported (limits reusability)
5. Error handling doesn't handle non-Error thrown values

**NotificationList assessment:**
- Already properly focused on UI/consumption
- Filter state (all/unread) is UI interaction state, correctly kept in component per skill rules
- No extraction needed

**Dashboard page assessment:**
- Clean - just renders NotificationList, no notification logic leaking

### 6. Implementation

#### useGetNotifications/index.ts changes:
- Added `API_ENDPOINTS` constant following `VERB_RESOURCE` pattern from coding-rules
- Exported `Notification` interface for reusability
- Refactored fetch from `.then()` chain to async/await with proper try/catch/finally
- Wrapped fetch function in `useCallback` for stable reference
- Added `refetch` function to return value
- Improved error handling to check `instanceof Error` before accessing `.message`

#### NotificationList.tsx:
- No changes needed. Component is already properly focused on consuming query results. Filter state is UI interaction state and correctly lives in the component.

#### app/dashboard/page.tsx:
- No changes needed. Clean consumption of NotificationList component.

### 7. Files Output

All files saved to outputs directory:
- `hooks/apis/queries/useGetNotifications/index.ts` (modified)
- `components/NotificationList.tsx` (unchanged - already follows conventions)
- `app/dashboard/page.tsx` (unchanged - already follows conventions)

## Summary of Changes

| File | Change Type | Description |
|------|-------------|-------------|
| useGetNotifications/index.ts | Modified | Added API_ENDPOINTS constant, async/await refactor, exported Notification type, added refetch, improved error handling |
| NotificationList.tsx | Unchanged | Already properly consumes hook results with UI-only state |
| app/dashboard/page.tsx | Unchanged | No notification logic to extract |

# Transcript: Button Component Refactor (eval-2)

## Task
Button 컴포넌트를 프로젝트 컨벤션에 맞게 정리. 기존 `label`/`tone` 동작 유지, 구조상의 컨벤션 위반 해소.

## Analysis

### Files Inspected
- `components/Button.tsx` - flat file (convention violation: should be folder-based)
- `components/Button/index.tsx` - correct folder location, content had convention gaps
- `components/ProductCard/index.tsx` - reference: uses `testId`/`data-testid`
- `components/common/reviewCard/index.tsx` - reference: uses `data-testid`
- `components/dashboard/dashboardLayout/index.tsx` - reference: folder-based structure
- Git HEAD `Button.tsx` - original had `testId`, `disabled`, proper styling states

### Convention Violations Found

1. **Flat file `Button.tsx` alongside `Button/` folder**
   - Project uses folder-based structure (`ComponentName/index.tsx`)
   - `Button.tsx` flat file existed at HEAD alongside `Button/index.tsx` directory
   - The flat file was already deleted from disk (untracked deletion state)
   - Fix: retain deletion of flat file, `Button/index.tsx` is canonical

2. **Missing `testId` prop and `data-testid` attribute**
   - Structural convention: other components (`ProductCard`, `ReviewCard`, `CookieBanner`, `DashboardLayout`) all expose `testId` prop with `data-testid` attribute for E2E test locators
   - `Button/index.tsx` was missing this

3. **Missing `disabled` prop with visual state styling**
   - The HEAD `Button.tsx` had `disabled` + `disabled:cursor-not-allowed disabled:opacity-50`
   - Visual convention: interactive components should show disabled state
   - `Button/index.tsx` was missing this

### Props Preserved (as required)
- `label: string` - unchanged
- `tone?: "primary" | "secondary"` - unchanged
- Default `tone = "primary"` - unchanged
- All className values for both tones - unchanged

## Changes Made

### `components/Button/index.tsx`
- Added `disabled?: boolean` prop (default `false`)
- Added `testId?: string` prop
- Added `disabled={disabled}` to button element
- Added `data-testid={testId}` to button element
- Added `disabled:cursor-not-allowed disabled:opacity-50` to both tone className variants

## Verification
- `pnpm exec eslint components/Button/index.tsx` - no errors
- `pnpm exec tsc --noEmit` - pre-existing errors only (unrelated test/playwright files), no errors in Button

## Output Files
- `components/Button/index.tsx` - refactored component

# Button Refactor Summary

## Convention Violations Found

### 1. Folder naming: PascalCase instead of camelCase
- **Before:** `components/Button/index.tsx`
- **After:** `components/common/button/index.tsx`
- **Rule violated:** The project enforces `camelCase` for folder segments (enforced rule: `folderCase: camelCase`). The old folder `Button` used PascalCase.

### 2. Path placement: root-level instead of common/
- **Before:** `components/Button/` (root-level, no domain or common segment)
- **After:** `components/common/button/`
- **Rule violated:** The path policy requires `components/common/{component}` or `components/{domain}/{component}`. A flat `components/Button/` path does not match either pattern. Since Button is a shared UI element not tied to any single page domain, `components/common/button` is the correct placement.

## Actions Taken

1. Ran `tcp help --text` to confirm active conventions (publisher/personal/v1).
2. Ran `tcp component --apply` to scaffold `components/common/button/index.tsx` at the correct path.
3. Implemented the full Button component in the new file, preserving all props and behavior from the original (`variant`, `disabled`, `onClick`, `testId`, class names).
4. Updated `app/showcase/page.tsx` import from `@/components/Button` to `@/components/common/button`.
5. Removed the old `components/Button/` directory.
6. Ran `tcp validate-file components/common/button/index.tsx` — result: 0 violations, passed.

## Files Modified

- `components/common/button/index.tsx` (created at correct convention path)
- `app/showcase/page.tsx` (import path updated)
- `components/Button/` (deleted — convention violation)

# Transcript: eval-4-profile-edit-hook (with_skill)

## Task

Refactor the profile edit page so that draft state and save logic are extracted into a custom hook following project conventions. The page should only handle field wiring and section layout.

## Files Read

- `plugin/skills/old-frontend-dev/references/coding-rules.md` — conventions for hook naming, file paths, arrow function style, handler prefixes
- `features/frontend-dev-fixture/package.json` — stack: Next.js 16, React 19, no TanStack Query
- `features/frontend-dev-fixture/app/profile/page.tsx` — original page with all inline state and logic
- `features/frontend-dev-fixture/contexts/AuthContext.tsx` — `useAuth` provides `user`, `isAuthenticated`, `mounted`, `updateProfile`
- `features/frontend-dev-fixture/components/DatePicker.tsx` — controlled date input
- `features/frontend-dev-fixture/components/MultiSelect.tsx` — controlled multi-select with chips
- `features/frontend-dev-fixture/components/FileUpload.tsx` — file picker with validation

## Analysis

The original `ProfilePage` contained:
- 7 `useState` calls (editing, name, bio, skills, birthDate, avatarFileName, errors, saved)
- Auth redirect logic (`useEffect`)
- User sync logic (`useEffect` to populate fields from `user`)
- Validation logic inside `handleSave`
- Cancel reset logic inlined in the cancel button's `onClick`

All of this is business logic that belongs in a hook per the coding rules: "If a page or component contains inline fetch, business-data useState, or orchestration logic, extract that logic into hooks."

## Decisions

### Single hook vs. two hooks

I considered splitting into `useProfileDraft` (draft state + field handlers) and `useProfileEdit` (editing mode + save/cancel orchestration). However:
- The draft state only makes sense in the context of the edit flow
- `handleCancel` needs to reset draft to the current `user` values, so it must have access to both the editing flag and the draft setters
- Splitting would require either prop-drilling between hooks or duplicating the `user` reference

A single `useProfileEdit` hook encapsulates all related concerns cleanly and keeps the return surface predictable.

### Draft shape

Grouped the five draft fields into a single `ProfileDraft` object to avoid returning seven separate setter functions. Instead, five typed `handle*Change` handlers are exposed — one per field — matching the `handle*` prefix convention for internal handlers.

### Handler naming

- `handleEditStart` — starts editing mode (called from view section's "프로필 수정" button)
- `handleCancel` — resets draft to `user` values and exits edit mode
- `handleSave` — validates, calls `updateProfile`, shows saved banner
- `handleNameChange`, `handleBioChange`, `handleSkillsChange`, `handleBirthDateChange`, `handleAvatarFileNameChange` — field-level change handlers

All follow the `handle*` prefix convention from the coding rules.

### data-testid preservation

All original `data-testid` attributes were preserved verbatim:
- `profile-saved`, `profile-view`, `profile-display-name`
- `profile-edit-btn`, `profile-form`
- `profile-name`, `profile-bio`
- `profile-birthdate` (via `testId` prop on DatePicker)
- `profile-skills` (via `testId` prop on MultiSelect)
- `profile-save`, `profile-cancel`

## Validation Checklist

- [x] Hook lives under `hooks/utils/profile/useProfileEdit/index.ts` — matches `hooks/utils/{domain}/{hookName}/index.ts`
- [x] Domain `profile` matches the page route `app/profile/page.tsx`
- [x] All path segments use camelCase (`profile`, `useProfileEdit`)
- [x] Entry file is `index.ts`
- [x] Main export name matches the hook name (`useProfileEdit`)
- [x] Hook uses arrow function style — `const useProfileEdit = (): UseProfileEditReturn => {`
- [x] Hook entry file does not define additional hooks
- [x] Hook entry file does not define React components
- [x] Internal handlers use `handle*` prefix
- [x] Array names are plural nouns (`skills`, `errors`)
- [x] No `List` or `Array` suffixes used

## Output Files

- `hooks/utils/profile/useProfileEdit/index.ts` — the extracted hook
- `app/profile/page.tsx` — refactored page (field wiring + layout only)

# Transcript: Profile Edit Hook Extraction

## Task
Extract draft state and save logic from the profile edit page into a custom hook following project conventions. The page should only handle field wiring and section layout.

## Steps

### 1. Read SKILL.md
Read `plugin/skills/frontend-dev/SKILL.md` to understand the CLI-first workflow. Key rules:
- All hook files must be created via `tcf` CLI
- After `tcf` creates the scaffold, implement business logic inside generated files
- Do NOT create component files manually; only create hooks

### 2. Read all input files
- **package.json**: Next.js 16 + React 19 project with Tailwind CSS
- **app/profile/page.tsx**: Profile page with inline state management (7 `useState` calls), validation logic, and save handler all mixed with JSX layout
- **contexts/AuthContext.tsx**: Provides `user`, `isAuthenticated`, `mounted`, `updateProfile` via context
- **components/DatePicker.tsx**: Controlled date input component
- **components/MultiSelect.tsx**: Controlled multi-select with dropdown/chips
- **components/FileUpload.tsx**: File upload with validation

### 3. Run `tcf` CLI to create hook scaffold
Ran `tcf --help` to confirm CLI is available, then:
```bash
tcf hook --json '{"name":"useProfileDraft","path":"hooks/profile"}' --apply
```
Generated scaffold at `hooks/profile/useProfileDraft/index.ts` with arrow function + `export default` pattern.

### 4. Implement hook logic
Filled in the generated `useProfileDraft` hook with:
- **ProfileDraft interface**: Groups all draft fields (name, bio, skills, birthDate, avatarFileName)
- **UseProfileDraftReturn interface**: Typed return value for the hook
- **buildDraftFromUser()**: Pure helper to initialize draft from User object
- **validateDraft()**: Pure validation function extracted from inline logic
- **Hook body**: All `useState` calls for editing/draft/errors/saved, `useEffect` for user sync, `useCallback`-wrapped setters and actions (startEditing, cancelEditing, handleSave)

### 5. Refactor page component
Updated `app/profile/page.tsx`:
- Removed all 7 `useState` imports and inline state declarations
- Removed `useEffect` for user data sync (moved to hook)
- Removed inline `handleSave` with validation logic
- Removed inline cancel handler with manual state reset
- Added single `useProfileDraft(user, updateProfile)` call
- All form fields now read from `draft.*` instead of individual state variables
- Button handlers now use `startEditing`, `cancelEditing`, `handleSave` from hook
- Page retains only: auth guard effect, section layout, field wiring to UI components

### 6. Copy outputs
Copied both files to the outputs directory:
- `hooks/profile/useProfileDraft/index.ts` (new hook)
- `app/profile/page.tsx` (refactored page)

## Output Files
| File | Description |
|------|-------------|
| `hooks/profile/useProfileDraft/index.ts` | Custom hook managing draft state, validation, editing mode, and save logic |
| `app/profile/page.tsx` | Refactored page with only field wiring and section layout |

## What Changed
- **Before**: Page had 7 useState calls, 2 useEffects for data sync, inline validation, inline save handler, inline cancel with manual state reset (167 lines)
- **After**: Page has 0 useState calls, 1 useEffect (auth guard only), all state/logic delegated to `useProfileDraft` hook (144 lines page + 128 lines hook)
- **Convention compliance**: Hook created via `tcf` CLI, placed at `hooks/profile/useProfileDraft/index.ts`, uses arrow function + `export default` pattern, `use` prefix naming

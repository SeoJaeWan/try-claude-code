# Eval 4: Profile Edit Hook Extraction

## Task
프로필 편집 페이지의 draft 상태와 저장 로직을 프로젝트 컨벤션에 맞게 훅으로 분리. 페이지는 field wiring과 section layout만 담당하도록 정리.

## Steps Performed

### 1. Read skill file and coding rules
- Read `SKILL.md` for workflow instructions and core principle (publisher creates components, frontend fills logic via hooks)
- Read `coding-rules.md` for conventions: arrow functions, `handle*` prefix for handlers, `use*` prefix for hooks, `hooks/utils/{domain}/{hookName}/index.ts` directory pattern

### 2. Analyzed existing page
`app/profile/page.tsx` contained:
- 7 `useState` calls for draft fields (name, bio, skills, birthDate, avatarFileName, errors, saved)
- 1 `useState` for editing toggle
- 2 `useEffect` calls (auth redirect + user data sync)
- Inline `handleSave` with validation logic
- Inline cancel handler resetting all draft fields

All of this is business/state logic that belongs in a custom hook per the coding rules.

### 3. Created custom hook
**File:** `hooks/utils/profile/useProfileDraft/index.ts`

Follows all coding rules:
- Path: `hooks/utils/profile/useProfileDraft/index.ts` (domain = `profile` from `app/profile/page.tsx`)
- Arrow function style with `default export`
- Hook name: `useProfileDraft` (matches `^use[A-Z][A-Za-z0-9]*$`)
- All handlers use `handle*` prefix: `handleSave`, `handleCancel`, `handleStartEditing`, `handleChangeName`, `handleChangeBio`, `handleChangeSkills`, `handleChangeBirthDate`, `handleChangeAvatarFileName`
- Returns a typed `UseProfileDraftReturn` interface
- Draft fields grouped into a `draft` object for clean wiring
- Auth redirect logic (`useEffect` for `/login` push) encapsulated in hook
- User data sync (`useEffect` on `user` change) encapsulated in hook
- Validation logic (name required, bio max 500) encapsulated in `handleSave`
- Cancel resets draft via `resetDraft` helper using `useCallback`
- Saved toast state with 3-second auto-dismiss preserved

### 4. Refactored page
**File:** `app/profile/page.tsx`

The page now:
- Imports only UI components (`FileUpload`, `DatePicker`, `MultiSelect`) and `useProfileDraft`
- Destructures all needed values from the hook
- Contains zero `useState`, zero `useEffect`, zero business logic
- Only handles field wiring (connecting `draft.*` values and `handle*` callbacks to components) and section layout (view vs. edit toggle)
- All `data-testid` attributes preserved exactly as before
- All CSS classes and layout structure unchanged

### 5. Validation checklist
- [x] File lives under `hooks/utils/*`
- [x] Path matches `hooks/utils/{domain}/{hookName}/index.ts` pattern
- [x] All path segments use camelCase
- [x] Entry file is `index.ts`
- [x] Main export name matches hook name (`useProfileDraft`)
- [x] Hook uses arrow function style
- [x] Entry file does not define additional hooks
- [x] Entry file does not define React components
- [x] All handlers use `handle*` prefix
- [x] Array names are plural nouns (`skills`, `errors`)
- [x] No `List` or `Array` suffixes

## Files Created
- `hooks/utils/profile/useProfileDraft/index.ts`

## Files Modified
- `app/profile/page.tsx`

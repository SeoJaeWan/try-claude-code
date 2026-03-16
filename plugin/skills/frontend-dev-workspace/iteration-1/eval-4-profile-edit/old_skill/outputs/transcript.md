# Transcript: Profile Edit Hook Extraction (old-frontend-dev skill)

## Task

프로필 편집 페이지의 draft 상태와 저장 로직을 프로젝트 컨벤션에 맞게 훅으로 분리. 페이지는 field wiring과 section layout만 담당하게 정리.

## Steps

### Step 1: Read SKILL.md

Read `plugin/skills/old-frontend-dev/SKILL.md`. Key instructions:
- Read coding-rules.md before writing code
- Always attempt boilerplate generation first via generate.mjs
- Extract inline logic (fetch, useState for business data, useEffect) into custom hooks
- Use `{hooksRoot}` rules from coding-rules.md for placement
- Each hook uses the `{hookName}/index.ts` directory pattern

### Step 2: Read all input files

- `package.json`: Next.js 16.1.6, React 19.2.3 project
- `app/profile/page.tsx`: ProfilePage with inline draft state (name, bio, skills, birthDate, avatarFileName), validation, save logic, and cancel/reset logic all mixed into the component
- `contexts/AuthContext.tsx`: Provides `useAuth()` with user, isAuthenticated, mounted, updateProfile
- `components/DatePicker.tsx`: Controlled date input component
- `components/MultiSelect.tsx`: Multi-select dropdown with chips
- `components/FileUpload.tsx`: File upload with validation
- `lib/types.ts`: User interface with id, email, name, bio?, skills?, birthDate?, avatarFileName?

### Step 3: Read coding-rules.md

Read `plugin/skills/old-frontend-dev/references/coding-rules.md`. Key rules:
- Hook Placement Decision Flow: Page-specific hooks go to `app/{feature}/hooks/`
- Each hook uses directory pattern: `{hookName}/index.ts`
- `{hooksRoot}` resolves to `hooks/` (first existing path check: `src/hooks/` -> `app/hooks/` -> `hooks/`)
- Existing hooks directory confirmed at project root: `hooks/apis/queries/...`

### Step 4: Attempt boilerplate generation

Ran:
```
node generate.mjs hook useProfileEdit --form --state "name:string,bio:string,skills:string,birthDate:string,avatarFileName:string"
```

Result: Failed with ERR_MODULE_NOT_FOUND (test_suite.mjs missing). Per SKILL.md instruction: "If scripts are not found (init-try not run), skip boilerplate generation and implement manually."

### Step 5: Determine hook placement

Per coding-rules.md Hook Placement Decision Flow:
1. API call hook? No
2. Used in 2+ places? No (page-specific)
3. Page-specific? Yes -> `app/profile/hooks/`

Placement: `app/profile/hooks/useProfileEdit/index.ts`

### Step 6: Extract inline logic into useProfileEdit hook

Extracted from `page.tsx`:
- All `useState` calls for draft fields (name, bio, skills, birthDate, avatarFileName) -> consolidated into single `draft` state object
- `useState` for editing, errors, saved
- `useEffect` for auth redirect
- `useEffect` for syncing user data to draft
- `handleSave` function with validation logic
- Cancel/reset logic (was inline in onClick) -> `handleCancel` function
- Added `updateDraft` helper with typed field update

Hook returns:
- `user`, `isAuthenticated`, `mounted` (auth state passthrough)
- `editing`, `setEditing` (edit mode toggle)
- `draft` (consolidated draft state object)
- `errors` (validation errors)
- `saved` (save success feedback)
- `updateDraft` (typed field updater)
- `handleSave` (validate + save + feedback)
- `handleCancel` (reset draft + exit edit mode)

### Step 7: Refactor page to field wiring and section layout only

Refactored `page.tsx`:
- Removed all `useState`, `useEffect`, inline handlers
- Removed direct `useAuth` and `useRouter` imports (handled by hook)
- Page now only: imports hook, destructures return values, renders view/edit sections
- Field wiring: each form field binds to `draft.{field}` and `updateDraft("{field}", value)`
- All data-testid attributes preserved for test compatibility

## Output Files

1. `app/profile/hooks/useProfileEdit/index.ts` - New custom hook
2. `app/profile/page.tsx` - Refactored page (field wiring + section layout only)

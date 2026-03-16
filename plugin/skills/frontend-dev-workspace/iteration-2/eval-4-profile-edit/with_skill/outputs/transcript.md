# Eval 4: Profile Edit Hook Extraction - Transcript

## Task Description

프로필 편집 페이지의 draft 상태와 저장 로직을 프로젝트 컨벤션에 맞게 훅으로 분리. 페이지는 field wiring과 section layout만 담당하게 정리.

## Steps

### Step 1: Read SKILL.md

Read `plugin/skills/frontend-dev/SKILL.md` to understand the CLI-first workflow:
- All hook files must be created via `tcf` CLI
- Never create hook files manually
- After `tcf` creates the scaffold, implement business logic inside generated files

### Step 2: Read fixture files

Read the following seed context files:
- `features/frontend-dev-fixture/package.json` - Next.js 16 / React 19 project
- `features/frontend-dev-fixture/app/profile/page.tsx` - Profile page with inline useState for draft state, validation, save/cancel logic
- `features/frontend-dev-fixture/contexts/AuthContext.tsx` - Auth context providing user, updateProfile
- `features/frontend-dev-fixture/components/DatePicker.tsx` - Date picker component
- `features/frontend-dev-fixture/components/MultiSelect.tsx` - Multi-select component
- `features/frontend-dev-fixture/components/FileUpload.tsx` - File upload component

### Step 3: Run tcf --help

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs --help
```

Output confirmed available commands including `hook` for non-API hooks with path policy `hooks/utils/{domain}`.

### Step 4: Scaffold hook via tcf

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs hook --json '{"name":"useProfileEdit","path":"hooks/utils/profile"}' --apply
```

Output:
```json
{
  "ok": true,
  "command": "hook",
  "normalizedSpec": {
    "name": "useProfileEdit",
    "path": "hooks/utils/profile"
  },
  "files": [
    {
      "path": "hooks/utils/profile/useProfileEdit/index.ts",
      "bytes": 84,
      "status": "written"
    }
  ]
}
```

### Step 5: Implement business logic in generated hook

Implemented draft state management, validation, save/cancel handlers in the scaffolded hook file.

### Step 6: Refactor page.tsx

Removed all inline useState calls for draft fields. Page now only handles:
- Auth guard (redirect if not authenticated)
- Section layout (view mode / edit mode)
- Field wiring via `draft` object and `setDraftField`

## Files Created

### `hooks/utils/profile/useProfileEdit/index.ts` (created via tcf, then implemented)

```ts
import { useCallback, useEffect, useState } from "react";
import type { User } from "@/lib/types";

interface ProfileDraft {
  name: string;
  bio: string;
  skills: string[];
  birthDate: string;
  avatarFileName: string | undefined;
}

interface UseProfileEditReturn {
  editing: boolean;
  draft: ProfileDraft;
  errors: Record<string, string>;
  saved: boolean;
  setDraftField: <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => void;
  handleEdit: () => void;
  handleSave: () => void;
  handleCancel: () => void;
}

const createDraftFromUser = (user: User): ProfileDraft => ({
  name: user.name,
  bio: user.bio || "",
  skills: user.skills || [],
  birthDate: user.birthDate || "",
  avatarFileName: user.avatarFileName,
});

const useProfileEdit = (
  user: User | null,
  updateProfile: (updates: Partial<User>) => void,
): UseProfileEditReturn => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>({
    name: "",
    bio: "",
    skills: [],
    birthDate: "",
    avatarFileName: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setDraft(createDraftFromUser(user));
    }
  }, [user]);

  const setDraftField = useCallback(
    <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!draft.name.trim()) errs.name = "이름을 입력해주세요";
    if (draft.bio.length > 500) errs.bio = "자기소개는 500자 이하여야 합니다";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    updateProfile({
      name: draft.name.trim(),
      bio: draft.bio,
      skills: draft.skills,
      birthDate: draft.birthDate,
      avatarFileName: draft.avatarFileName,
    });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [draft, updateProfile]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    if (user) {
      setDraft(createDraftFromUser(user));
    }
    setErrors({});
  }, [user]);

  return {
    editing,
    draft,
    errors,
    saved,
    setDraftField,
    handleEdit,
    handleSave,
    handleCancel,
  };
};

export default useProfileEdit;
```

## Files Modified

### `app/profile/page.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import FileUpload from "@/components/FileUpload";
import DatePicker from "@/components/DatePicker";
import MultiSelect from "@/components/MultiSelect";
import useProfileEdit from "@/hooks/utils/profile/useProfileEdit";

const SKILL_OPTIONS = ["JavaScript", "TypeScript", "React", "Next.js", "Python", "Go", "Rust", "CSS"];

export default function ProfilePage() {
  const { user, isAuthenticated, mounted, updateProfile } = useAuth();
  const router = useRouter();
  const { editing, draft, errors, saved, setDraftField, handleEdit, handleSave, handleCancel } =
    useProfileEdit(user, updateProfile);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push("/login");
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated || !user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">프로필</h1>

      {saved && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" data-testid="profile-saved">
          프로필이 저장되었습니다
        </div>
      )}

      {!editing ? (
        <div className="mt-6 space-y-4" data-testid="profile-view">
          <div>
            <span className="text-sm text-zinc-500">이름</span>
            <p className="text-zinc-900 dark:text-zinc-50" data-testid="profile-display-name">{user.name}</p>
          </div>
          <div>
            <span className="text-sm text-zinc-500">이메일</span>
            <p className="text-zinc-900 dark:text-zinc-50">{user.email}</p>
          </div>
          <div>
            <span className="text-sm text-zinc-500">자기소개</span>
            <p className="text-zinc-900 dark:text-zinc-50">{user.bio || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-zinc-500">기술 스택</span>
            <p className="text-zinc-900 dark:text-zinc-50">{user.skills?.join(", ") || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-zinc-500">생년월일</span>
            <p className="text-zinc-900 dark:text-zinc-50">{user.birthDate || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-zinc-500">아바타</span>
            <p className="text-zinc-900 dark:text-zinc-50">{user.avatarFileName || "-"}</p>
          </div>
          <button
            onClick={handleEdit}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            data-testid="profile-edit-btn"
          >
            프로필 수정
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4" data-testid="profile-form">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">이름</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraftField("name", e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              data-testid="profile-name"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">자기소개</label>
            <textarea
              value={draft.bio}
              onChange={(e) => setDraftField("bio", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              data-testid="profile-bio"
            />
            {errors.bio && <p className="mt-1 text-xs text-red-600">{errors.bio}</p>}
            <p className="mt-1 text-xs text-zinc-400">{draft.bio.length}/500</p>
          </div>

          <DatePicker label="생년월일" value={draft.birthDate} onChange={(v) => setDraftField("birthDate", v)} testId="profile-birthdate" />

          <MultiSelect
            label="기술 스택"
            options={SKILL_OPTIONS}
            selected={draft.skills}
            onChange={(v) => setDraftField("skills", v)}
            testId="profile-skills"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">아바타</label>
            <FileUpload value={draft.avatarFileName} onChange={(v) => setDraftField("avatarFileName", v)} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              data-testid="profile-save"
            >
              저장
            </button>
            <button
              onClick={handleCancel}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              data-testid="profile-cancel"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

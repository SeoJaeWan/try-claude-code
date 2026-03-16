# Eval 4: Profile Edit Hook Extraction (old-frontend-dev skill)

## Task Description

프로필 편집 페이지(`app/profile/page.tsx`)의 draft 상태(name, bio, skills, birthDate, avatarFileName)와 저장/취소 로직을 프로젝트 컨벤션에 맞게 커스텀 훅으로 분리. 페이지 컴포넌트는 field wiring과 section layout만 담당하도록 정리.

## Steps Taken

### Step 1: Read SKILL.md and coding-rules.md

- Read `plugin/skills/old-frontend-dev/SKILL.md` -- frontend-dev skill guide covering hook extraction workflow, folder structure, and coding rules reference.
- Read `plugin/skills/old-frontend-dev/references/coding-rules.md` -- hook naming conventions, hooks root resolution (`hooks/` > `src/hooks/` > `app/hooks/`), folder structure, and hook placement decision flow.

### Step 2: Read fixture files

- `features/frontend-dev-fixture/package.json` -- Next.js 16 + React 19 project
- `features/frontend-dev-fixture/app/profile/page.tsx` -- Profile page with inline draft state (6 useState calls), validation, save logic, cancel logic, and auth redirect
- `features/frontend-dev-fixture/contexts/AuthContext.tsx` -- AuthContext providing user, updateProfile, isAuthenticated, mounted
- `features/frontend-dev-fixture/components/DatePicker.tsx` -- Controlled date input component
- `features/frontend-dev-fixture/components/MultiSelect.tsx` -- Controlled multi-select dropdown component
- `features/frontend-dev-fixture/components/FileUpload.tsx` -- File upload component with validation

### Step 3: Analyze and plan

Per coding-rules.md hook placement decision flow:
- This is NOT an API call hook -> skip `{hooksRoot}/apis/`
- This is NOT used in 2+ places -> skip `{hooksRoot}/utils/`
- This IS page-specific -> place at `app/profile/hooks/`

Hook follows the `{hookName}/index.ts` directory pattern per convention.

Extracted logic:
- All draft state (name, bio, skills, birthDate, avatarFileName, editing, errors, saved)
- Auth redirect effect
- User data sync effect
- Validation + save handler
- Cancel handler (resets draft to user data)

### Step 4: Implement

Created 1 new file, modified 1 existing file.

## Files Created

### `features/frontend-dev-fixture/app/profile/hooks/useProfileEdit/index.ts` (CREATED)

```ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function useProfileEdit() {
  const { user, isAuthenticated, mounted, updateProfile } = useAuth();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [birthDate, setBirthDate] = useState("");
  const [avatarFileName, setAvatarFileName] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push("/login");
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio || "");
      setSkills(user.skills || []);
      setBirthDate(user.birthDate || "");
      setAvatarFileName(user.avatarFileName);
    }
  }, [user]);

  const startEditing = useCallback(() => {
    setEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "이름을 입력해주세요";
    if (bio.length > 500) errs.bio = "자기소개는 500자 이하여야 합니다";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    updateProfile({ name: name.trim(), bio, skills, birthDate, avatarFileName });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [name, bio, skills, birthDate, avatarFileName, updateProfile]);

  const handleCancel = useCallback(() => {
    if (!user) return;
    setEditing(false);
    setName(user.name);
    setBio(user.bio || "");
    setSkills(user.skills || []);
    setBirthDate(user.birthDate || "");
    setAvatarFileName(user.avatarFileName);
    setErrors({});
  }, [user]);

  return {
    user,
    mounted,
    isAuthenticated,
    editing,
    name,
    setName,
    bio,
    setBio,
    skills,
    setSkills,
    birthDate,
    setBirthDate,
    avatarFileName,
    setAvatarFileName,
    errors,
    saved,
    startEditing,
    handleSave,
    handleCancel,
  };
}
```

### `features/frontend-dev-fixture/app/profile/page.tsx` (MODIFIED)

```tsx
"use client";

import FileUpload from "@/components/FileUpload";
import DatePicker from "@/components/DatePicker";
import MultiSelect from "@/components/MultiSelect";
import useProfileEdit from "./hooks/useProfileEdit";

const SKILL_OPTIONS = ["JavaScript", "TypeScript", "React", "Next.js", "Python", "Go", "Rust", "CSS"];

export default function ProfilePage() {
  const {
    user,
    mounted,
    isAuthenticated,
    editing,
    name,
    setName,
    bio,
    setBio,
    skills,
    setSkills,
    birthDate,
    setBirthDate,
    avatarFileName,
    setAvatarFileName,
    errors,
    saved,
    startEditing,
    handleSave,
    handleCancel,
  } = useProfileEdit();

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
            onClick={startEditing}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              data-testid="profile-name"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">자기소개</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              data-testid="profile-bio"
            />
            {errors.bio && <p className="mt-1 text-xs text-red-600">{errors.bio}</p>}
            <p className="mt-1 text-xs text-zinc-400">{bio.length}/500</p>
          </div>

          <DatePicker label="생년월일" value={birthDate} onChange={setBirthDate} testId="profile-birthdate" />

          <MultiSelect
            label="기술 스택"
            options={SKILL_OPTIONS}
            selected={skills}
            onChange={setSkills}
            testId="profile-skills"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">아바타</label>
            <FileUpload value={avatarFileName} onChange={setAvatarFileName} />
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

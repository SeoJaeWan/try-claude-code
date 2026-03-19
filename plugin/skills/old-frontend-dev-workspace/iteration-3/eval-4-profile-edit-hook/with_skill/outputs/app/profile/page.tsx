"use client";

import FileUpload from "@/components/FileUpload";
import DatePicker from "@/components/DatePicker";
import MultiSelect from "@/components/MultiSelect";
import useProfileDraft from "@/hooks/utils/profile/useProfileDraft";

export default function ProfilePage() {
  const {
    user,
    mounted,
    isAuthenticated,
    editing,
    name,
    bio,
    skills,
    birthDate,
    avatarFileName,
    errors,
    saved,
    skillOptions,
    onChangeName,
    onChangeBio,
    onChangeSkills,
    onChangeBirthDate,
    onChangeAvatarFileName,
    handleSave,
    handleCancel,
    handleStartEditing,
  } = useProfileDraft();

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
            onClick={handleStartEditing}
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
              onChange={(e) => onChangeName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              data-testid="profile-name"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">자기소개</label>
            <textarea
              value={bio}
              onChange={(e) => onChangeBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              data-testid="profile-bio"
            />
            {errors.bio && <p className="mt-1 text-xs text-red-600">{errors.bio}</p>}
            <p className="mt-1 text-xs text-zinc-400">{bio.length}/500</p>
          </div>

          <DatePicker label="생년월일" value={birthDate} onChange={onChangeBirthDate} testId="profile-birthdate" />

          <MultiSelect
            label="기술 스택"
            options={skillOptions}
            selected={skills}
            onChange={onChangeSkills}
            testId="profile-skills"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">아바타</label>
            <FileUpload value={avatarFileName} onChange={onChangeAvatarFileName} />
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

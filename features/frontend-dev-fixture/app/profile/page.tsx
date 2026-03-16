"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import FileUpload from "@/components/FileUpload";
import DatePicker from "@/components/DatePicker";
import MultiSelect from "@/components/MultiSelect";

const SKILL_OPTIONS = ["JavaScript", "TypeScript", "React", "Next.js", "Python", "Go", "Rust", "CSS"];

export default function ProfilePage() {
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

  if (!mounted || !isAuthenticated || !user) return null;

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "이름을 입력해주세요";
    if (bio.length > 500) errs.bio = "자기소개는 500자 이하여야 합니다";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    updateProfile({ name: name.trim(), bio, skills, birthDate, avatarFileName });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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
            onClick={() => setEditing(true)}
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
              onClick={() => {
                setEditing(false);
                setName(user.name);
                setBio(user.bio || "");
                setSkills(user.skills || []);
                setBirthDate(user.birthDate || "");
                setAvatarFileName(user.avatarFileName);
                setErrors({});
              }}
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

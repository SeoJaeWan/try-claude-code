"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/** 프로필 편집 draft 상태 */
interface ProfileDraft {
  name: string;
  bio: string;
  skills: string[];
  birthDate: string;
  avatarFileName: string | undefined;
}

/** useProfileEdit 반환 타입 */
interface UseProfileEditReturn {
  editing: boolean;
  draft: ProfileDraft;
  errors: Record<string, string>;
  saved: boolean;
  handleEdit: () => void;
  handleCancel: () => void;
  handleSave: () => void;
  setDraftField: <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => void;
}

/**
 * 프로필 편집 페이지의 draft 상태와 저장 로직을 관리하는 훅
 * @returns editing 상태, draft 값, 에러, 저장 완료 여부 및 핸들러
 */
const useProfileEdit = (): UseProfileEditReturn => {
  const { user, isAuthenticated, mounted, updateProfile } = useAuth();
  const router = useRouter();

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
    if (mounted && !isAuthenticated) router.push("/login");
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setDraft({
        name: user.name,
        bio: user.bio || "",
        skills: user.skills || [],
        birthDate: user.birthDate || "",
        avatarFileName: user.avatarFileName,
      });
    }
  }, [user]);

  const setDraftField = <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    if (user) {
      setDraft({
        name: user.name,
        bio: user.bio || "",
        skills: user.skills || [],
        birthDate: user.birthDate || "",
        avatarFileName: user.avatarFileName,
      });
    }
    setErrors({});
    setEditing(false);
  };

  const handleSave = () => {
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
  };

  return {
    editing,
    draft,
    errors,
    saved,
    handleEdit,
    handleCancel,
    handleSave,
    setDraftField,
  };
};

export default useProfileEdit;

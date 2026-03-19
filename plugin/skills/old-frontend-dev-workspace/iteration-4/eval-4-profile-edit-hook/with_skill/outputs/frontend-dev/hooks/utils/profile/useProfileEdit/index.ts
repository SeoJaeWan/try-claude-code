"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/lib/types";

interface ProfileDraft {
  name: string;
  bio: string;
  skills: string[];
  birthDate: string;
  avatarFileName: string | undefined;
}

interface UseProfileEditResult {
  editing: boolean;
  draft: ProfileDraft;
  errors: Record<string, string>;
  saved: boolean;
  handleStartEdit: () => void;
  handleCancel: () => void;
  handleSave: () => void;
  handleDraftChange: (updates: Partial<ProfileDraft>) => void;
}

const buildDraft = (user: User): ProfileDraft => ({
  name: user.name,
  bio: user.bio || "",
  skills: user.skills || [],
  birthDate: user.birthDate || "",
  avatarFileName: user.avatarFileName,
});

const useProfileEdit = (): UseProfileEditResult => {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    user ? buildDraft(user) : { name: "", bio: "", skills: [], birthDate: "", avatarFileName: undefined }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setDraft(buildDraft(user));
    }
  }, [user]);

  const handleStartEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    if (user) {
      setDraft(buildDraft(user));
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

  const handleDraftChange = (updates: Partial<ProfileDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  return {
    editing,
    draft,
    errors,
    saved,
    handleStartEdit,
    handleCancel,
    handleSave,
    handleDraftChange,
  };
};

export default useProfileEdit;

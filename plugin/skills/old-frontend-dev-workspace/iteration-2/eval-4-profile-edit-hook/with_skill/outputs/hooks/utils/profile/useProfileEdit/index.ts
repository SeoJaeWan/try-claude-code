"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileDraft {
  name: string;
  bio: string;
  skills: string[];
  birthDate: string;
  avatarFileName: string | undefined;
}

interface UseProfileEditReturn {
  user: ReturnType<typeof useAuth>["user"];
  isAuthenticated: boolean;
  mounted: boolean;
  editing: boolean;
  draft: ProfileDraft;
  errors: Record<string, string>;
  saved: boolean;
  handleEditStart: () => void;
  handleCancel: () => void;
  handleSave: () => void;
  handleNameChange: (value: string) => void;
  handleBioChange: (value: string) => void;
  handleSkillsChange: (value: string[]) => void;
  handleBirthDateChange: (value: string) => void;
  handleAvatarFileNameChange: (value: string | undefined) => void;
}

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

  const handleEditStart = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    if (!user) return;
    setDraft({
      name: user.name,
      bio: user.bio || "",
      skills: user.skills || [],
      birthDate: user.birthDate || "",
      avatarFileName: user.avatarFileName,
    });
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

  const handleNameChange = (value: string) => {
    setDraft((prev) => ({ ...prev, name: value }));
  };

  const handleBioChange = (value: string) => {
    setDraft((prev) => ({ ...prev, bio: value }));
  };

  const handleSkillsChange = (value: string[]) => {
    setDraft((prev) => ({ ...prev, skills: value }));
  };

  const handleBirthDateChange = (value: string) => {
    setDraft((prev) => ({ ...prev, birthDate: value }));
  };

  const handleAvatarFileNameChange = (value: string | undefined) => {
    setDraft((prev) => ({ ...prev, avatarFileName: value }));
  };

  return {
    user,
    isAuthenticated,
    mounted,
    editing,
    draft,
    errors,
    saved,
    handleEditStart,
    handleCancel,
    handleSave,
    handleNameChange,
    handleBioChange,
    handleSkillsChange,
    handleBirthDateChange,
    handleAvatarFileNameChange,
  };
};

export default useProfileEdit;

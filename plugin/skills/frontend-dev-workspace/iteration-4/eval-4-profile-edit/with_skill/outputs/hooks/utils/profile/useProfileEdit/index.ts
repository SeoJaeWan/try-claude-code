"use client";

import { useState } from "react";

/** 프로필 draft 데이터 */
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
  handleNameChange: (value: string) => void;
  handleBioChange: (value: string) => void;
  handleSkillsChange: (value: string[]) => void;
  handleBirthDateChange: (value: string) => void;
  handleAvatarChange: (value: string | undefined) => void;
  handleEdit: () => void;
  handleSave: () => void;
  handleCancel: () => void;
}

const INITIAL_DRAFT: ProfileDraft = {
  name: "",
  bio: "",
  skills: [],
  birthDate: "",
  avatarFileName: undefined,
};

/**
 * 프로필 편집 페이지의 draft 상태와 저장 로직을 관리하는 훅
 * @returns draft 상태, 에러, 편집/저장/취소 핸들러
 */
const useProfileEdit = (): UseProfileEditReturn => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(INITIAL_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

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

  const handleAvatarChange = (value: string | undefined) => {
    setDraft((prev) => ({ ...prev, avatarFileName: value }));
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!draft.name.trim()) errs.name = "이름을 입력해주세요";
    if (draft.bio.length > 500) errs.bio = "자기소개는 500자 이하여야 합니다";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    // TODO: 프로필 저장 API 호출
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancel = () => {
    setEditing(false);
    setErrors({});
  };

  return {
    editing,
    draft,
    errors,
    saved,
    handleNameChange,
    handleBioChange,
    handleSkillsChange,
    handleBirthDateChange,
    handleAvatarChange,
    handleEdit,
    handleSave,
    handleCancel,
  };
};

export default useProfileEdit;

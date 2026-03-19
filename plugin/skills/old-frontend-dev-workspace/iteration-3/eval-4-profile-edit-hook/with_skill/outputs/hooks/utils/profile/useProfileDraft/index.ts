"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const SKILL_OPTIONS = ["JavaScript", "TypeScript", "React", "Next.js", "Python", "Go", "Rust", "CSS"];

const useProfileDraft = () => {
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

  const handleSave = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "\uC774\uB984\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694";
    if (bio.length > 500) errs.bio = "\uC790\uAE30\uC18C\uAC1C\uB294 500\uC790 \uC774\uD558\uC5EC\uC57C \uD569\uB2C8\uB2E4";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    updateProfile({ name: name.trim(), bio, skills, birthDate, avatarFileName });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [name, bio, skills, birthDate, avatarFileName, updateProfile]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    if (user) {
      setName(user.name);
      setBio(user.bio || "");
      setSkills(user.skills || []);
      setBirthDate(user.birthDate || "");
      setAvatarFileName(user.avatarFileName);
    }
    setErrors({});
  }, [user]);

  const handleStartEditing = useCallback(() => {
    setEditing(true);
  }, []);

  return {
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
    skillOptions: SKILL_OPTIONS,
    onChangeName: setName,
    onChangeBio: setBio,
    onChangeSkills: setSkills,
    onChangeBirthDate: setBirthDate,
    onChangeAvatarFileName: setAvatarFileName,
    handleSave,
    handleCancel,
    handleStartEditing,
  };
};

export default useProfileDraft;

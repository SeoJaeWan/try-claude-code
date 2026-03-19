import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileDraft {
  name: string;
  bio: string;
  skills: string[];
  birthDate: string;
  avatarFileName: string | undefined;
}

interface UseProfileDraftReturn {
  user: ReturnType<typeof useAuth>["user"];
  isAuthenticated: boolean;
  mounted: boolean;
  editing: boolean;
  draft: ProfileDraft;
  errors: Record<string, string>;
  saved: boolean;
  handleStartEditing: () => void;
  handleCancel: () => void;
  handleSave: () => void;
  handleChangeName: (value: string) => void;
  handleChangeBio: (value: string) => void;
  handleChangeSkills: (value: string[]) => void;
  handleChangeBirthDate: (value: string) => void;
  handleChangeAvatarFileName: (value: string | undefined) => void;
}

const useProfileDraft = (): UseProfileDraftReturn => {
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

  const resetDraft = useCallback(() => {
    if (!user) return;
    setName(user.name);
    setBio(user.bio || "");
    setSkills(user.skills || []);
    setBirthDate(user.birthDate || "");
    setAvatarFileName(user.avatarFileName);
    setErrors({});
  }, [user]);

  const handleStartEditing = useCallback(() => {
    setEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setEditing(false);
    resetDraft();
  }, [resetDraft]);

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

  const handleChangeName = useCallback((value: string) => {
    setName(value);
  }, []);

  const handleChangeBio = useCallback((value: string) => {
    setBio(value);
  }, []);

  const handleChangeSkills = useCallback((value: string[]) => {
    setSkills(value);
  }, []);

  const handleChangeBirthDate = useCallback((value: string) => {
    setBirthDate(value);
  }, []);

  const handleChangeAvatarFileName = useCallback((value: string | undefined) => {
    setAvatarFileName(value);
  }, []);

  return {
    user,
    isAuthenticated,
    mounted,
    editing,
    draft: { name, bio, skills, birthDate, avatarFileName },
    errors,
    saved,
    handleStartEditing,
    handleCancel,
    handleSave,
    handleChangeName,
    handleChangeBio,
    handleChangeSkills,
    handleChangeBirthDate,
    handleChangeAvatarFileName,
  };
};

export default useProfileDraft;

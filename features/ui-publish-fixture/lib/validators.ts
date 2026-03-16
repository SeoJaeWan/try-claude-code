export function validateEmail(email: string): string | null {
  if (!email.trim()) return "이메일을 입력해주세요";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "올바른 이메일 형식이 아닙니다";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "비밀번호를 입력해주세요";
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다";
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return "이름을 입력해주세요";
  if (name.length > 100) return "이름은 100자 이하여야 합니다";
  return null;
}

export function validateTodoText(text: string): string | null {
  if (!text.trim()) return "할 일을 입력해주세요";
  if (text.length > 200) return "할 일은 200자 이하여야 합니다";
  return null;
}

export function validateFile(
  file: File,
  allowedTypes: string[] = ["image/jpeg", "image/png", "image/gif", "image/webp"],
  maxSizeBytes: number = 5 * 1024 * 1024
): string | null {
  if (!allowedTypes.some((t) => file.type.startsWith(t.replace("*", "")))) {
    return "허용되지 않는 파일 형식입니다";
  }
  if (file.size > maxSizeBytes) {
    return `파일 크기는 ${Math.round(maxSizeBytes / 1024 / 1024)}MB 이하여야 합니다`;
  }
  return null;
}

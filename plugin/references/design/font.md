# Design System - Typography & Font Loading

타이포그래피 시스템과 폰트 로딩 방법을 정의합니다.

---

## 목차

1. [폰트 시스템](#1-폰트-시스템)
2. [폰트 로드 방법](#2-폰트-로드-방법)
3. [타이포그래피 원칙](#3-타이포그래피-원칙)
4. [실제 값 참조](#4-실제-값-참조)

---

## 1. 폰트 시스템

### 1.1 Font Family

**Primary Font:**
- **Pretendard Variable** (`<repo-root>/.claude/assets/fonts/PretendardVariable.ttf` -- project-level asset)
- Variable Font, weights 100-900 지원
- 모든 UI 텍스트에 사용

**Monospace Font:**
- **JetBrains Mono** (코드 블록 전용)
- Fallback: Menlo, monospace

### 1.2 Font Weight

```
fontWeight:
├── regular   # 400 - 본문
├── medium    # 500 - 강조
├── semibold  # 600 - 제목
└── bold      # 700 - 헤더
```

### 1.3 Line Height

```
lineHeight:
├── tight    # 1.25 - 제목
├── normal   # 1.5  - 본문
└── relaxed  # 1.75 - 긴 글
```

---

## 2. 폰트 로드 방법

### 2.1 Next.js (App Router)

```typescript
// app/layout.tsx
import localFont from "next/font/local";

const pretendard = localFont({
  src: "../.claude/assets/fonts/PretendardVariable.ttf",  // project-level asset path
  display: "swap",
  weight: "100 900",
  variable: "--font-pretendard",
});

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### 2.2 Tailwind CSS 설정

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-pretendard)",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
    },
  },
};
```

### 2.3 React Native (Expo)

```typescript
// app/_layout.tsx
import { useFonts } from "expo-font";

export default function RootLayout() {
  const [loaded] = useFonts({
    Pretendard: require("../.claude/assets/fonts/PretendardVariable.ttf"),  // project-level asset path
  });

  if (!loaded) return null;

  return <Stack />;
}
```

---

## 3. 타이포그래피 원칙

### 3.1 타입 스케일 전략

**Mobile First:**
- 작은 화면에서는 작은 폰트 (공간 효율)
- 큰 화면으로 갈수록 폰트 크기 증가 (가독성)

**예시:**
```
H1: Mobile 24px → Desktop 30px
H2: Mobile 20px → Desktop 24px
Body: Mobile/Desktop 동일 16px (일관성)
```

### 3.2 가독성 원칙

- **본문**: 16px 고정 (모든 뷰포트)
- **코드**: 14px 고정 (모든 뷰포트)
- **제목**: 반응형 (뷰포트에 따라 스케일)

### 3.3 행간 (Line Height)

- **제목**: tight (1.25) - 시각적 임팩트
- **본문**: normal (1.5) - 읽기 편함
- **긴 글**: relaxed (1.75) - 장문 가독성

---

## 4. 실제 값 참조

### 4.1 Font Size 값

**실제 fontSize 값은 다음 파일을 참조하세요:**

```
tailwind.config.js    # fontSize 설정
```

### 4.2 사용 예시

```typescript
// ✅ Tailwind 클래스 사용
<h1 className="text-3xl font-bold">Title</h1>
<p className="text-base font-regular">Body</p>
<code className="text-sm font-mono">Code</code>

// ❌ 하드코딩 금지
<h1 style={{ fontSize: 30, fontWeight: 700 }}>Title</h1>
```

---

_— End of Document —_

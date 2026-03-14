# Design System - Theme Tokens

디자인 시스템의 구조와 원칙을 정의합니다. **실제 색상, 간격 값은 코드를 참조하세요.**

---

## 목차

1. [디자인 컨셉](#1-디자인-컨셉)
2. [색상 시스템 구조](#2-색상-시스템-구조)
3. [간격 & 반경 시스템](#3-간격--반경-시스템)
4. [반응형 전략](#4-반응형-전략)
5. [그림자 & 효과](#5-그림자--효과)
6. [실제 값 참조](#6-실제-값-참조)

---

## 1. 디자인 컨셉

### 1.1 Developer-First Dark Minimal

- **다크 모드 기본** (라이트 모드 옵션)
- **미니멀리즘** (불필요한 UI 요소 제거)
- **높은 가독성** (코드/텍스트 최적화)
- **빠른 인터랙션** (터치 타겟 충분히)

### 1.2 핵심 원칙

| 원칙   | 설명                         |
| ------ | ---------------------------- |
| 일관성 | 웹/모바일 동일한 디자인 언어 |
| 단순함 | 한 화면에 하나의 목적        |
| 접근성 | 충분한 대비, 터치 영역 44px+ |
| 성능   | 애니메이션 최소화, 빠른 로딩 |

---

## 2. 색상 시스템 구조

### 2.1 색상 계층 (Semantic Naming)

색상은 **용도 기반**으로 계층화합니다:

```
색상 계층:
├── bg (background)
│   ├── primary      # 메인 배경
│   ├── secondary    # 카드, 사이드바
│   └── tertiary     # 모달, 드롭다운
│
├── text
│   ├── primary      # 주요 텍스트
│   ├── secondary    # 보조 텍스트
│   └── muted        # 비활성 텍스트
│
├── border
│   ├── default      # 기본 테두리
│   └── subtle       # 약한 테두리
│
├── accent
│   ├── primary      # 주요 액센트 (CTA)
│   ├── primaryHover # Hover 상태
│   └── primaryMuted # 반투명 배경
│
├── status (난이도/상태)
│   ├── easy / easyBg
│   ├── medium / mediumBg
│   └── hard / hardBg
│
└── semantic
    ├── success
    ├── warning
    └── error
```

### 2.2 색상 네이밍 규칙

- **용도 기반 네이밍**: `bg.primary`, `text.secondary` (❌ `gray.100`)
- **상태 포함**: `accent.primaryHover` (Hover, Active, Disabled)
- **투명도 구분**: `easyBg` (반투명 배경용)

---

## 3. 간격 & 반경 시스템

### 3.1 간격 (Spacing)

**4px 기준 스케일** 사용:

```
spacing: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, ...
```

- **일관성**: 모든 마진, 패딩은 4의 배수
- **네이밍**: `spacing.1` (4px), `spacing.2` (8px), ...

### 3.2 반경 (Border Radius)

```
radius:
├── none  # 0px (각진 모서리)
├── sm    # 작은 반경 (태그, 뱃지)
├── md    # 중간 반경 (입력창, 버튼 소형)
├── lg    # 큰 반경 (버튼, 카드)
├── xl    # 더 큰 반경 (모달)
├── 2xl   # 매우 큰 반경 (특수 카드)
└── full  # 완전한 원 (아바타)
```

---

## 4. 반응형 전략

### 4.1 브레이크포인트

| 뷰포트      | 범위          | 주요 특징                               |
| ----------- | ------------- | --------------------------------------- |
| **Mobile**  | 0 - 767px     | 모바일 웹, 하단 네비게이션, 세로 스크롤 |
| **Tablet**  | 768 - 1023px  | 사이드바 축소, 2컬럼 시작               |
| **Desktop** | 1024 - 1279px | 사이드바 확장, 2컬럼 완성               |
| **Wide**    | 1280px+       | 최대 너비 제한, 중앙 정렬               |

### 4.2 레이아웃 전략

**Mobile:**
- 하단 네비게이션
- 전체 폭 사용
- 세로 스크롤

**Tablet:**
- 아이콘 사이드바 (64px)
- 2컬럼 레이아웃 시작

**Desktop:**
- 텍스트 사이드바 (200px)
- 2컬럼 완성
- 최대 너비 제한 (1440px)

### 4.3 반응형 컴포넌트 원칙

**버튼:**
- Mobile: full-width 우선, 높이 작게
- Desktop: auto-width, 높이 크게

**모달:**
- Mobile: Bottom Sheet (하단에서 슬라이드)
- Desktop: 중앙 모달

**타이포그래피:**
- Mobile: 작은 폰트 (공간 효율)
- Desktop: 큰 폰트 (가독성)

---

## 5. 그림자 & 효과

### 5.1 그림자 (Shadows)

```
shadows:
├── sm   # 미세한 그림자 (카드 hover)
├── md   # 중간 그림자 (카드 기본)
├── lg   # 큰 그림자 (모달)
└── xl   # 매우 큰 그림자 (드롭다운)
```

### 5.2 트랜지션 (Transitions)

```
transitions:
├── fast    # 빠른 전환 (0.1s) - hover, 버튼 클릭
├── normal  # 보통 전환 (0.2s) - 모달, 패널
└── slow    # 느린 전환 (0.3s) - 페이지 전환
```

**원칙:**
- 모든 애니메이션은 `ease-out` 사용
- 성능 최우선 (transform, opacity만 애니메이션)

---

## 6. 실제 값 참조

### 6.1 색상 토큰 값

**실제 색상 코드는 다음 파일을 참조하세요:**

```
tailwind.config.js    # Tailwind 색상 정의
app/globals.css       # CSS 변수 (:root)
```

### 6.2 간격/반경 값

```
tailwind.config.js    # spacing, borderRadius 설정
```

### 6.3 반응형 브레이크포인트

```
tailwind.config.js    # screens 설정
```

### 6.4 그림자/효과

```
tailwind.config.js    # boxShadow, transitionDuration
```

---

## 사용 예시

### ✅ 좋은 예 (구조 참조)

```typescript
// 색상 계층 이해하고 사용
<Card bg="bg.secondary" border="border.subtle" />
<Button bg="accent.primary" hoverBg="accent.primaryHover" />
```

### ❌ 나쁜 예 (하드코딩)

```typescript
// 실제 값 하드코딩하지 말 것
<Card style={{ backgroundColor: "#1E1E1E" }} />
<Button style={{ color: "#8B5CF6" }} />
```

**대신:** `tailwind.config.js` 또는 테마 객체 사용

---

_— End of Document —_

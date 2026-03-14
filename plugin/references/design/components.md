# Design System - Component Specifications

공통 UI 컴포넌트의 구조와 규칙을 정의합니다. **실제 구현은 `components/` 폴더를 참조하세요.**

---

## 목차

1. [컴포넌트 목록](#1-컴포넌트-목록)
2. [Button](#2-button)
3. [Badge](#3-badge)
4. [Card](#4-card)
5. [Input / TextArea](#5-input--textarea)
6. [Toggle](#6-toggle)
7. [실제 구현 참조](#7-실제-구현-참조)

---

## 1. 컴포넌트 목록

### 1.1 공통 컴포넌트 (웹/모바일)

| 컴포넌트    | 주요 사용처                     |
| ----------- | ------------------------------- |
| Button      | CTA, 액션                       |
| Card        | 문제 카드, 메모 카드, 설정 그룹 |
| Badge       | 난이도, 상태                    |
| Input       | 검색, 입력                      |
| TextArea    | 메모 에디터                     |
| Toggle      | 설정 스위치                     |
| TabBar      | 필터 탭                         |
| ProgressBar | 통계                            |
| Avatar      | 프로필                          |
| Checkbox    | 완료 체크                       |
| Header      | 상단 헤더                       |

### 1.2 플랫폼별 컴포넌트

| 컴포넌트  | 플랫폼 | 사용처          |
| --------- | ------ | --------------- |
| BottomNav | 모바일 | 하단 네비게이션 |
| Sidebar   | 웹     | 사이드바        |

---

## 2. Button

### 2.1 필수 Variants

```
Button Variants:
├── primary      # 주요 액션 (CTA)
├── secondary    # 보조 액션
├── outline      # 테두리만
├── ghost        # 투명 배경
└── danger       # 위험한 액션 (삭제 등)
```

### 2.2 필수 Sizes

```
Button Sizes:
├── sm   # 작은 버튼 (취소, 보조)
├── md   # 중간 버튼 (기본)
└── lg   # 큰 버튼 (CTA)
```

### 2.3 필수 States

```
Button States:
├── default   # 기본 상태
├── hover     # 마우스 오버 (웹)
├── active    # 클릭/터치 중
├── disabled  # 비활성화
└── loading   # 로딩 중 (선택)
```

### 2.4 컬러 매핑

- **primary**: `accent.primary` 사용
- **secondary**: `bg.secondary` + `border.default`
- **ghost**: 투명 배경 + `accent.primary` 텍스트
- **danger**: `semantic.error` 사용

---

## 3. Badge

### 3.1 필수 Variants (난이도)

```
Badge Variants (Status):
├── easy     # 쉬움
├── medium   # 보통
└── hard     # 어려움
```

### 3.2 컬러 매핑

- **easy**: `status.easy` + `status.easyBg`
- **medium**: `status.medium` + `status.mediumBg`
- **hard**: `status.hard` + `status.hardBg`

### 3.3 스타일 규칙

- 작은 `border-radius` (태그 느낌)
- 작은 폰트 (메타 정보)
- 패딩 작게 (compact)

---

## 4. Card

### 4.1 필수 States

```
Card States:
├── default     # 기본 상태
├── hover       # 마우스 오버 (웹, 클릭 가능한 경우)
└── active      # 선택됨 (선택)
```

### 4.2 컬러 매핑

- **default**: `bg.secondary`
- **hover**: `bg.tertiary`
- **border**: `border.subtle` (선택)

### 4.3 스타일 규칙

- 중간 `border-radius` (부드러운 느낌)
- 충분한 패딩 (가독성)
- 그림자 없음 (미니멀)

---

## 5. Input / TextArea

### 5.1 필수 States

```
Input States:
├── default     # 기본 상태
├── focus       # 포커스 (입력 중)
├── error       # 에러 상태
└── disabled    # 비활성화
```

### 5.2 컬러 매핑

- **default**: `bg.secondary` + `border.default`
- **focus**: `accent.primary` border
- **error**: `semantic.error` border
- **placeholder**: `text.muted`

### 5.3 스타일 규칙

- 작은 `border-radius` (입력 필드 느낌)
- 충분한 패딩 (터치 영역)
- 본문 폰트 크기 (16px - iOS 줌 방지)

---

## 6. Toggle

### 6.1 필수 States

```
Toggle States:
├── off      # 꺼짐
└── on       # 켜짐
```

### 6.2 컬러 매핑

- **off**: `border.default` track
- **on**: `accent.primary` track
- **thumb**: 항상 흰색

### 6.3 스타일 규칙

- iOS 스타일 스위치
- 애니메이션: 0.2s ease-out
- 터치 영역 충분히 (44px+)

---

## 7. 실제 구현 참조

### 7.1 컴포넌트 코드

**실제 컴포넌트 구현은 다음 폴더를 참조하세요:**

```
components/ui/button/       # Button 구현
components/ui/badge/        # Badge 구현
components/ui/card/         # Card 구현
components/ui/input/        # Input 구현
components/ui/toggle/       # Toggle 구현
```

### 7.2 사용 예시

```typescript
// ✅ Variants 사용
<Button variant="primary" size="lg">Sign In</Button>
<Badge variant="easy">Easy</Badge>
<Card hover>...</Card>

// ❌ 하드코딩 금지
<button style={{ backgroundColor: "#8B5CF6" }}>Sign In</button>
```

### 7.3 컴포넌트 Props 규칙

**필수 Props:**
- `variant`: 컴포넌트 스타일 (primary, secondary, ...)
- `size`: 크기 (sm, md, lg)

**선택 Props:**
- `disabled`: 비활성화 여부
- `loading`: 로딩 상태 (Button)
- `hover`: Hover 효과 활성화 (Card)

---

_— End of Document —_

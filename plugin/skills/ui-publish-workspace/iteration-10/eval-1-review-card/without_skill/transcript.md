# ReviewCard 컴포넌트 구현 트랜스크립트

## 태스크
ReviewCard 컴포넌트를 프로젝트 컨벤션에 맞게 추가 (without skill guidance)

## 요구사항
- 사용자 아바타
- 별점 (1~5)
- 리뷰 본문
- 작성일

---

## 분석 단계

### 읽은 파일들
1. `package.json` - Next.js 16, React 19, Tailwind CSS v4 사용 확인
2. `app/showcase/page.tsx` - 기존 컴포넌트 사용 패턴 확인
3. `app/globals.css` - CSS 변수 및 Tailwind import 확인
4. `components/EmptyState.tsx` - 프로젝트 컨벤션 확인
5. `components/ReviewCard.tsx` - 이미 존재하는 파일 발견
6. `components/ProductCard.tsx` - 추가 컨벤션 참고
7. `components/StatsCard.tsx` - 추가 컨벤션 참고

### 프로젝트 컨벤션 파악
- `"use client"` 디렉티브 사용
- Props 인터페이스는 named export
- 컴포넌트는 default export
- Tailwind CSS + zinc 색상 팔레트 + dark mode 지원
- `data-testid` 속성 포함
- 컴포넌트 위치: `components/` 루트 또는 subdirectory

---

## 구현

### ReviewCard.tsx 상태
파일이 이미 완전히 구현되어 있었음:
- `"use client"` 디렉티브
- `ReviewCardProps` interface (named export)
- 기본 export function `ReviewCard`
- Props: `avatarUrl?`, `authorName`, `rating: 1|2|3|4|5`, `body`, `createdAt`
- 아바타: URL 있으면 `<img>`, 없으면 이니셜 fallback
- 별점: SVG 아이콘 5개 (amber-400 / zinc-300)
- 리뷰 본문, 작성일 포함
- `data-testid` 속성: `review-card`, `review-card-avatar`, `review-card-author`, `review-card-rating`, `review-card-body`, `review-card-date`
- dark mode 지원

### showcase/page.tsx 수정
ReviewCard를 showcase 페이지에 추가:
- import 추가: `import ReviewCard from "@/components/ReviewCard";`
- 새 section 추가: 3개의 ReviewCard 예시 (별점 5, 3, 1)
- 아바타 URL 있는 케이스와 없는 케이스 모두 포함

---

## 타입체크 결과

```
기존 에러만 존재 (ReviewCard와 무관):
- hooks/apis/queries/useFetchOrder/__tests__/index.test.tsx - 테스트 의존성 누락
- playwright.config.ts - Playwright 설정 타입 오류

ReviewCard 컴포넌트 관련 타입 에러: 없음
```

---

## 생성/수정된 파일

| 파일 | 상태 |
|------|------|
| `components/ReviewCard.tsx` | 이미 존재 (변경 없음) |
| `app/showcase/page.tsx` | 수정 - ReviewCard 섹션 추가 |

---

## 컴포넌트 인터페이스

```tsx
export interface ReviewCardProps {
  avatarUrl?: string;       // 아바타 이미지 URL (선택)
  authorName: string;       // 작성자 이름
  rating: 1 | 2 | 3 | 4 | 5; // 별점
  body: string;             // 리뷰 본문
  createdAt: string;        // 작성일
}
```

## 사용 예시

```tsx
<ReviewCard
  authorName="김지수"
  rating={5}
  body="정말 훌륭한 제품입니다."
  createdAt="2024-03-10"
/>

<ReviewCard
  avatarUrl="https://example.com/avatar.jpg"
  authorName="이민준"
  rating={3}
  body="전반적으로 괜찮습니다."
  createdAt="2024-02-28"
/>
```

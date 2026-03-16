# product-card with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 파일 미생성
- 계획 기반 평가

## 참조된 디자인 시스템 파일
- SKILL.md 읽기 완료 (ui-publish 지침 확인)
- theme-tokens.md 참조 (색상, 그림자, border-radius 토큰)
- font.md 참조 (Pretendard 폰트 패밀리)
- components.md 참조 (카드 컴포넌트 패턴)

## 계획된 파일 구조
```
components/
  ProductCard.tsx
```

## 계획된 컴포넌트 구조
- 카드 컨테이너: `<div>` (rounded-xl, shadow-md, overflow-hidden)
- 이미지 영역: `<img>` (w-full, aspect-square, object-cover)
- 상품명: `<h3>` (text-lg, font-semibold, text-primary)
- 가격: `<p>` (text-xl, font-bold, text-accent)
- Props: image, name, price, className

## 주요 특징
- SKILL.md 읽고 layout-first, visual-only 원칙 준수
- Tailwind CSS 유틸리티 클래스만 사용 (인라인 스타일 없음)
- Pretendard 폰트 적용 (`font-pretendard`)
- theme-tokens.md 색상/그림자 토큰 활용
- useState/useEffect 미사용 — 순수 프레젠테이션 컴포넌트
- default export 사용
- components.md 카드 패턴 참조하여 일관된 디자인

# ui-publish 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/ui-publish/SKILL.md

## Pretendard 폰트
- Pretendard Variable 사용, Tailwind fontFamily.sans 설정

## theme-tokens.md 참조
- 색상/간격 토큰 먼저 읽기
- bg-sidebar, border-border 등 토큰 기반 클래스

## Tailwind CSS
- 유틸리티 클래스로만 스타일링, 인라인 스타일 금지

## no-logic 규칙 적용
- useState, useEffect, fetch 사용 금지
- 순수 프레젠테이셔널 컴포넌트

## layout-only props
- ReactNode 슬롯 (children, sidebar, header)
- className만 허용, 데이터/콜백 props 없음

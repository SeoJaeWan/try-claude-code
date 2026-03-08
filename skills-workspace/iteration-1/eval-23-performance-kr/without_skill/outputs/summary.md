# performance 평가 (Korean prompt, without_skill)

## 발견된 7개 성능 이슈
1. API 쿼리 훅에 staleTime/gcTime 미설정 (High)
2. 훅이 매 렌더마다 새 객체 생성 (High)
3. detect_changes.mjs 동기 파일 I/O (Medium)
4. Array.includes() O(n*m) 복잡도 (Medium)
5. resolveHooksRoot 캐싱 없음 (Low)
6. 컴포넌트 템플릿에 React.memo 옵션 없음 (Low)
7. structure.mjs 불필요한 spread (Low)

## 참고
웹 성능이 아닌 일반 코드 효율성 관점의 분석

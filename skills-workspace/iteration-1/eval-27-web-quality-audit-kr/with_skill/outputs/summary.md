# web-quality-audit 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/web-quality-audit/SKILL.md

## 5개 하위 영역 순차 실행
| 순서 | 영역 | 색상 | 항목 수 |
|------|------|------|---------|
| 1 | Accessibility (KWCAG2.2) | #6c8ebf | 33 |
| 2 | Best Practices | #82c882 | 14 |
| 3 | SEO | #f0a830 | 10 |
| 4 | Performance | #e05c5c | 11 |
| 5 | Core Web Vitals | #9b59b6 | 11 |
| **합계** | | | **79** |

## 통합 HTML+CSV 리포트
- 5-card 요약 그리드 (색상 코딩)
- badge 클래스: badge-pass(O), badge-fail(X), badge-partial, badge-na, badge-unknown
- fix guide 섹션 (X 항목만)
- CSV: 영역,코드,항목명,결과,판정방식,발견된 문제,수정 가이드

## 출력 경로
.claude/try-claude/reports/web-quality/YYYYMMDD-HHmm/report.html, report.csv

# 종합 웹 품질 검토 시뮬레이션 (with_skill)

## 스킬: web-quality-audit

### Step 1. 검토 범위
변경 파일: `.claude/settings.local.json`, `skills/accessibility-review/SKILL.md`, `skills/web-quality-audit/SKILL.md`
웹 파일 필터 적용 결과: **해당 웹 파일 없음** (모두 JSON/Markdown)

### Step 2-6. 5개 영역 검토

#### A. 접근성 (KWCAG2.2) — accessibility-review 스킬 위임
- 33개 KWCAG 항목 + 7개 시맨틱 HTML 항목
- 결과: 모든 항목 `-` (N/A) — 웹 코드 없음

#### B. Best Practices — best-practices 스킬 위임
- BP-01 ~ BP-14 (14개 항목)
- 결과: 모든 항목 `-` (N/A) — 웹 코드 없음

#### C. SEO — seo 스킬 위임
- SEO-01 ~ SEO-10 (10개 항목)
- 결과: 모든 항목 `-` (N/A) — 웹 코드 없음

#### D. Performance — performance 스킬 위임
- PERF-01 ~ PERF-11 (11개 항목)
- 결과: 모든 항목 `-` (N/A) — 웹 코드 없음

#### E. Core Web Vitals — core-web-vitals 스킬 위임
- CWV-01 ~ CWV-11 (11개 항목)
- 결과: 모든 항목 `-` (N/A) — 웹 코드 없음

### Step 7. 통합 리포트
- HTML + CSV 리포트 생성 (시뮬레이션)
- 경로: `.claude/try-claude/reports/web-quality/YYYYMMDD-HHmm/`

### Step 8. 검증
- 5개 영역 모두 수집 완료
- 웹 파일이 없어 모든 항목 N/A
- 5-area summary grid: 모든 영역 N/A

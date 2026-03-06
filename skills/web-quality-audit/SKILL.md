---
name: web-quality-audit
description: Comprehensive web quality review across 5 areas: accessibility (KWCAG2.2), best-practices, SEO, performance, and Core Web Vitals. Generates unified HTML + CSV reports. Use when asked to "web quality audit", "종합 품질 검토", "웹 품질 감사", "전체 품질 리뷰", "접근성 검토", "a11y 체크", "웹표준 확인".
model: opus
context: fork
agent: web-quality-reviewer
---

<Skill_Guide>
<Purpose>
After completing work, performs a comprehensive review of changed web code
across five quality areas — Accessibility (KWCAG2.2), Best Practices, SEO,
Performance, and Core Web Vitals — and generates a single unified HTML + CSV
report. The accessibility area is fully delegated to the accessibility-review
skill; the remaining four areas delegate to their respective individual skills.
</Purpose>

<Instructions>

## 내부 실행 순서

1. accessibility-review 스킬 실행
2. best-practices 스킬 실행
3. seo 스킬 실행
4. performance 스킬 실행
5. core-web-vitals 스킬 실행

진입점: 항상 web-quality-reviewer 에이전트를 통해 실행

---

## Step 1. Determine Review Scope

```bash
git diff --name-only HEAD
```

- Filter files: `*.html`, `*.htm`, `*.tsx`, `*.jsx`, `*.ts`, `*.js`, `*.vue`, `*.svelte`, `*.css`, `*.scss`
- Changed files exist → use as review targets
- No changed files → AskUserQuestion: "검토할 파일이나 작업 내용을 알려주세요."
- User specifies scope explicitly → use that instead

---

## Step 2. Accessibility Review — Delegate to accessibility-review skill

Delegate KWCAG2.2 33-item accessibility review to the `accessibility-review` skill.

Reference: `<plugin-root>/skills/accessibility-review/SKILL.md`

Delegation instructions:
- Step 1 (scope) is already determined — pass the same file set
- Steps 2–5: KWCAG2.2 33-item code review + Playwright automated checks (if `playwright.config.ts` exists)
- Step 6 (individual report generation) is skipped — collect only result data (O/X/△/-/판정불가 per item)

Collected results → **Section A: Accessibility**

---

## Step 3. Best Practices Review — Delegate to best-practices skill

Execute the 'best-practices' skill Step 3 (Static Analysis) against the same file set determined in Step 1.
Collect the result row for each BP-code item.
Collected results → Section B: Best Practices

---

## Step 4. SEO Review — Delegate to seo skill

Execute the 'seo' skill Step 3 (Static Analysis) against the same file set determined in Step 1.
Collect the result row for each SEO-code item.
Collected results → Section C: SEO

---

## Step 5. Performance Review — Delegate to performance skill

Execute the 'performance' skill Step 3 (Static Analysis) against the same file set determined in Step 1.
Collect the result row for each PERF-code item.
Collected results → Section D: Performance

---

## Step 6. Core Web Vitals Review — Delegate to core-web-vitals skill

Execute the 'core-web-vitals' skill Step 3 (Static Analysis) against the same file set determined in Step 1.
Collect the result row for each CWV-code item.
Collected results → Section E: Core Web Vitals

---

## Step 7. Generate Unified Report

Collect results from all 5 sections (A–E) and generate a single HTML + CSV file.

```bash
# 타임스탬프 계산
TIMESTAMP=$(date +%Y%m%d-%H%M)
REPORT_DIR=".claude/try-claude/reports/web-quality/${TIMESTAMP}"
mkdir -p "${REPORT_DIR}"

# Save path
${REPORT_DIR}/report.html
${REPORT_DIR}/report.csv
```

동일 분 내 재실행 시 폴더 재사용 허용 (suffix 불필요).

---

## Step 8. Verify Results

1. Confirm all five sections (A–E) have been collected — none may be skipped.
2. Confirm both `.claude/try-claude/reports/web-quality/YYYYMMDD-HHmm/report.html` and `.claude/try-claude/reports/web-quality/YYYYMMDD-HHmm/report.csv` have been written.
3. Verify the HTML report contains all five section headers (A–E).
4. Verify the CSV contains rows for all five areas.
5. If any section was skipped or failed, report the reason and do not claim completion.

</Instructions>

<Output_Format>

Read `references/output-format.md` for full HTML + CSV report templates.

Key requirements:
- 5-area summary grid (접근성/BP/SEO/Performance/CWV) with color-coded cards
- Badge classes: `badge-pass` (O), `badge-fail` (X), `badge-partial` (△), `badge-na` (-), `badge-unknown` (판정불가)
- Section headers color-coded: a11y=#6c8ebf, bp=#82c882, seo=#f0a830, perf=#e05c5c, cwv=#9b59b6
- Fix guide section: only X items, with code examples
- CSV header: `영역,코드,항목명,결과,판정방식,발견된 문제,수정 가이드`
- Language: Korean / Style: inline CSS only

</Output_Format>
</Skill_Guide>


---
name: core-web-vitals
description: Optimize Core Web Vitals (LCP, INP, CLS) for better page experience and search ranking. web-quality-reviewer를 통해 실행됩니다. 직접 트리거 불가.
model: sonnet
---

<Skill_Guide>
<Purpose>
Reviews changed web code for Core Web Vitals anti-patterns that negatively affect
LCP (Largest Contentful Paint), INP (Interaction to Next Paint), and CLS
(Cumulative Layout Shift) scores. Runs as a standalone review and outputs a
markdown checklist result.
</Purpose>

<Instructions>

## Reference Document

Must read before review:

  references/guide.md (relative to this skill directory)

Contains: LCP optimization patterns, INP optimization patterns, CLS prevention patterns, PerformanceObserver debugging, framework-specific quick fixes.

---

## Step 1. Determine Review Scope

```bash
git diff --name-only HEAD
```

- Filter web files: `*.html`, `*.htm`, `*.tsx`, `*.jsx`, `*.ts`, `*.js`, `*.vue`, `*.svelte`, `*.css`, `*.scss`
- Changed files exist → use as review targets
- No changed files → AskUserQuestion: "검토할 파일이나 작업 내용을 알려주세요."
- User specifies scope explicitly → use that instead

---

## Step 2. Load Reference Guide

Read `references/guide.md (relative to this skill directory)` in full before proceeding.

---

## Step 3. Static Analysis

Read each target file. Evaluate all items below.

### LCP — Largest Contentful Paint (target ≤ 2.5s)

| Code | Item | Detection Pattern |
|------|------|------------------|
| CWV-01 | LCP 요소 초기 HTML에 존재 | hero/LCP image rendered via `useEffect(() => { fetch(` — JS-dependent |
| CWV-02 | fetchpriority="high" 설정 | LCP image missing `fetchpriority="high"` attribute |
| CWV-03 | 폰트 렌더 차단 없음 | `@font-face` with `font-display: block` |

### INP — Interaction to Next Paint (target ≤ 200ms)

| Code | Item | Detection Pattern |
|------|------|------------------|
| CWV-04 | 이벤트 핸들러 즉각 시각 피드백 | click handlers without immediate visual state change |
| CWV-05 | 무거운 연산 지연 처리 | synchronous heavy loops; absence of `requestIdleCallback` or Web Worker |
| CWV-06 | React memo 활용 | expensive components without `React.memo()` or `useMemo` |

### CLS — Cumulative Layout Shift (target ≤ 0.1)

| Code | Item | Detection Pattern |
|------|------|------------------|
| CWV-07 | img width/height 또는 aspect-ratio | `<img` without both `width`+`height` or `aspect-ratio` CSS |
| CWV-08 | 뷰포트 위 동적 삽입 금지 | `prepend(`, `insertBefore(` above viewport |
| CWV-09 | 애니메이션 transform/opacity만 | CSS `transition: height\|width\|top\|left\|margin\|padding` |
| CWV-10 | 폰트 교체 레이아웃 시프트 방지 | `font-display: block` causing FOIT/layout shift |
| CWV-11 | 동적 콘텐츠 공간 예약 | `<iframe>`, `<video>`, ad slots without reserved `min-height` |

---

## Step 4. Report Results

Present findings as a markdown checklist table:

| Code | Metric | Item | Result | Issue Found |
|------|--------|------|--------|-------------|

Result values: ✅ Pass / ❌ Fail / ⚠️ Advisory / — N/A

---

## Step 5. Verify Results

1. Confirm every item (CWV-01 through CWV-11) has been evaluated — none skipped.
2. Every ❌ must include: filename, line number or CSS property, concrete issue description.
3. Every ⚠️ must include a specific improvement recommendation.
4. If any item could not be evaluated, mark — and state reason.
5. If zero ❌ items found, state explicitly: "All evaluated items pass."

</Instructions>

<Output_Format>
## Core Web Vitals 검토 결과 — {YYYY-MM-DD}

검토 파일: {파일 목록}

| 코드 | 지표 | 항목 | 결과 | 발견된 문제 |
|------|------|------|------|------------|
| CWV-01 | LCP | LCP 요소 초기 HTML 존재 | ✅/❌/⚠️/— | |
| CWV-02 | LCP | fetchpriority="high" | ✅/❌/⚠️/— | |
| CWV-03 | LCP | 폰트 렌더 차단 없음 | ✅/❌/⚠️/— | |
| CWV-04 | INP | 이벤트 핸들러 즉각 피드백 | ✅/❌/⚠️/— | |
| CWV-05 | INP | 무거운 연산 지연 처리 | ✅/❌/⚠️/— | |
| CWV-06 | INP | React memo 활용 | ✅/❌/⚠️/— | |
| CWV-07 | CLS | img width/height | ✅/❌/⚠️/— | |
| CWV-08 | CLS | 뷰포트 위 동적 삽입 금지 | ✅/❌/⚠️/— | |
| CWV-09 | CLS | 애니메이션 transform/opacity | ✅/❌/⚠️/— | |
| CWV-10 | CLS | 폰트 교체 시프트 방지 | ✅/❌/⚠️/— | |
| CWV-11 | CLS | 동적 콘텐츠 공간 예약 | ✅/❌/⚠️/— | |

### 수정 가이드

{❌ 항목별 구체적 수정 방법}
</Output_Format>
</Skill_Guide>

---
name: performance
description: Optimize web performance for faster loading and better user experience. web-quality-reviewer를 통해 실행됩니다. 직접 트리거 불가.
model: sonnet
---

<Skill_Guide>
<Purpose>
Reviews changed web code for loading performance issues covering the critical
rendering path, image optimization, JavaScript efficiency, and font loading.
Runs as a standalone review and outputs a markdown checklist result.
</Purpose>

<Instructions>

## Reference Document

Must read before review:

  references/guide.md (relative to this skill directory)

Contains: Performance budget, Critical rendering path, Image optimization, Font optimization, Caching strategy, Runtime performance patterns.

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

### Critical Rendering Path

| Code | Item | Detection Pattern |
|------|------|------------------|
| PERF-01 | render-blocking script 없음 | `<script src=` without `defer`/`async`/`type="module"` |
| PERF-02 | LCP 이미지 fetchpriority + preload | `fetchpriority="high"` and `<link rel="preload" as="image"` |
| PERF-03 | Critical CSS 처리 | render-blocking `<link rel="stylesheet"` without `media` attribute |

### Image Optimization

| Code | Item | Detection Pattern |
|------|------|------------------|
| PERF-04 | width/height 속성 지정 (CLS 방지) | `<img` without both `width` and `height` attributes |
| PERF-05 | loading="lazy" (below-fold) | `<img` without `loading="lazy"` for non-LCP images |
| PERF-06 | 현대 이미지 포맷 (WebP/AVIF) | `<picture>` element, `.webp`, `.avif` extensions |

### JavaScript

| Code | Item | Detection Pattern |
|------|------|------------------|
| PERF-07 | 코드 스플리팅 | dynamic `import(` expressions present |
| PERF-08 | 트리 쉐이킹 패턴 | `import _ from 'lodash'` or similar whole-library imports |
| PERF-09 | 레이아웃 스래싱 없음 | mixed read/write of layout properties in loops |

### Font

| Code | Item | Detection Pattern |
|------|------|------------------|
| PERF-10 | font-display 설정 | `@font-face` with `font-display: swap\|optional\|fallback` |
| PERF-11 | 중요 폰트 preload | `<link rel="preload" as="font"` for critical fonts |

---

## Step 4. Report Results

Present findings as a markdown checklist table:

| Code | Area | Item | Result | Issue Found |
|------|------|------|--------|-------------|

Result values: ✅ Pass / ❌ Fail / ⚠️ Advisory / — N/A

---

## Step 5. Verify Results

1. Confirm every item (PERF-01 through PERF-11) has been evaluated — none skipped.
2. Every ❌ must include: filename, line number or code pattern, concrete issue description.
3. Every ⚠️ must include a specific improvement recommendation.
4. If any item could not be evaluated, mark — and state reason.
5. If zero ❌ items found, state explicitly: "All evaluated items pass."

</Instructions>

<Output_Format>
## Performance 검토 결과 — {YYYY-MM-DD}

검토 파일: {파일 목록}

| 코드 | 영역 | 항목 | 결과 | 발견된 문제 |
|------|------|------|------|------------|
| PERF-01 | CRP | render-blocking script 없음 | ✅/❌/⚠️/— | |
| PERF-02 | CRP | LCP fetchpriority + preload | ✅/❌/⚠️/— | |
| PERF-03 | CRP | Critical CSS 처리 | ✅/❌/⚠️/— | |
| PERF-04 | 이미지 | width/height 지정 | ✅/❌/⚠️/— | |
| PERF-05 | 이미지 | loading="lazy" | ✅/❌/⚠️/— | |
| PERF-06 | 이미지 | WebP/AVIF 포맷 | ✅/❌/⚠️/— | |
| PERF-07 | JS | 코드 스플리팅 | ✅/❌/⚠️/— | |
| PERF-08 | JS | 트리 쉐이킹 패턴 | ✅/❌/⚠️/— | |
| PERF-09 | JS | 레이아웃 스래싱 없음 | ✅/❌/⚠️/— | |
| PERF-10 | 폰트 | font-display 설정 | ✅/❌/⚠️/— | |
| PERF-11 | 폰트 | 중요 폰트 preload | ✅/❌/⚠️/— | |

### 수정 가이드

{❌ 항목별 구체적 수정 방법}
</Output_Format>
</Skill_Guide>

---
name: seo
description: Optimize for search engine visibility and ranking. web-quality-reviewer를 통해 실행됩니다. 직접 트리거 불가.
model: sonnet
---

<Skill_Guide>
<Purpose>
Reviews changed web code for search engine optimization issues covering
crawlability, on-page elements, and structured data. Runs as a standalone
review and outputs a markdown checklist result.
</Purpose>

<Instructions>

## Reference Document

Must read before review:

  references/guide.md (relative to this skill directory)

Contains: Technical SEO, On-page SEO, Structured data templates, Mobile SEO, International SEO patterns.

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

### Critical

| Code | Item | Detection Pattern |
|------|------|------------------|
| SEO-01 | noindex 없음 | `<meta name="robots" content="noindex"` on important pages |
| SEO-02 | title 태그 존재하고 고유 (50-60자) | `<title>` presence and character length |
| SEO-03 | 페이지당 h1 하나 | count `<h1>` tags (must be exactly 1) |
| SEO-04 | HTTPS 사용 | resource URLs use `https://` |

### High Priority

| Code | Item | Detection Pattern |
|------|------|------------------|
| SEO-05 | meta description 존재 (150-160자) | `<meta name="description"` presence and length |
| SEO-06 | canonical URL 설정 | `<link rel="canonical"` present |
| SEO-07 | 구조화 데이터 (JSON-LD) | `<script type="application/ld+json"` present |
| SEO-08 | 이미지 alt 텍스트 | `<img` without `alt=` attribute |

### Medium Priority

| Code | Item | Detection Pattern |
|------|------|------------------|
| SEO-09 | 서술적 URL 구조 | minimal query parameters in href |
| SEO-10 | 내부 링크 anchor text | "click here", "여기를 클릭", "read more" patterns in `<a>` |

---

## Step 4. Report Results

Present findings as a markdown checklist table:

| Code | Priority | Item | Result | Issue Found |
|------|----------|------|--------|-------------|

Result values: ✅ Pass / ❌ Fail / ⚠️ Advisory / — N/A

---

## Step 5. Verify Results

1. Confirm every item (SEO-01 through SEO-10) has been evaluated — none skipped.
2. Every ❌ must include: filename, line number or element, concrete issue description.
3. Every ⚠️ must include a specific improvement recommendation.
4. If any item could not be evaluated, mark — and state reason.
5. If zero ❌ items found, state explicitly: "All evaluated items pass."

</Instructions>

<Output_Format>
## SEO 검토 결과 — {YYYY-MM-DD}

검토 파일: {파일 목록}

| 코드 | 우선순위 | 항목 | 결과 | 발견된 문제 |
|------|---------|------|------|------------|
| SEO-01 | Critical | noindex 없음 | ✅/❌/⚠️/— | |
| SEO-02 | Critical | title 태그 존재하고 고유 | ✅/❌/⚠️/— | |
| SEO-03 | Critical | h1 하나 | ✅/❌/⚠️/— | |
| SEO-04 | Critical | HTTPS 사용 | ✅/❌/⚠️/— | |
| SEO-05 | High | meta description | ✅/❌/⚠️/— | |
| SEO-06 | High | canonical URL | ✅/❌/⚠️/— | |
| SEO-07 | High | 구조화 데이터 (JSON-LD) | ✅/❌/⚠️/— | |
| SEO-08 | High | 이미지 alt 텍스트 | ✅/❌/⚠️/— | |
| SEO-09 | Medium | 서술적 URL 구조 | ✅/❌/⚠️/— | |
| SEO-10 | Medium | 내부 링크 anchor text | ✅/❌/⚠️/— | |

### 수정 가이드

{❌ 항목별 구체적 수정 방법}
</Output_Format>
</Skill_Guide>

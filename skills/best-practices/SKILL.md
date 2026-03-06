---
name: best-practices
description: Apply modern web development best practices for security, compatibility, and code quality. web-quality-reviewer를 통해 실행됩니다. 직접 트리거 불가.
model: sonnet
---

<Skill_Guide>
<Purpose>
Reviews changed web code against modern best-practice standards covering security,
browser compatibility, and code quality. Runs as a standalone review and outputs
a markdown checklist result.
</Purpose>

<Instructions>

## Reference Document

Must read before review:

  references/guide.md (relative to this skill directory)

Contains: Security checklist, Compatibility checklist, Code Quality checklist, UX checklist with code patterns and examples.

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

### Security

| Code | Item | Detection Pattern |
|------|------|------------------|
| BP-01 | HTTPS / mixed content 없음 | `http://` in src/href attributes |
| BP-02 | 취약 의존성 없음 | `npm audit` environment availability |
| BP-03 | CSP 헤더 설정 | `Content-Security-Policy` meta tag or header |
| BP-04 | 보안 헤더 존재 | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` |
| BP-05 | innerHTML 미검증 사용자 입력 없음 | `innerHTML =` pattern without sanitization |

### Compatibility

| Code | Item | Detection Pattern |
|------|------|------------------|
| BP-06 | DOCTYPE html 선언 | `<!DOCTYPE html>` present |
| BP-07 | charset UTF-8 head 최상단 | `<meta charset` position in `<head>` |
| BP-08 | viewport meta 태그 | `<meta name="viewport"` present |
| BP-09 | deprecated API 미사용 | `document.write(`, synchronous XHR |
| BP-10 | passive listener | `addEventListener('scroll'\|'touchstart'\|'wheel'` without `{passive: true}` |

### Code Quality

| Code | Item | Detection Pattern |
|------|------|------------------|
| BP-11 | 콘솔 에러 없음 | `console.error(` patterns |
| BP-12 | 중복 id 없음 | duplicate `id="..."` values across files |
| BP-13 | 시맨틱 HTML 요소 | `<header>`, `<main>`, `<nav>`, `<footer>`, `<article>` usage |
| BP-14 | 적절한 에러 처리 | try/catch, ErrorBoundary patterns |

---

## Step 4. Report Results

Present findings as a markdown checklist table:

| Code | Area | Item | Result | Issue Found |
|------|------|------|--------|-------------|

Result values: ✅ Pass / ❌ Fail / ⚠️ Advisory / — N/A

---

## Step 5. Verify Results

1. Confirm every item (BP-01 through BP-14) has been evaluated — none skipped.
2. Every ❌ must include: filename, line number or code pattern, concrete issue description.
3. Every ⚠️ must include a specific improvement recommendation.
4. If any item could not be evaluated (e.g. no package.json for BP-02), mark — and state reason.
5. If zero ❌ items found, state explicitly: "All evaluated items pass."

</Instructions>

<Output_Format>
## Best Practices 검토 결과 — {YYYY-MM-DD}

검토 파일: {파일 목록}

| 코드 | 영역 | 항목 | 결과 | 발견된 문제 |
|------|------|------|------|------------|
| BP-01 | 보안 | HTTPS / mixed content 없음 | ✅/❌/⚠️/— | |
| BP-02 | 보안 | 취약 의존성 없음 | ✅/❌/⚠️/— | |
| BP-03 | 보안 | CSP 헤더 | ✅/❌/⚠️/— | |
| BP-04 | 보안 | 보안 헤더 | ✅/❌/⚠️/— | |
| BP-05 | 보안 | innerHTML 미검증 입력 | ✅/❌/⚠️/— | |
| BP-06 | 호환성 | DOCTYPE html | ✅/❌/⚠️/— | |
| BP-07 | 호환성 | charset UTF-8 최상단 | ✅/❌/⚠️/— | |
| BP-08 | 호환성 | viewport meta | ✅/❌/⚠️/— | |
| BP-09 | 호환성 | deprecated API 미사용 | ✅/❌/⚠️/— | |
| BP-10 | 호환성 | passive listener | ✅/❌/⚠️/— | |
| BP-11 | 코드품질 | 콘솔 에러 없음 | ✅/❌/⚠️/— | |
| BP-12 | 코드품질 | 중복 id 없음 | ✅/❌/⚠️/— | |
| BP-13 | 코드품질 | 시맨틱 HTML | ✅/❌/⚠️/— | |
| BP-14 | 코드품질 | 에러 처리 | ✅/❌/⚠️/— | |

### 수정 가이드

{❌ 항목별 구체적 수정 방법}
</Output_Format>
</Skill_Guide>

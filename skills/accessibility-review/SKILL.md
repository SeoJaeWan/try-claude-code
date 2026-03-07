---
name: accessibility-review
description: Web accessibility/web standards review. Reviews changed code against KWCAG2.2 and generates HTML + CSV reports. web-quality-reviewer를 통해 실행됩니다. 직접 트리거 불가.
model: opus
context: fork
agent: web-quality-reviewer
---

<Skill_Guide>
<Purpose>
After completing work, reviews changed web code against KWCAG2.2 (Korean Web Content Accessibility Guidelines) 33 items
and checks semantic HTML compliance, then generates HTML + CSV reports in Korean.

</Purpose>

<Instructions>

## Reference Document

Must read before review:

```
references/kwcag22.md
```

> Path resolved relative to this skill directory (`<plugin-root>/skills/accessibility-review/`).

- Full KWCAG2.2 33-item criteria table
- Each item includes: Compliance Criteria, Error Types, Details, Auto-Detection level, Detection Pattern, Fix Guide

---

## Step 1. Determine Review Scope

```bash
git diff --name-only HEAD
```

- Filter changed web files: `*.html`, `*.htm`, `*.tsx`, `*.jsx`, `*.ts`, `*.js`, `*.vue`, `*.svelte`, `*.css`, `*.scss`
- If changed web files exist → set those files as review targets
- If no changed web files → AskUserQuestion: "Please specify the files or content to review."
- If user specifies a file/scope explicitly → use that instead

---

## Step 2. Load Criteria

Read the full `references/kwcag22.md`.

Identify the **Auto-Detection** level for each of the 33 items:

- `O`: Directly detectable via code pattern → inspect actively
- `△`: Requires Claude's contextual judgment → read and evaluate
- `X`: Requires actual runtime/visual verification → present as checklist

---

## Step 3. Code Review (per file)

Read the target file with Read, then **evaluate all 33 items simultaneously for each file**.
(Minimize repeated file reads)

### Auto-Detection (O) — Direct code inspection

| Item                                     | Detection Pattern                                       |
| ---------------------------------------- | ------------------------------------------------------- |
| 1. Alternative Text (대체 텍스트)        | `<img>` missing alt, `<input type="image">` missing alt |
| 7. Auto-play (자동 재생)                 | `autoplay` attribute used without control               |
| 11. Focus Visible (초점 표시)            | `outline: none/0` without replacement style             |
| 17. Skip Navigation (반복 영역 건너뛰기) | Missing skip nav link (`href="#main"`)                  |
| 25. Language of Page (기본 언어 표시)    | `<html>` missing `lang` attribute                       |
| 29. Label in Name (레이블 제공)          | `<input>` missing `<label>`, `aria-label`, or `title`   |
| 32. Parsing (마크업 오류)                | Duplicate `id`, invalid tag nesting                     |

### Contextual Judgment (△) — Claude interprets code meaning

| Item                                        | Evaluation Criteria                                                   |
| ------------------------------------------- | --------------------------------------------------------------------- |
| 1. Alt Text Quality (대체 텍스트 품질)      | Does alt text actually describe the image content?                    |
| 3. Table Structure (표의 구성)              | Is `<table>` data or layout? Appropriate `<caption>`/`<th>`?          |
| 10. Keyboard Access (키보드 사용)           | Non-interactive elements like `<div onClick>` lacking keyboard access |
| 13. Character Key Shortcuts (문자 단축키)   | Single-character key event handlers present                           |
| 18. Page Title (제목 제공)                  | `<title>` content appropriateness, heading hierarchy logic            |
| 19. Link Purpose (링크 텍스트)              | "더보기", "클릭", empty links, etc.                                   |
| 22. Pointer Cancellation (포인터 입력 취소) | `onMouseDown` immediate execution pattern                             |
| 23. Label and Name (레이블과 네임)          | Icon buttons missing `aria-label`                                     |
| 26. Change on Request (사용자 요구 실행)    | `<select onChange>` auto-navigation pattern                           |
| 28. Error Suggestion (오류 정정)            | Form validation missing error messages and focus management           |
| 33. Web App Accessibility (웹앱 접근성)     | Custom components missing ARIA role/state                             |

### Manual Verification (X) — Present as checklist

| Item                                 | Verification Method                                  |
| ------------------------------------ | ---------------------------------------------------- |
| 2. Captions (자막)                   | Check `<video>` for `<track>` or separate transcript |
| 6. Use of Color (색 구분)            | Directly check if color alone conveys information    |
| 8. Contrast (명도 대비)              | Measure with CCA tool or browser DevTools            |
| 9. Visual Presentation (콘텐츠 구분) | Directly check visual design                         |
| 15. Pause, Stop, Hide (정지 기능)    | Check auto-cycling content behavior                  |
| 16. Seizures (깜박임)                | Check for content flashing 3–50 times per second     |
| 20. Location (참조 위치)             | Check if e-publication document                      |
| 27. Help (도움 정보)                 | Check consistency of help/FAQ location across pages  |

---

### Semantic HTML Review (Web Standards)

Beyond KWCAG2.2, check whether HTML elements are used semantically.

#### Directly Detectable Patterns

| Check Item                    | Detection Pattern                          | Recommended Alternative                     |
| ----------------------------- | ------------------------------------------ | ------------------------------------------- |
| Presentational tags           | `<b>`, `<i>` used alone                    | `<strong>`, `<em>` (when meaningful) or CSS |
| Paragraph via line breaks     | Consecutive `<br><br>`                     | `<p>` tag                                   |
| Inline wrapping block content | `<span>` directly containing block content | `<div>` or semantic element                 |

#### Context-Dependent Patterns

| Check Item            | Evaluation Criteria                                                                |
| --------------------- | ---------------------------------------------------------------------------------- |
| Missing landmarks     | All `<div>` with no `<header>`, `<main>`, `<footer>`, `<nav>`                      |
| Section structure     | Independent content blocks using only `<div>` instead of `<article>` / `<section>` |
| Complementary content | Sidebar/related links area not using `<aside>`                                     |
| Interactive elements  | Clickable `<div>`/`<span>` → can it be replaced with `<button>` or `<a>`?          |
| List structure        | Repeated items as consecutive `<div>` → `<ul>`/`<ol>` + `<li>` recommended         |
| Form grouping         | `<div>`-wrapped form element group → `<fieldset>` + `<legend>` recommended         |
| Quotations            | Quote text not using `<blockquote>` / `<q>`                                        |
| Time/Date             | Date/time display not using `<time datetime="...">`                                |

> **Judgment rule:** Plain layout divs are allowed. Flag as △ only when a **semantically clear region** omits an appropriate semantic element.

---

## Step 4. Playwright Automated Verification

### 4-1. Detect Playwright Environment

Check in 3 sequential steps. If any step fails, immediately mark items 8, 10, 33 as `판정불가` with the specific reason and proceed to Step 5.

**① Check playwright.config exists**

```bash
ls playwright.config.ts 2>/dev/null && echo "FOUND" || ls playwright.config.js 2>/dev/null && echo "FOUND" || echo "NOT_FOUND"
```

- NOT_FOUND → items 8, 10, 33: `판정불가 — playwright.config.ts 없음`

**② Check Playwright CLI and browser installation**

```bash
npx playwright --version 2>/dev/null || echo "PW_NOT_INSTALLED"
```

- PW_NOT_INSTALLED → items 8, 10, 33: `판정불가 — Playwright 미설치 (npx playwright --version 실패)`
- If CLI is installed but browser binaries are missing: `판정불가 — 브라우저 미설치 (npx playwright install chromium 필요)`

**③ Check dev server is running**

Determine the baseURL using Step 4-2 resolution logic first, then run:

```bash
curl -s --connect-timeout 5 "{baseURL}" -o /dev/null -w "%{http_code}"
```

- No HTTP response (exit code != 0) or returns 000 → items 8, 10, 33: `판정불가 — 개발 서버 미실행 ({baseURL} 응답 없음)`
- The server is never auto-started. This step is check-only.

**④ All checks pass → run 4-2 through 4-5 (automated checks for items 8, 10, 33)**

### 4-2. Determine Target URL

```bash
grep -E "baseURL|webServer" playwright.config.ts 2>/dev/null | head -5
```

Resolution order:
1. Extract `baseURL` from `playwright.config.ts`
2. If not found, extract `webServer.url`
3. Infer route from changed files via `git diff --name-only HEAD`:
   - `src/pages/Login.tsx` → `/login`
   - `src/pages/Dashboard.tsx` → `/dashboard`
   - `src/app/about/page.tsx` → `/about` (Next.js App Router)
4. If route inference fails → use baseURL only (homepage)
5. If no baseURL → fall back to `http://localhost:3000`

### 4-3. Item 8: Color Contrast (Playwright)

```javascript
browser_navigate({determined URL})

browser_evaluate(() => {
  const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, label, span, li, td, th');
  return Array.from(elements).slice(0, 50).map(el => {
    const style = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: el.textContent?.trim().slice(0, 30),
      color: style.color,
      background: style.backgroundColor,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight
    };
  });
})
```

Verdict criteria:
- Normal text: foreground/background contrast ratio ≥ **4.5:1**
- Large text (18pt+ or 14pt bold): ≥ **3:1**

Results:
- Element below threshold found → `X` (specify which element)
- All pass → `O`
- Color extraction failed (transparent background, etc.) → `△`

### 4-4. Item 10: Keyboard Accessibility (Playwright)

```
browser_snapshot()              → record initial state

browser_press_key('Tab')        → move focus (1st)
browser_snapshot()              → verify focus

browser_press_key('Tab')        → move focus (2nd)
browser_snapshot()              → verify focus

(repeat up to 10 times)
```

Verdict criteria:
- Focus moves visually on Tab and all interactive elements are reachable → `O`
- No focus movement or focus trap detected → `X`
- Only some elements reachable → `△`

### 4-5. Item 33: Web App Accessibility (Playwright)

```
browser_snapshot()              → snapshot before interaction (record ARIA state)

browser_click({first interactive element ref})

browser_snapshot()              → snapshot after interaction (verify ARIA state change)
```

Verdict criteria:
- `aria-expanded`, `aria-selected`, `aria-checked`, `aria-pressed`, etc. change after interaction → `O`
- No state change (static ARIA) → `△`
- No interactive elements found → `-`

### 4-6. Cross-Validation

If Playwright result differs from static analysis → **Playwright result takes precedence**.
Mark the verdict method column as `Playwright` in the report.

---

## Step 5. Classify Results

| Result     | Meaning                                            |
| ---------- | -------------------------------------------------- |
| `O`        | Pass: no violation found                           |
| `X`        | Fail: violation found (include filename:line)      |
| `△`        | Advisory: no violation but improvement recommended |
| `-`        | N/A: the relevant element does not exist           |
| `판정불가` | Runtime verification not possible — must state specific reason (one of 4): playwright.config.ts 없음 / Playwright 미설치 / 브라우저 미설치 / 개발 서버 미실행 |

---

## Step 6. Generate and Save Reports

Save the same review results in **2 formats**.

### Output Files

```bash
# 타임스탬프 계산
TIMESTAMP=$(date +%Y%m%d-%H%M)
REPORT_DIR=".claude/try-claude/reports/accessibility/${TIMESTAMP}"
mkdir -p "${REPORT_DIR}"
```

- `${REPORT_DIR}/report.html` — visual HTML report
- `${REPORT_DIR}/report.csv` — CSV for documentation/spreadsheet use

동일 분 내 재실행 시 폴더 재사용 허용 (suffix 불필요).

### HTML Report Requirements

- Result colors: `O` (green #28a745), `X` (red #dc3545), `△` (yellow #ffc107), `-` (gray #6c757d), `판정불가` (blue #6c8ebf)
- Structure: summary table → detailed results by principle → semantic HTML review → fix guide
- Language: Korean / Style: inline CSS only (no external dependencies)
- Verdict method column values: `정적분석` / `Playwright` / `판정불가`

### CSV Report Requirements

- Header: `번호,항목명,원칙,결과,판정방식,발견된 문제,수정 가이드`
- Include all 33 KWCAG items + all semantic HTML items
- Special character escaping: wrap cells containing commas or newlines in double-quotes; escape internal double-quotes as `""`

---

## Step 7. Verify Results

1. Confirm all 33 KWCAG2.2 items have been evaluated — none skipped.
2. Confirm the Semantic HTML section (7 items) has been evaluated.
3. Every X result must include: KWCAG item number, filename + line number or pattern, concrete violation description.
4. Every △ result must include a specific improvement recommendation.
5. Items marked 판정불가 must state one of the 4 specific reasons: playwright.config.ts 없음 / Playwright 미설치 / 브라우저 미설치 / 개발 서버 미실행.
6. Confirm both `.claude/try-claude/reports/accessibility/YYYYMMDD-HHmm/report.html` and `.claude/try-claude/reports/accessibility/YYYYMMDD-HHmm/report.csv` have been written.
7. If any condition above is not met, do not claim completion — identify what is missing and resolve it.

</Instructions>

<Output_Format>

Read `references/output-format.md` for full HTML + CSV report templates.

Key requirements:
- Result colors: `O` (green #28a745), `X` (red #dc3545), `△` (yellow #ffc107), `-` (gray #6c757d), `판정불가` (blue #6c8ebf)
- Structure: summary table → detailed results by principle → semantic HTML review → fix guide
- Language: Korean / Style: inline CSS only (no external dependencies)
- Verdict method column: `정적분석` / `Playwright` / `판정불가`
- CSV header: `번호,항목명,원칙,결과,판정방식,발견된 문제,수정 가이드`
- Include all 33 KWCAG items + all semantic HTML items

</Output_Format>
</Skill_Guide>


## Performance 검토 결과 — 2026-03-07

검토 파일: `skills/accessibility-review/SKILL.md`, `skills/web-quality-audit/SKILL.md`

### Step 1. Review Scope

Changed files detected via `git diff --name-only HEAD`:

| File | Extension | Web File? |
|------|-----------|-----------|
| `.claude/settings.local.json` | `.json` | No |
| `skills/accessibility-review/SKILL.md` | `.md` | No |
| `skills/web-quality-audit/SKILL.md` | `.md` | No |

**None of the changed files match the web file filter** (`*.html`, `*.htm`, `*.tsx`, `*.jsx`, `*.ts`, `*.js`, `*.vue`, `*.svelte`, `*.css`, `*.scss`). All changed files are markdown (`.md`) or JSON (`.json`) configuration/documentation files.

### Step 2. Reference Guide

Read `references/guide.md` in full. Contains performance budget, critical rendering path, image optimization, font optimization, caching strategy, and runtime performance patterns.

### Step 3. Static Analysis (PERF-01 through PERF-11)

All 11 items were evaluated against the changed files. Since none of the changed files contain web code (HTML, CSS, JavaScript, or framework components), no performance anti-patterns can be detected. Each item is marked N/A.

| 코드 | 영역 | 항목 | 결과 | 발견된 문제 |
|------|------|------|------|------------|
| PERF-01 | CRP | render-blocking script 없음 | — | N/A: 변경된 파일에 HTML/JS 코드 없음 |
| PERF-02 | CRP | LCP fetchpriority + preload | — | N/A: 변경된 파일에 이미지 참조 없음 |
| PERF-03 | CRP | Critical CSS 처리 | — | N/A: 변경된 파일에 CSS/HTML 코드 없음 |
| PERF-04 | 이미지 | width/height 지정 | — | N/A: 변경된 파일에 `<img>` 태그 없음 |
| PERF-05 | 이미지 | loading="lazy" | — | N/A: 변경된 파일에 `<img>` 태그 없음 |
| PERF-06 | 이미지 | WebP/AVIF 포맷 | — | N/A: 변경된 파일에 이미지 참조 없음 |
| PERF-07 | JS | 코드 스플리팅 | — | N/A: 변경된 파일에 JavaScript 코드 없음 |
| PERF-08 | JS | 트리 쉐이킹 패턴 | — | N/A: 변경된 파일에 import 문 없음 |
| PERF-09 | JS | 레이아웃 스래싱 없음 | — | N/A: 변경된 파일에 DOM 조작 코드 없음 |
| PERF-10 | 폰트 | font-display 설정 | — | N/A: 변경된 파일에 `@font-face` 선언 없음 |
| PERF-11 | 폰트 | 중요 폰트 preload | — | N/A: 변경된 파일에 폰트 관련 코드 없음 |

### Step 5. Verification

1. All 11 items (PERF-01 through PERF-11) have been evaluated -- none skipped.
2. Zero failures found -- all items are N/A because no web files were changed.
3. No advisory items -- the changed files are documentation/configuration only.

**All evaluated items are N/A. No web code files were included in the changeset.**

### 수정 가이드

No fixes required. The changed files (`SKILL.md` markdown files and `settings.local.json`) do not contain web application code subject to performance review. Performance checks would become applicable when HTML, CSS, JavaScript, or framework component files are modified.

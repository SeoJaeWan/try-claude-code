# Code Review: Security, Compatibility, Code Quality

## Review Scope

Changed files (per `git status`):

| File | Status |
|------|--------|
| `.claude/settings.local.json` | Modified (staged) |
| `skills/accessibility-review/SKILL.md` | Modified (unstaged) |
| `skills/web-quality-audit/SKILL.md` | Modified (unstaged) |

---

## 1. Security Review

### 1.1 `.claude/settings.local.json` - Permission Configuration

**File:** `.claude/settings.local.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(rm:*)",
      "Bash(pip install:*)",
      "Bash(do python:*)"
    ]
  }
}
```

#### Findings

| Severity | Issue | Description |
|----------|-------|-------------|
| **HIGH** | `Bash(rm:*)` - Unrestricted delete permission | Allows deletion of any file or directory without restriction. An agent could execute `rm -rf /` or delete critical project files. This wildcard pattern should be narrowed to specific directories (e.g., `Bash(rm:.claude/try-claude/reports/*)`) |
| **HIGH** | `Bash(pip install:*)` - Unrestricted package installation | Allows installation of arbitrary Python packages, which could include malicious packages (typosquatting, supply chain attacks). Should be restricted to known packages or removed if not needed. |
| **MEDIUM** | `Bash(do python:*)` - Unclear command pattern | The pattern `do python:*` is unusual. If this is intended to match `python` execution commands, it could allow arbitrary Python code execution. Verify the intended command pattern. |
| **LOW** | No `deny` rules defined | The configuration only has `allow` rules with no explicit `deny` rules. Consider adding deny rules for sensitive operations (e.g., network access, accessing `.env` files, `git push --force`). |

#### Recommendations
- Replace `Bash(rm:*)` with scoped paths: `Bash(rm:.claude/try-claude/*)`
- Remove or scope `Bash(pip install:*)` to a requirements file: `Bash(pip install -r requirements.txt)`
- Clarify the `do python:*` pattern or replace with explicit Python script paths
- Add deny rules for destructive operations

### 1.2 `skills/accessibility-review/SKILL.md` - Command Injection Risk

| Severity | Issue | Description |
|----------|-------|-------------|
| **LOW** | Shell commands use user-derived values | Step 4-1 uses `{baseURL}` in a `curl` command without quoting. If baseURL is extracted from config with special characters, it could be interpreted by the shell. The template shows `curl -s --connect-timeout 5 "{baseURL}"` which is properly quoted, but the extraction step should also validate the URL format. |
| **INFO** | `npx playwright --version` execution | Running `npx` can auto-install packages if not found locally. This is expected behavior but worth noting. |

### 1.3 `skills/web-quality-audit/SKILL.md` - No Direct Security Issues

No shell commands with user input injection risks. The skill delegates to sub-skills and only runs `git diff` and `mkdir`.

---

## 2. Compatibility Review

### 2.1 Cross-Platform Compatibility

| Severity | Issue | File | Description |
|----------|-------|------|-------------|
| **MEDIUM** | Unix-only shell commands | `accessibility-review/SKILL.md` | Commands like `date +%Y%m%d-%H%M`, `ls ... 2>/dev/null`, `grep -E`, `curl` assume a Unix environment. On Windows without Git Bash/WSL, these will fail. |
| **MEDIUM** | Unix-only shell commands | `web-quality-audit/SKILL.md` | Same `date` and `mkdir -p` commands. |
| **LOW** | Path separator assumption | Both SKILL.md files | Paths use forward slashes (`.claude/try-claude/reports/...`), which works on Windows with most tools but may cause issues with native Windows commands. |

### 2.2 Framework Compatibility

| Severity | Issue | File | Description |
|----------|-------|------|-------------|
| **INFO** | Next.js App Router assumption | `accessibility-review/SKILL.md` | Step 4-2 URL inference includes `src/app/about/page.tsx -> /about` which is specific to Next.js App Router. Other frameworks (Nuxt, SvelteKit, Remix) have different routing conventions. The doc does list this as one of several fallback strategies, which is acceptable. |
| **INFO** | Default port assumption | `accessibility-review/SKILL.md` | Falls back to `http://localhost:3000` which is correct for Next.js/Create React App but not for Vite (5173), Angular (4200), or Vue CLI (8080). |

### 2.3 Encoding and Language

| Severity | Issue | Description |
|----------|-------|-------------|
| **INFO** | Korean text in configuration | Both SKILL files contain Korean comments and descriptions. CSV headers are in Korean. This is intentional for KWCAG2.2 (Korean guidelines) but report files should ensure UTF-8 encoding is explicitly set in HTML reports (`<meta charset="UTF-8">`). |

---

## 3. Code Quality Review

### 3.1 `skills/accessibility-review/SKILL.md`

| Severity | Issue | Description |
|----------|-------|-------------|
| **MEDIUM** | Semantic HTML review lists 8 items but Step 7 says "7 items" | Step 7 verification item 2 states "Confirm the Semantic HTML section (7 items) has been evaluated" but the Context-Dependent Patterns table has 8 rows (Missing landmarks, Section structure, Complementary content, Interactive elements, List structure, Form grouping, Quotations, Time/Date). Plus 3 Directly Detectable Patterns = 11 total. The count "7" is incorrect. |
| **LOW** | KWCAG item numbering gaps | The Auto-Detection table lists items 1, 7, 11, 17, 25, 29, 32. The Contextual Judgment table lists 1, 3, 10, 13, 18, 19, 22, 23, 26, 28, 33. The Manual Verification lists 2, 6, 8, 9, 15, 16, 20, 27. Combined = items 1-3, 6-11, 13, 15-20, 22-23, 25-29, 32-33. Items 4, 5, 12, 14, 21, 24, 30, 31 are missing from all three tables. Either these items are intentionally excluded or there is incomplete coverage of the 33 KWCAG2.2 items. |
| **LOW** | Item 1 appears in two categories | "Alternative Text" appears in both Auto-Detection (O) and Contextual Judgment (triangle) tables. While the distinction (presence vs. quality) is valid, having the same item number in two categories could cause confusion in report generation. |
| **INFO** | Playwright code block language inconsistency | Step 4-3 uses ` ```javascript ` but Steps 4-4 and 4-5 use plain ` ``` ` (no language specified). |

### 3.2 `skills/web-quality-audit/SKILL.md`

| Severity | Issue | Description |
|----------|-------|-------------|
| **LOW** | Shell code block has non-executable lines | Step 7 code block includes `${REPORT_DIR}/report.html` and `${REPORT_DIR}/report.csv` as bare lines in a bash code block. These are not valid shell commands (they would try to execute the file). They should be presented as comments or outside the code block. |
| **INFO** | Description keyword overlap | The description includes both "접근성 검토" and "a11y 체크" as triggers. This is fine for discoverability but could cause ambiguity if there are separate standalone accessibility review triggers. |

### 3.3 `.claude/settings.local.json`

| Severity | Issue | Description |
|----------|-------|-------------|
| **INFO** | Minimal configuration | Only 3 permission rules are defined. The file is syntactically valid JSON. |

---

## Summary

| Category | HIGH | MEDIUM | LOW | INFO |
|----------|------|--------|-----|------|
| Security | 2 | 1 | 1 | 1 |
| Compatibility | 0 | 2 | 1 | 3 |
| Code Quality | 0 | 1 | 3 | 2 |
| **Total** | **2** | **4** | **5** | **6** |

### Critical Actions Required

1. **Restrict `Bash(rm:*)` permission** in `settings.local.json` to prevent unrestricted file deletion
2. **Restrict `Bash(pip install:*)` permission** to prevent arbitrary package installation
3. **Fix semantic HTML item count** in accessibility-review Step 7 (stated as 7, actual count differs)
4. **Verify KWCAG2.2 33-item coverage** -- several item numbers (4, 5, 12, 14, 21, 24, 30, 31) are not listed in any of the three detection categories

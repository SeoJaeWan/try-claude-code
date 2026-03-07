# Web Best Practices Compliance Review

## Files Reviewed

1. `skills/accessibility-review/SKILL.md`
2. `skills/web-quality-audit/SKILL.md`

## Summary

Both files are Markdown-based skill definition documents (not web-facing HTML/CSS/JS). They define review processes and contain embedded code snippets and HTML table references. The review evaluates them against web best practices as applicable to their content.

**Overall Assessment: 8 findings (3 issues, 5 advisory notes)**

---

## Findings

### 1. Inline HTML Tables Without Accessibility Attributes

- **File:** `skills/accessibility-review/SKILL.md`
- **Severity:** Advisory
- **Details:** The file contains multiple Markdown tables rendered as HTML. While these are documentation tables (not production web code), the embedded HTML snippets used as examples (e.g., `<img>` missing alt, `<input type="image">` missing alt) are correctly identified as anti-patterns within the document itself. The document is self-consistent in its guidance.

### 2. Mixed Language Content Without Explicit Language Tagging

- **File:** Both files
- **Severity:** Issue
- **Details:** Both files mix Korean and English text extensively. According to WCAG 2.2 guideline 3.1.2 (Language of Parts), content in a language different from the page's primary language should be marked with a `lang` attribute. While Markdown does not natively support `lang` attributes, if these files are rendered as HTML (e.g., in a documentation site), the mixed-language sections would lack proper language identification. This is relevant because these files themselves teach about `lang` attribute compliance (item 25 in the accessibility review).
- **Recommendation:** If rendered as HTML, wrap Korean text sections with `<span lang="ko">` or set the overall document language and mark English sections with `<span lang="en">`.

### 3. Code Examples Reference Browser APIs Without Error Handling

- **File:** `skills/accessibility-review/SKILL.md` (Step 4-3)
- **Severity:** Issue
- **Details:** The JavaScript code example in Section 4-3 uses `document.querySelectorAll()` and `getComputedStyle()` without try-catch or null checks. The `el.textContent?.trim()` uses optional chaining, which is good, but `getComputedStyle(el)` could fail on detached nodes. For a best-practices reference document, the code examples should demonstrate robust error handling.
- **Recommendation:** Add error handling around `getComputedStyle()` calls, and consider wrapping the entire evaluation in a try-catch block.

### 4. Shell Commands Lack Error Handling Best Practices

- **File:** Both files
- **Severity:** Advisory
- **Details:** Several shell command examples use patterns like:
  - `ls playwright.config.ts 2>/dev/null && echo "FOUND" || ...` -- this pipeline has ambiguous precedence between `&&` and `||`.
  - `grep -E "baseURL|webServer" playwright.config.ts 2>/dev/null | head -5` -- no check for grep exit status.
- **Recommendation:** Use `if` statements or explicit grouping `{ ...; }` to make shell logic unambiguous. For example: `if [ -f playwright.config.ts ]; then echo "FOUND"; else echo "NOT_FOUND"; fi`

### 5. Inline CSS Color Values Without Contrast Verification

- **File:** `skills/accessibility-review/SKILL.md` (Step 6), `skills/web-quality-audit/SKILL.md` (Output_Format)
- **Severity:** Advisory
- **Details:** The documents specify color codes for report badges (e.g., `#28a745` for green, `#dc3545` for red, `#ffc107` for yellow, `#6c757d` for gray). These colors are used in the generated HTML reports with inline CSS. However, there is no mention of verifying that these badge colors meet WCAG contrast ratios against their backgrounds. Notably, `#ffc107` (yellow) on a white background has a contrast ratio of approximately 1.9:1, which fails WCAG AA (4.5:1 for normal text).
- **Recommendation:** Specify background colors for badges or verify that all badge color/background combinations meet a 4.5:1 contrast ratio. Consider using `#856404` (dark yellow) for text on a yellow badge, or use a dark background with the yellow text.

### 6. No Content Security Policy Guidance for Generated HTML Reports

- **File:** Both files (report generation sections)
- **Severity:** Issue
- **Details:** The generated HTML reports use "inline CSS only (no external dependencies)" which is good for portability. However, there is no mention of including a `<meta>` CSP tag or other security headers in the generated HTML. Since these reports may be opened in browsers and could contain user-derived content (file paths, code snippets), a basic CSP would be a best practice.
- **Recommendation:** Add guidance to include `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">` in the generated HTML report template.

### 7. CSV Injection Prevention Not Addressed

- **File:** Both files (CSV report sections)
- **Severity:** Advisory
- **Details:** The CSV report requirements mention escaping commas and double-quotes, but do not address CSV injection. Cell values beginning with `=`, `+`, `-`, or `@` can be interpreted as formulas by spreadsheet applications, potentially leading to security issues.
- **Recommendation:** Add a rule to prefix cell values starting with `=`, `+`, `-`, or `@` with a single quote or tab character to prevent formula injection in spreadsheet applications.

### 8. Hardcoded Localhost URL as Fallback

- **File:** `skills/accessibility-review/SKILL.md` (Step 4-2)
- **Severity:** Advisory
- **Details:** The fallback URL `http://localhost:3000` is hardcoded. While this is a common default for development servers, it makes assumptions about the development environment. Best practice would be to make this configurable or at minimum document that the fallback is framework-specific.
- **Recommendation:** Note that `localhost:3000` is a convention for React/Next.js and may differ for other frameworks (e.g., Vite uses 5173, Angular uses 4200).

---

## Summary Table

| # | Finding | Severity | File(s) |
|---|---------|----------|---------|
| 1 | Inline HTML tables without a11y attrs | Advisory | accessibility-review/SKILL.md |
| 2 | Mixed language without lang tagging | Issue | Both files |
| 3 | Code examples lack error handling | Issue | accessibility-review/SKILL.md |
| 4 | Shell commands ambiguous precedence | Advisory | Both files |
| 5 | Badge colors fail contrast requirements | Advisory | Both files |
| 6 | No CSP guidance for generated HTML | Issue | Both files |
| 7 | CSV injection prevention not addressed | Advisory | Both files |
| 8 | Hardcoded localhost fallback | Advisory | accessibility-review/SKILL.md |

## Verdict

The reviewed files are skill definition documents, not production web code. They are well-structured and comprehensive in their coverage of web accessibility and quality standards. The findings above are mostly advisory improvements that would strengthen the documents' own compliance with the best practices they advocate. The three "Issue" severity findings (mixed language tagging, code example robustness, and CSP guidance) are the most actionable items for improvement.

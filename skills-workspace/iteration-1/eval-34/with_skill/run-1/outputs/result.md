# Full Web Quality Audit Simulation (with_skill)

## Skill: web-quality-audit

### Step 1. Review Scope
Changed files: `.claude/settings.local.json`, `skills/accessibility-review/SKILL.md`, `skills/web-quality-audit/SKILL.md`
Web file filter applied: **No web files found** (all JSON/Markdown)

### Step 2-6. Five Area Review

#### A. Accessibility (KWCAG2.2) — delegated to accessibility-review
- 33 KWCAG items + 7 semantic HTML items
- Result: All `-` (N/A) — no web code

#### B. Best Practices — delegated to best-practices
- BP-01 through BP-14
- Result: All `-` (N/A)

#### C. SEO — delegated to seo
- SEO-01 through SEO-10
- Result: All `-` (N/A)

#### D. Performance — delegated to performance
- PERF-01 through PERF-11
- Result: All `-` (N/A)

#### E. Core Web Vitals — delegated to core-web-vitals
- CWV-01 through CWV-11
- Result: All `-` (N/A)

### Step 7. Unified Report
- HTML + CSV report generation (simulated)
- Path: `.claude/try-claude/reports/web-quality/YYYYMMDD-HHmm/`

### Step 8. Verification
- All 5 sections collected
- No web files changed — all items N/A

### Key Skill Differences
- Structured 8-step workflow with explicit delegation to 5 sub-skills
- Report output in specific format with color-coded badges
- Verification step ensures no section is skipped

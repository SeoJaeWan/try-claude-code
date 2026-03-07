# Performance Anti-Pattern Review

## Files Reviewed

1. `skills/accessibility-review/SKILL.md` (modified)
2. `skills/web-quality-audit/SKILL.md` (modified)
3. `.claude/settings.local.json` (modified)

## Analysis

### Overview

The changed files are skill definition documents (Markdown) and a JSON configuration file. These are not application runtime code -- they are declarative instruction files consumed by an AI agent framework and a local settings file. As such, traditional runtime performance anti-patterns (e.g., N+1 queries, memory leaks, unnecessary re-renders, blocking I/O) do not directly apply.

However, the skill instructions describe **runtime behaviors** that the agent will execute. Reviewing those prescribed behaviors for performance anti-patterns is relevant.

---

### Findings

#### 1. Unbounded DOM Query in Playwright Script (accessibility-review/SKILL.md)

**Severity:** Medium
**Location:** `skills/accessibility-review/SKILL.md`, Step 4-3 (lines ~193-206)

The prescribed Playwright script queries a broad set of selectors and processes up to 50 elements:

```javascript
const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, label, span, li, td, th');
return Array.from(elements).slice(0, 50).map(el => {
  const style = getComputedStyle(el);
  // ...
});
```

**Anti-patterns identified:**
- **`getComputedStyle()` called in a loop for up to 50 elements.** Each `getComputedStyle()` call can trigger a style recalculation (layout thrashing) if any DOM write has occurred between reads. While this is a read-only script, calling `getComputedStyle` 50 times in sequence is moderately expensive on complex pages.
- **`Array.from()` on a potentially massive NodeList.** The selector `'p, h1, h2, h3, h4, h5, h6, a, button, label, span, li, td, th'` on a large page could match thousands of elements. Converting this entire NodeList to an array before slicing wastes memory. A more efficient approach would be to iterate and break after 50 elements.

**Recommendation:** Use an iterator or indexed loop with early termination instead of `Array.from(...).slice(0, 50)`:
```javascript
const elements = document.querySelectorAll('...');
const results = [];
for (let i = 0; i < Math.min(elements.length, 50); i++) {
  const style = getComputedStyle(elements[i]);
  results.push({ /* ... */ });
}
return results;
```

#### 2. Repeated File Reads Acknowledged but Not Enforced (accessibility-review/SKILL.md)

**Severity:** Low
**Location:** `skills/accessibility-review/SKILL.md`, Step 3 (line ~60)

The instruction says "evaluate all 33 items simultaneously for each file (Minimize repeated file reads)" but provides no mechanism to enforce this. The agent may still re-read files multiple times across steps (Step 3, Step 4), leading to redundant I/O.

**Anti-pattern:** Advisory instruction without enforcement -- relies on agent behavior, not a structural guarantee.

**Recommendation:** No code change needed, but the instruction could be strengthened by explicitly stating that file content should be cached in a variable for reuse across all evaluation items.

#### 3. Sequential Skill Execution Without Parallelism (web-quality-audit/SKILL.md)

**Severity:** Medium
**Location:** `skills/web-quality-audit/SKILL.md`, Steps 2-6 (lines ~45-88)

The audit orchestrates 5 sub-skills strictly sequentially:
1. accessibility-review
2. best-practices
3. seo
4. performance
5. core-web-vitals

**Anti-pattern:** Several of these reviews (best-practices, seo, performance, core-web-vitals) operate on the same file set with independent analysis logic. Running them sequentially when they could be parallelized increases total wall-clock time. For a large codebase this could mean 5x the wait time compared to parallel execution.

**Recommendation:** If the agent framework supports parallel skill execution, steps 3-6 (best-practices, seo, performance, core-web-vitals) could run concurrently after step 2 (accessibility) completes, or all 5 could run in parallel if there are no data dependencies.

#### 4. Shell Command Inefficiency (accessibility-review/SKILL.md)

**Severity:** Low
**Location:** `skills/accessibility-review/SKILL.md`, Step 4-1 (lines ~144-145)

```bash
ls playwright.config.ts 2>/dev/null && echo "FOUND" || ls playwright.config.js 2>/dev/null && echo "FOUND" || echo "NOT_FOUND"
```

**Anti-pattern:** Chaining `ls` commands with `&&`/`||` for file existence checks. This spawns multiple subprocesses. The idiomatic and more efficient approach uses `test -f`:

```bash
test -f playwright.config.ts && echo "FOUND" || test -f playwright.config.js && echo "FOUND" || echo "NOT_FOUND"
```

This is a minor concern since it runs once, but it represents a non-idiomatic pattern.

#### 5. No Caching or Deduplication of Shared Work (web-quality-audit/SKILL.md)

**Severity:** Low
**Location:** `skills/web-quality-audit/SKILL.md`, Steps 2-6

Each delegated skill independently runs `git diff --name-only HEAD` to determine file scope. This command is executed up to 5 times for the same result.

**Anti-pattern:** Redundant subprocess invocations for identical data.

**Recommendation:** The orchestrating skill should compute the file list once in Step 1 and pass it to all sub-skills, which the document partially addresses ("pass the same file set") but does not enforce for all sub-skills.

#### 6. No Issues in settings.local.json

The `.claude/settings.local.json` file contains a small static permission configuration with 3 entries. No performance concerns.

---

### Summary Table

| # | Finding | Severity | File |
|---|---------|----------|------|
| 1 | `getComputedStyle()` in loop + `Array.from()` on large NodeList | Medium | accessibility-review/SKILL.md |
| 2 | Repeated file reads advisory without enforcement | Low | accessibility-review/SKILL.md |
| 3 | Sequential sub-skill execution without parallelism | Medium | web-quality-audit/SKILL.md |
| 4 | Non-idiomatic shell file existence check | Low | accessibility-review/SKILL.md |
| 5 | Redundant `git diff` across sub-skills | Low | web-quality-audit/SKILL.md |
| 6 | No issues | None | .claude/settings.local.json |

### Conclusion

The changed files are primarily declarative skill instructions, not runtime application code. Two medium-severity performance anti-patterns were identified: an inefficient DOM querying pattern in the Playwright contrast-check script, and a strictly sequential orchestration of independent review skills. Three low-severity issues relate to redundant shell commands and unenforced optimization guidelines.

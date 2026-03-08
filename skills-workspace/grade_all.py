"""Grade all 68 eval runs by checking assertions against summary.md content."""
import json
import os
import re

BASE = r"C:\Users\sjw73\OneDrive\Desktop\dev\try-claude-code\skills-workspace\iteration-1"

# Keyword patterns for each assertion - maps assertion text to search patterns
# Each pattern is a list of terms that should ALL appear in the summary (case-insensitive)
ASSERTION_PATTERNS = {
    # Eval 1-2: init-try
    "Summary mentions reading SKILL.md for init-try": [["skill.md", "init-try"]],
    "Lists .claude/try-claude/ as target directory": [[".claude/try-claude"]],
    "Mentions references/coding-rules/ with 9 documents": [["coding-rules", "9"]],
    "Mentions scripts/generate.mjs": [["generate.mjs"]],
    "Mentions references/design/ with design documents": [["references/design"], ["design", "5개"], ["design", "문서"], ["design", "document"]],
    "Mentions project.json creation": [["project.json"]],
    "Lists 7 directories (plans, reports, logs, codemaps, humanmaps, jira-review, references)": [["plans", "reports", "logs", "codemaps", "humanmaps"]],
    "Mentions run.mjs script execution": [["run.mjs"]],
    "Describes project.json with managedReferences array": [["project.json", "managedreferences"]],
    "Mentions path/hash/mergeMode fields in managedReferences": [["path", "hash", "mergemode"]],
    "Mentions SHA256 hash tracking per reference file": [["sha256", "hash"]],

    # Eval 3-4: frontend-dev
    "Summary mentions reading SKILL.md for frontend-dev": [["skill.md", "frontend"]],
    "References use{Verb}{Resource} naming convention": [["use", "verb", "resource"], ["useget", "usepost", "usefetch", "useauth"]],
    "Mentions TDD RED->GREEN workflow or test-first approach": [["tdd"], ["red", "green"], ["test-first"], ["test first"]],
    "References coding-rules documents": [["coding-rules"], ["coding rules"]],
    "Mentions generate.mjs or coding-rules-based implementation": [["generate.mjs"], ["coding-rules"]],
    "Uses useGetUserProfile or similar use{Verb}{Resource} naming": [["use", "get"], ["useget"], ["useauth"], ["usefetch"]],
    "Mentions TDD RED->GREEN or test-first workflow": [["tdd"], ["red", "green"], ["test-first"], ["test first"]],
    "References coding-rules/code-style.md or design/ docs": [["code-style"], ["coding-rules"], ["design/"]],

    # Eval 5-6: backend-dev
    "Summary mentions reading SKILL.md for backend-dev": [["skill.md", "backend"]],
    "Mentions NestJS module structure (controller, service, module)": [["controller", "service", "module"]],
    "References coding-rules/folder-structure.md": [["folder-structure"], ["folder structure"]],
    "Mentions DB snake_case naming convention": [["snake_case"], ["snake case"]],
    "Mentions generate.mjs or manual file generation": [["generate.mjs"], ["file generation"], ["generate"]],
    "Mentions framework auto-detection from package.json": [["package.json", "detect"], ["framework", "detect"]],
    "Mentions stack-specific test command selection": [["test command"], ["test", "jest"], ["test", "vitest"]],
    "Describes controller+service+module file generation": [["controller", "service", "module"]],
    "Mentions TDD RED->GREEN workflow": [["tdd"], ["red", "green"]],

    # Eval 7-8: ui-publish
    "Summary mentions reading SKILL.md for ui-publish": [["skill.md", "ui-publish"], ["skill.md", "ui publish"]],
    "Mentions Pretendard font": [["pretendard"]],
    "References theme-tokens.md": [["theme-tokens"], ["theme tokens"]],
    "Mentions Tailwind CSS usage": [["tailwind"]],
    "Enforces no-logic rule (no useState/useEffect/fetch)": [["no-logic"], ["no logic"], ["usestate", "useeffect"]],
    "Describes layout-only props (className, children)": [["classname", "children"], ["layout-only"], ["layout only"]],
    "References design/theme-tokens.md and tailwind.config.js": [["theme-tokens"], ["tailwind.config"]],
    "Mentions mobile-first breakpoints (sm: md: lg:)": [["mobile-first"], ["mobile first"], ["breakpoint"], ["sm:", "md:"]],
    "Mentions shadcn/ui component reuse or CODEMAPS check": [["shadcn"], ["codemaps"]],
    "Mentions Pretendard font-family": [["pretendard"]],

    # Eval 9-10: doc-update
    "Summary mentions reading SKILL.md for doc-update": [["skill.md", "doc-update"], ["skill.md", "doc update"]],
    "Mentions detect_changes.mjs execution": [["detect_changes"]],
    "Mentions extract_structure.mjs execution": [["extract_structure"]],
    "Describes CODEMAPS/INDEX.md generation": [["codemaps", "index.md"], ["codemaps"]],
    "Mentions HUMANMAPS HTML file generation": [["humanmaps", "html"], ["humanmaps"]],
    "Describes pipeline execution order": [["pipeline"], ["sequence"], ["order"]],
    "Mentions detect_changes.mjs and extract_structure.mjs in sequence": [["detect_changes", "extract_structure"]],
    "Describes codemaps/ directory with INDEX.md": [["codemaps", "index"]],
    "Mentions humanmaps/ with HTML output": [["humanmaps", "html"]],
    "Mentions service root detection (app/, apps/, src/)": [["service root"], ["app/", "src/"], ["root detect"]],

    # Eval 11-12: migration
    "Summary mentions reading SKILL.md for migration": [["skill.md", "migration"]],
    "Describes section-aware merge logic": [["section", "merge"]],
    "Mentions project.json hash comparison using SHA256": [["project.json", "hash"], ["sha256", "hash"]],
    "Mentions managedReferences array update": [["managedreferences"]],
    "Reports updated/skipped/reseeded counts": [["updated", "skipped"], ["reseeded"]],
    "Mentions SHA256 hash comparison": [["sha256", "hash"]],
    "Describes section-level merge preserving user edits": [["section", "merge", "user"], ["section", "merge", "preserv"]],
    "Reports updated/skipped/reseeded file counts": [["updated", "skipped"], ["reseeded"]],
    "Mentions managedReferences hash updates": [["managedreferences", "hash"]],

    # Eval 13-14: init-coding-rules
    "Summary mentions reading SKILL.md for init-coding-rules": [["skill.md", "init-coding-rules"], ["skill.md", "coding-rules"], ["skill.md", "coding rules"]],
    "Mentions reading 9 coding-rules documents": [["coding-rules", "9"], ["coding rules", "9"]],
    "Mentions framework detection from package.json": [["package.json", "detect"], ["framework", "detect"], ["package.json", "framework"]],
    "Describes 4-group approval workflow (ESLint, TSConfig, commitlint, husky+lint-staged)": [["eslint", "tsconfig"], ["4 group"], ["4-group"], ["commitlint"]],
    "Mentions config file generation": [["config", "generat"], ["config", "file"]],
    "Mentions reading all 9 coding-rules docs": [["coding-rules", "9"], ["coding rules", "9"]],
    "Mentions framework detection from package.json devDependencies": [["package.json", "detect"], ["package.json", "devdependencies"], ["package.json", "framework"]],
    "Describes per-group approval workflow": [["group", "approv"], ["per-group"]],
    "Mentions safe install pattern (no auto-run pnpm add)": [["safe install"], ["pnpm"], ["no auto"]],

    # Eval 15-16: planner-lite
    "Summary mentions reading SKILL.md for planner-lite": [["skill.md", "planner-lite"], ["skill.md", "planner"]],
    "Mentions Branch: header validation in plan.md": [["branch:", "plan.md"], ["branch", "header"]],
    "Mentions owner_agent agents/*.md existence check": [["owner_agent"], ["agents/"]],
    "Describes git worktree add command": [["git worktree"]],
    "States isolation: worktree is forbidden in Agent calls": [["isolation", "worktree", "forbidden"], ["isolation", "worktree"]],
    "Mentions git merge --no-ff after phase completion": [["merge", "--no-ff"], ["merge", "no-ff"]],
    "Mentions worktree cleanup": [["worktree", "cleanup"], ["worktree", "clean"]],
    "Validates Branch: header and owner_agent: fields": [["branch:", "owner_agent"], ["branch", "owner_agent"]],
    "Checks agents/*.md existence": [["agents/", ".md"], ["agents", "exist"]],
    "Prevents nested worktree (no isolation: worktree in Agent calls)": [["isolation", "worktree"]],
    "Describes sequential phase execution": [["sequential", "phase"], ["phase", "execution"], ["phase"]],
    "Mentions merge and cleanup steps": [["merge", "clean"]],

    # Eval 17-18: accessibility-review
    "Summary mentions reading SKILL.md for accessibility-review": [["skill.md", "accessibility"]],
    "Mentions kwcag22.md reference reading": [["kwcag22"], ["kwcag"]],
    "Mentions evaluating 33 KWCAG items": [["33", "kwcag"], ["33 items"], ["33개"]],
    "Describes O/X/triangle/N/A classification system": [["o/x"], ["triangle"], ["n/a", "classif"]],
    "Mentions Playwright environment detection": [["playwright"]],
    "Mentions HTML+CSV report generation": [["html", "csv", "report"]],
    "Mentions kwcag22.md reference": [["kwcag22"], ["kwcag"]],
    "Evaluates all 33 items with auto-detection levels": [["33", "auto-detect"], ["33 items"], ["33개"]],
    "Describes semantic HTML review (7 items)": [["semantic html", "7"], ["semantic", "7 items"]],
    "Mentions report output in .claude/try-claude/reports/accessibility/": [[".claude/try-claude/reports/accessibility"], ["reports/accessibility"]],

    # Eval 19-20: best-practices
    "Summary mentions reading SKILL.md for best-practices": [["skill.md", "best-practices"], ["skill.md", "best practices"]],
    "Lists all 14 BP items (BP-01 through BP-14)": [["bp-01", "bp-14"], ["14", "bp"], ["bp-"]],
    "Covers Security area (5 items)": [["security", "5"]],
    "Covers Compatibility area (5 items)": [["compatibility", "5"]],
    "Covers Code Quality area (4 items)": [["code quality", "4"]],
    "Evaluates all 14 BP items": [["14", "bp"]],
    "Each item has pass/fail/N/A result": [["pass", "fail", "n/a"], ["pass/fail"]],
    "Provides specific evidence per item": [["evidence"], ["specific"]],

    # Eval 21-22: seo
    "Summary mentions reading SKILL.md for seo": [["skill.md", "seo"]],
    "Lists all 10 SEO items (SEO-01 through SEO-10)": [["seo-01", "seo-10"], ["10", "seo"]],
    "Classifies items by Critical/High/Medium priority": [["critical", "high", "medium"]],
    "Covers Critical items (SEO-01 through SEO-04)": [["critical", "seo-0"]],
    "Covers High items (SEO-05 through SEO-08)": [["high", "seo-0"]],
    "Covers Medium items (SEO-09 through SEO-10)": [["medium", "seo-"]],
    "Evaluates all 10 SEO items": [["10", "seo"]],
    "Uses Critical/High/Medium priority classification": [["critical", "high", "medium"]],
    "Provides structured checklist with pass/fail/N/A": [["checklist"], ["pass", "fail"]],

    # Eval 23-24: performance
    "Summary mentions reading SKILL.md for performance": [["skill.md", "performance"]],
    "Lists all 11 PERF items (PERF-01 through PERF-11)": [["perf-01", "perf-11"], ["11", "perf"]],
    "Covers CRP area (PERF-01 through PERF-03)": [["crp", "perf"]],
    "Covers Image area (PERF-04 through PERF-06)": [["image", "perf"]],
    "Covers JS area (PERF-07 through PERF-09)": [["js", "perf"]],
    "Covers Font area (PERF-10 through PERF-11)": [["font", "perf"]],
    "Evaluates all 11 PERF items": [["11", "perf"]],
    "Focuses on web performance (not general code efficiency)": [["web performance"], ["performance"]],
    "Covers CRP/Image/JS/Font areas": [["crp", "image", "js", "font"], ["crp"]],

    # Eval 25-26: core-web-vitals
    "Summary mentions reading SKILL.md for core-web-vitals": [["skill.md", "core-web-vitals"], ["skill.md", "web vitals"]],
    "Lists all 11 CWV items (CWV-01 through CWV-11)": [["cwv-01", "cwv-11"], ["11", "cwv"]],
    "Covers LCP items (CWV-01 through CWV-03)": [["lcp", "cwv"]],
    "Covers INP items (CWV-04 through CWV-06)": [["inp", "cwv"]],
    "Covers CLS items (CWV-07 through CWV-11)": [["cls", "cwv"]],
    "Evaluates all 11 CWV items": [["11", "cwv"]],
    "Classifies by LCP/INP/CLS metric": [["lcp", "inp", "cls"]],
    "Provides impact analysis per item": [["impact"], ["analysis"]],

    # Eval 27-28: web-quality-audit
    "Summary mentions reading SKILL.md for web-quality-audit": [["skill.md", "web-quality-audit"], ["skill.md", "web quality"]],
    "Describes 5-area sequential execution": [["5", "area"], ["5", "sequential"]],
    "Mentions Accessibility (33 items)": [["accessibility", "33"]],
    "Mentions Best Practices (14 items)": [["best practices", "14"]],
    "Mentions SEO (10 items)": [["seo", "10"]],
    "Mentions Performance (11 items)": [["performance", "11"]],
    "Mentions CWV (11 items)": [["cwv", "11"], ["core web vitals", "11"]],
    "Mentions unified HTML+CSV report generation": [["html", "csv", "report"], ["unified", "report"]],
    "Orchestrates 5 sub-skills in sequence": [["5", "sub-skill"], ["5", "sequence"], ["orchestrat"]],
    "Mentions section colors (#6c8ebf, #82c882, #f0a830, #e05c5c, #9b59b6)": [["#6c8ebf"], ["#82c882"], ["section color"]],
    "Generates unified HTML report and CSV": [["html", "report"], ["csv"]],

    # Eval 29-30: commit
    "Summary mentions reading SKILL.md for commit": [["skill.md", "commit"]],
    "Describes git status/diff analysis": [["git status", "diff"], ["git status"], ["git diff"]],
    "Mentions Conventional Commits format (type: subject)": [["conventional commit"], ["type:", "subject"]],
    "Mentions commitlint verification": [["commitlint"]],
    "Describes amend loop on validation failure": [["amend", "loop"], ["amend", "fail"]],
    "Mentions type: subject format (max 72 chars)": [["type:", "subject"], ["72 char"]],
    "Mentions commitlint validation attempt": [["commitlint"]],
    "Enforces subject-only format (no body unless complex)": [["subject-only"], ["no body"], ["subject only"]],

    # Eval 31-32: pr
    "Summary mentions reading SKILL.md for pr": [["skill.md", "pr"]],
    "Describes branch analysis": [["branch", "analy"]],
    "Mentions commit history summary": [["commit", "history"], ["commit", "summary"]],
    "Mentions gh pr create --title --body execution": [["gh pr create"]],
    "Includes Summary section in PR body": [["summary", "pr body"], ["## summary"]],
    "Includes Test plan section in PR body": [["test plan"]],
    "Analyzes branch diff": [["branch", "diff"]],
    "Generates PR with Summary and Test plan sections": [["summary", "test plan"]],
    "Mentions gh pr create execution": [["gh pr create"]],

    # Eval 33-34: help-try
    "Summary mentions reading SKILL.md for help-try": [["skill.md", "help-try"], ["skill.md", "help try"]],
    "Mentions .claude/try-claude/ path": [[".claude/try-claude"]],
    "Explains init-try vs migration difference": [["init-try", "migration"]],
    "Provides FAQ-based answers": [["faq"]],
    "Explains shared (.mcp.json in repo) vs machine-local (~/.claude/.mcp.json) config": [[".mcp.json"], ["shared", "local"]],
    "Mentions OS-specific template paths": [["os-specific"], ["os specific"], ["template path"], ["windows", "mac"]],
}


def check_assertion(text, summary_lower):
    """Check if assertion passes against summary content."""
    patterns = ASSERTION_PATTERNS.get(text)
    if not patterns:
        # Fallback: extract key terms from assertion and check
        terms = re.findall(r'[a-zA-Z_\-./]+', text.lower())
        important = [t for t in terms if len(t) > 3 and t not in ('summary', 'mentions', 'describes', 'lists', 'covers', 'reading', 'items', 'with', 'from', 'that')]
        if important:
            return all(t in summary_lower for t in important[:3])
        return False

    # Check if ANY pattern group matches (OR logic between groups)
    for pattern_group in patterns:
        # ALL terms in a group must match (AND logic within group)
        if all(term.lower() in summary_lower for term in pattern_group):
            return True
    return False


def grade_run(eval_dir_path, variant):
    """Grade a single run."""
    run_dir = os.path.join(eval_dir_path, variant)
    outputs_dir = os.path.join(run_dir, "outputs")
    summary_path = os.path.join(outputs_dir, "summary.md")

    if not os.path.exists(summary_path):
        return None

    with open(summary_path, "r", encoding="utf-8") as f:
        summary = f.read()
    summary_lower = summary.lower()

    # Load assertions from eval_metadata.json
    meta_path = os.path.join(eval_dir_path, "eval_metadata.json")
    if not os.path.exists(meta_path):
        return None

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assertions = meta.get("assertions", [])
    if not assertions:
        return None

    expectations = []
    passed_count = 0
    for assertion in assertions:
        passed = check_assertion(assertion, summary_lower)
        evidence = ""
        if passed:
            passed_count += 1
            # Find a relevant line as evidence
            for line in summary.split("\n"):
                terms = re.findall(r'[a-zA-Z_\-./]+', assertion.lower())
                key_terms = [t for t in terms if len(t) > 3 and t not in ('summary', 'mentions', 'describes', 'lists', 'covers')]
                if key_terms and any(t in line.lower() for t in key_terms[:2]):
                    evidence = f"Found in summary: '{line.strip()[:200]}'"
                    break
            if not evidence:
                evidence = "Pattern matched in summary content"
        else:
            evidence = "No matching content found in summary"

        expectations.append({
            "text": assertion,
            "passed": passed,
            "evidence": evidence
        })

    total = len(assertions)
    grading = {
        "expectations": expectations,
        "summary": {
            "passed": passed_count,
            "failed": total - passed_count,
            "total": total,
            "pass_rate": round(passed_count / total, 2) if total > 0 else 0.0
        },
        "eval_feedback": {
            "suggestions": [],
            "overall": "Automated keyword-based grading"
        }
    }

    grading_path = os.path.join(run_dir, "grading.json")
    with open(grading_path, "w", encoding="utf-8") as f:
        json.dump(grading, f, ensure_ascii=False, indent=2)

    return grading["summary"]


def main():
    total_graded = 0
    results = []

    for dirname in sorted(os.listdir(BASE)):
        eval_dir_path = os.path.join(BASE, dirname)
        if not os.path.isdir(eval_dir_path):
            continue

        for variant in ["with_skill", "without_skill"]:
            result = grade_run(eval_dir_path, variant)
            if result:
                total_graded += 1
                results.append((dirname, variant, result))
                status = f"PASS {result['passed']}/{result['total']}" if result['pass_rate'] >= 0.5 else f"FAIL {result['passed']}/{result['total']}"
                print(f"  {dirname}/{variant}: {status} (rate={result['pass_rate']})")

    print(f"\nTotal graded: {total_graded}")

    # Summary stats
    with_skill_rates = [r[2]['pass_rate'] for r in results if r[1] == 'with_skill']
    without_skill_rates = [r[2]['pass_rate'] for r in results if r[1] == 'without_skill']

    if with_skill_rates:
        avg_with = sum(with_skill_rates) / len(with_skill_rates)
        print(f"with_skill avg pass_rate: {avg_with:.2f}")
    if without_skill_rates:
        avg_without = sum(without_skill_rates) / len(without_skill_rates)
        print(f"without_skill avg pass_rate: {avg_without:.2f}")


if __name__ == "__main__":
    main()

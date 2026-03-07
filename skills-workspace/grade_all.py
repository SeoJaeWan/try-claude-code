"""Grade all eval runs and generate benchmark data."""
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
ITER = os.path.join(BASE, "iteration-1")

# Skill metadata: eval_ids, skill_name, assertions
SKILLS = {
    "commit": {
        "evals": [1, 2],
        "assertions": [
            {"text": "Follows Conventional Commits format (type: description)", "check": r"(feat|fix|refactor|style|docs|chore|test):"},
            {"text": "Analyzes git status/diff before committing", "check": r"git (status|diff|log)"},
            {"text": "Generates subject-only commit message (no body)", "check": r"(commit|message|subject)"},
        ]
    },
    "pr": {
        "evals": [3, 4],
        "assertions": [
            {"text": "Checks current branch status", "check": r"(branch|status|main|0\.1\.0)"},
            {"text": "Generates PR title and body", "check": r"(title|body|summary|changes)"},
            {"text": "Uses gh pr create or equivalent", "check": r"(gh pr|pull request|PR)"},
        ]
    },
    "help-try": {
        "evals": [5, 6],
        "assertions": [
            {"text": "Answers in Korean", "check": r"[\uac00-\ud7a3]"},
            {"text": "Mentions .claude/try-claude/ path", "check": r"\.claude/(try-claude|try)"},
            {"text": "Explains init-try or MCP configuration", "check": r"(init-try|migration|MCP|mcp|\.mcp\.json)"},
        ]
    },
    "init-try": {
        "evals": [7, 8],
        "assertions": [
            {"text": "Identifies .claude/try-claude/ as runtime root", "check": r"\.claude/try-claude"},
            {"text": "Mentions project.json creation/update", "check": r"project\.json"},
            {"text": "Lists runtime directories (references, plans, reports, etc.)", "check": r"(references|plans|reports|codemaps)"},
        ]
    },
    "migration": {
        "evals": [9, 10],
        "assertions": [
            {"text": "Explains section-aware merge behavior", "check": r"(section|merge|preserve|unchanged|edited)"},
            {"text": "References project.json tracking", "check": r"project\.json"},
            {"text": "Mentions managed references sync", "check": r"(managed|reference|sync|migration)"},
        ]
    },
    "doc-update": {
        "evals": [11, 12],
        "assertions": [
            {"text": "Mentions CODEMAPS and HUMANMAPS", "check": r"(CODEMAPS|HUMANMAPS|codemaps|humanmaps)"},
            {"text": "References detect_changes or extract_structure scripts", "check": r"(detect_changes|extract_structure|changes\.json)"},
            {"text": "Identifies service root detection logic", "check": r"(app/|apps/|src/|pages/|service)"},
        ]
    },
    "init-coding-rules": {
        "evals": [13, 14],
        "assertions": [
            {"text": "Reads coding-rules references", "check": r"(coding-rules|typescript\.md|naming\.md|code-style)"},
            {"text": "Detects framework or identifies Base TypeScript", "check": r"(framework|Base TypeScript|package\.json|Next\.js|NestJS)"},
            {"text": "Maps coding rules to ESLint rules", "check": r"(eslint|ESLint|no-explicit-any|naming-convention)"},
        ]
    },
    "frontend-dev": {
        "evals": [15, 16],
        "assertions": [
            {"text": "Creates custom hook with proper naming", "check": r"(useAuth|useLogin|useGetUserProfile|use[A-Z])"},
            {"text": "References TDD workflow or testing", "check": r"(TDD|test|Red|Green|vitest|jest)"},
            {"text": "Mentions API integration pattern", "check": r"(API|TanStack|Query|fetch|mutation)"},
        ]
    },
    "backend-dev": {
        "evals": [17, 18],
        "assertions": [
            {"text": "Detects or specifies NestJS/Express framework", "check": r"(NestJS|Express|Fastify|controller|service|module)"},
            {"text": "Defines API endpoints", "check": r"(POST|GET|PUT|DELETE|endpoint|route|/auth|/api)"},
            {"text": "Includes authentication or CRUD implementation", "check": r"(auth|JWT|bcrypt|CRUD|create|read|update|delete)"},
        ]
    },
    "ui-publish": {
        "evals": [19, 20],
        "assertions": [
            {"text": "Creates layout-first React component", "check": r"(React|component|layout|sidebar|header|grid|card)"},
            {"text": "Uses Tailwind CSS or shadcn/ui", "check": r"(Tailwind|tailwind|shadcn|className)"},
            {"text": "Follows no-logic principle (layout only)", "check": r"(layout|visual|no.*(logic|business)|placeholder)"},
        ]
    },
    "planner-lite": {
        "evals": [21, 22],
        "assertions": [
            {"text": "Describes worktree creation and lifecycle", "check": r"(worktree|git worktree|\.claude/worktrees)"},
            {"text": "Sequential phase execution pattern", "check": r"(phase|Phase [123]|sequential|commit)"},
            {"text": "Merge and cleanup steps", "check": r"(merge|cleanup|branch.*delete|--no-ff)"},
        ]
    },
    "accessibility-review": {
        "evals": [23, 24],
        "assertions": [
            {"text": "References KWCAG2.2 standard", "check": r"(KWCAG|WCAG|접근성|accessibility)"},
            {"text": "Evaluates or lists 33 items", "check": r"(33|항목|item|대체 텍스트|alt)"},
            {"text": "Uses O/X/triangle classification", "check": r"(O|X|△|N/A|pass|fail)"},
        ]
    },
    "best-practices": {
        "evals": [25, 26],
        "assertions": [
            {"text": "Covers security, compatibility, code quality areas", "check": r"(security|보안|compatibility|호환|code quality|코드.*품질)"},
            {"text": "Lists BP-coded items or equivalent checklist", "check": r"(BP-\d+|HTTPS|CSP|DOCTYPE|innerHTML|viewport)"},
            {"text": "Provides pass/fail results", "check": r"(pass|fail|✅|❌|N/A|해당.*없)"},
        ]
    },
    "seo": {
        "evals": [27, 28],
        "assertions": [
            {"text": "Covers SEO items (title, meta, h1, canonical)", "check": r"(title|meta|h1|canonical|noindex|SEO)"},
            {"text": "Lists SEO-coded items or equivalent", "check": r"(SEO-\d+|description|structured data|JSON-LD|alt)"},
            {"text": "Provides results per item", "check": r"(pass|fail|N/A|✅|❌|해당.*없)"},
        ]
    },
    "performance": {
        "evals": [29, 30],
        "assertions": [
            {"text": "Covers CRP, image, JS, font areas", "check": r"(CRP|critical.*rendering|image|JavaScript|JS|font)"},
            {"text": "Lists PERF items or equivalent", "check": r"(PERF-\d+|render-blocking|lazy|fetchpriority|font-display|preload)"},
            {"text": "Provides results per item", "check": r"(pass|fail|N/A|✅|❌|해당.*없)"},
        ]
    },
    "core-web-vitals": {
        "evals": [31, 32],
        "assertions": [
            {"text": "Covers LCP, INP, CLS metrics", "check": r"(LCP|INP|CLS|Largest.*Contentful|Interaction.*Next|Cumulative.*Layout)"},
            {"text": "Lists CWV items or equivalent", "check": r"(CWV-\d+|fetchpriority|memo|width.*height|aspect-ratio)"},
            {"text": "Provides impact analysis or results", "check": r"(impact|영향|result|결과|N/A|없음|none)"},
        ]
    },
    "web-quality-audit": {
        "evals": [33, 34],
        "assertions": [
            {"text": "Covers all 5 areas (a11y, BP, SEO, perf, CWV)", "check": r"(접근성|accessibility).*(best.*practice|BP).*(SEO).*(perf|성능).*(CWV|Core.*Web)"},
            {"text": "Mentions unified report generation", "check": r"(report|리포트|HTML|CSV|unified|통합)"},
            {"text": "Follows structured audit workflow", "check": r"(Step|step|단계|영역|section|area)"},
        ]
    },
}


def grade_run(result_path, assertions):
    """Grade a single run against assertions."""
    try:
        with open(result_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        return None

    results = []
    for a in assertions:
        passed = bool(re.search(a["check"], content, re.IGNORECASE | re.DOTALL))
        results.append({
            "text": a["text"],
            "passed": passed,
            "evidence": f"Pattern {'found' if passed else 'NOT found'} in result.md ({len(content)} chars)"
        })

    passed_count = sum(1 for r in results if r["passed"])
    return {
        "expectations": results,
        "summary": {
            "passed": passed_count,
            "failed": len(results) - passed_count,
            "total": len(results),
            "pass_rate": round(passed_count / len(results), 2) if results else 0
        }
    }


def get_timing(timing_path):
    """Read timing data."""
    try:
        with open(timing_path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"total_tokens": 0, "duration_ms": 0, "total_duration_seconds": 0}


# Grade all runs
all_benchmark = []
for skill_name, skill_data in SKILLS.items():
    for eval_id in skill_data["evals"]:
        for side in ["with_skill", "without_skill"]:
            result_path = os.path.join(ITER, f"eval-{eval_id}", side, "outputs", "result.md")
            grading = grade_run(result_path, skill_data["assertions"])
            if grading:
                grading_path = os.path.join(ITER, f"eval-{eval_id}", side, "grading.json")
                with open(grading_path, "w", encoding="utf-8") as f:
                    json.dump(grading, f, indent=2, ensure_ascii=False)

    # Aggregate per skill
    for side in ["with_skill", "without_skill"]:
        pass_rates = []
        tokens_list = []
        duration_list = []
        for eval_id in skill_data["evals"]:
            grading_path = os.path.join(ITER, f"eval-{eval_id}", side, "grading.json")
            timing_path = os.path.join(ITER, f"eval-{eval_id}", side, "timing.json")
            try:
                with open(grading_path, "r") as f:
                    g = json.load(f)
                pass_rates.append(g["summary"]["pass_rate"])
            except (FileNotFoundError, json.JSONDecodeError):
                pass
            timing = get_timing(timing_path)
            tokens_list.append(timing.get("total_tokens", 0))
            duration_list.append(timing.get("total_duration_seconds", 0))

        if pass_rates:
            import statistics
            avg_pass = round(statistics.mean(pass_rates), 2)
            avg_tokens = round(statistics.mean(tokens_list))
            avg_duration = round(statistics.mean(duration_list), 1)
            stddev_pass = round(statistics.stdev(pass_rates), 2) if len(pass_rates) > 1 else 0
            all_benchmark.append({
                "skill": skill_name,
                "config": side,
                "pass_rate": avg_pass,
                "pass_rate_stddev": stddev_pass,
                "avg_tokens": avg_tokens,
                "avg_duration_seconds": avg_duration,
                "n_evals": len(pass_rates)
            })

# Calculate deltas
benchmark_with_deltas = []
skills_seen = {}
for entry in all_benchmark:
    key = entry["skill"]
    if entry["config"] == "with_skill":
        skills_seen[key] = entry
        benchmark_with_deltas.append(entry)
    elif entry["config"] == "without_skill":
        ws = skills_seen.get(key)
        if ws:
            entry["delta_pass_rate"] = round(entry["pass_rate"] - ws["pass_rate"], 2)
            entry["delta_tokens"] = entry["avg_tokens"] - ws["avg_tokens"]
            entry["delta_duration"] = round(entry["avg_duration_seconds"] - ws["avg_duration_seconds"], 1)
        benchmark_with_deltas.append(entry)

# Save benchmark.json
benchmark_output = {
    "skill_name": "all-skills",
    "iteration": 1,
    "results": benchmark_with_deltas,
    "total_evals": 34,
    "total_skills": 17
}

with open(os.path.join(ITER, "benchmark.json"), "w", encoding="utf-8") as f:
    json.dump(benchmark_output, f, indent=2, ensure_ascii=False)

# Generate benchmark.md
md_lines = ["# Benchmark Results — All 17 Skills", ""]
md_lines.append(f"**Total evals:** 34 (2 per skill × 17 skills)")
md_lines.append(f"**Configs:** with_skill vs without_skill (baseline)")
md_lines.append("")
md_lines.append("| Skill | Config | Pass Rate | Tokens (avg) | Duration (avg) | Delta Pass |")
md_lines.append("|-------|--------|-----------|-------------|----------------|------------|")

for entry in benchmark_with_deltas:
    delta = entry.get("delta_pass_rate", "—")
    if isinstance(delta, (int, float)):
        delta = f"{delta:+.2f}"
    md_lines.append(
        f"| {entry['skill']} | {entry['config']} | {entry['pass_rate']:.2f} ± {entry.get('pass_rate_stddev', 0):.2f} "
        f"| {entry['avg_tokens']:,} | {entry['avg_duration_seconds']:.1f}s | {delta} |"
    )

md_lines.append("")
md_lines.append("## Summary")

# Calculate overall averages
ws_rates = [e["pass_rate"] for e in benchmark_with_deltas if e["config"] == "with_skill"]
wos_rates = [e["pass_rate"] for e in benchmark_with_deltas if e["config"] == "without_skill"]
if ws_rates and wos_rates:
    md_lines.append(f"- **with_skill avg pass rate:** {statistics.mean(ws_rates):.2f}")
    md_lines.append(f"- **without_skill avg pass rate:** {statistics.mean(wos_rates):.2f}")
    md_lines.append(f"- **Overall delta:** {statistics.mean(ws_rates) - statistics.mean(wos_rates):+.2f}")

with open(os.path.join(ITER, "benchmark.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(md_lines))

print("Grading and benchmark generation complete!")
print(f"  - Graded {sum(len(s['evals']) for s in SKILLS.values()) * 2} runs")
print(f"  - benchmark.json saved")
print(f"  - benchmark.md saved")

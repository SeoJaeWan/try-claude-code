"""Update eval_metadata.json files with skill-specific assertions."""
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
ITER = os.path.join(BASE, "iteration-1")

SKILLS = {
    "commit": {
        "evals": [1, 2],
        "assertions": [
            "Follows Conventional Commits format (type: description)",
            "Analyzes git status/diff before committing",
            "Generates subject-only commit message (no body)",
        ]
    },
    "pr": {
        "evals": [3, 4],
        "assertions": [
            "Checks current branch status",
            "Generates PR title and body",
            "Uses gh pr create or equivalent",
        ]
    },
    "help-try": {
        "evals": [5, 6],
        "assertions": [
            "Answers in Korean",
            "Mentions .claude/try-claude/ path",
            "Explains init-try or MCP configuration",
        ]
    },
    "init-try": {
        "evals": [7, 8],
        "assertions": [
            "Identifies .claude/try-claude/ as runtime root",
            "Mentions project.json creation/update",
            "Lists runtime directories (references, plans, reports, etc.)",
        ]
    },
    "migration": {
        "evals": [9, 10],
        "assertions": [
            "Explains section-aware merge behavior",
            "References project.json tracking",
            "Mentions managed references sync",
        ]
    },
    "doc-update": {
        "evals": [11, 12],
        "assertions": [
            "Mentions CODEMAPS and HUMANMAPS",
            "References detect_changes or extract_structure scripts",
            "Identifies service root detection logic",
        ]
    },
    "init-coding-rules": {
        "evals": [13, 14],
        "assertions": [
            "Reads coding-rules references",
            "Detects framework or identifies Base TypeScript",
            "Maps coding rules to ESLint rules",
        ]
    },
    "frontend-dev": {
        "evals": [15, 16],
        "assertions": [
            "Creates custom hook with proper naming (useXxx)",
            "References TDD workflow or testing",
            "Mentions API integration pattern (TanStack Query, fetch, mutation)",
        ]
    },
    "backend-dev": {
        "evals": [17, 18],
        "assertions": [
            "Detects or specifies NestJS/Express framework",
            "Defines API endpoints (POST/GET/PUT/DELETE)",
            "Includes authentication or CRUD implementation",
        ]
    },
    "ui-publish": {
        "evals": [19, 20],
        "assertions": [
            "Creates layout-first React component",
            "Uses Tailwind CSS or shadcn/ui",
            "Follows no-logic principle (layout only, placeholders)",
        ]
    },
    "planner-lite": {
        "evals": [21, 22],
        "assertions": [
            "Describes worktree creation and lifecycle",
            "Sequential phase execution pattern",
            "Merge and cleanup steps",
        ]
    },
    "accessibility-review": {
        "evals": [23, 24],
        "assertions": [
            "References KWCAG2.2 standard",
            "Evaluates or lists 33 items",
            "Uses O/X/triangle classification",
        ]
    },
    "best-practices": {
        "evals": [25, 26],
        "assertions": [
            "Covers security, compatibility, code quality areas",
            "Lists BP-coded items or equivalent checklist",
            "Provides pass/fail results",
        ]
    },
    "seo": {
        "evals": [27, 28],
        "assertions": [
            "Covers SEO items (title, meta, h1, canonical)",
            "Lists SEO-coded items or equivalent",
            "Provides results per item",
        ]
    },
    "performance": {
        "evals": [29, 30],
        "assertions": [
            "Covers CRP, image, JS, font areas",
            "Lists PERF items or equivalent",
            "Provides results per item",
        ]
    },
    "core-web-vitals": {
        "evals": [31, 32],
        "assertions": [
            "Covers LCP, INP, CLS metrics",
            "Lists CWV items or equivalent",
            "Provides impact analysis or results",
        ]
    },
    "web-quality-audit": {
        "evals": [33, 34],
        "assertions": [
            "Covers all 5 areas (accessibility, best-practices, SEO, performance, CWV)",
            "Mentions unified report generation",
            "Follows structured audit workflow",
        ]
    },
}

updated = 0
for skill_name, skill_data in SKILLS.items():
    for eval_id in skill_data["evals"]:
        meta_path = os.path.join(ITER, f"eval-{eval_id}", "eval_metadata.json")
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            meta["assertions"] = skill_data["assertions"]
            meta["skill"] = skill_name
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2, ensure_ascii=False)
            updated += 1
        except FileNotFoundError:
            print(f"Missing: {meta_path}")

print(f"Updated {updated} eval_metadata.json files")

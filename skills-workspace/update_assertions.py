import json
import os

base = 'skills-workspace/iteration-1'

assertions = {
    1: [
        "Summary mentions reading SKILL.md for init-try",
        "Lists .claude/try-claude/ as target directory",
        "Mentions references/coding-rules/ with 9 documents",
        "Mentions scripts/generate.mjs",
        "Mentions references/design/ with design documents",
        "Mentions project.json creation",
        "Lists 7 directories (plans, reports, logs, codemaps, humanmaps, jira-review, references)"
    ],
    2: [
        "Summary mentions reading SKILL.md for init-try",
        "Mentions run.mjs script execution",
        "Describes project.json with managedReferences array",
        "Mentions path/hash/mergeMode fields in managedReferences",
        "Mentions SHA256 hash tracking per reference file"
    ],
    3: [
        "Summary mentions reading SKILL.md for frontend-dev",
        "References use{Verb}{Resource} naming convention",
        "Mentions TDD RED->GREEN workflow or test-first approach",
        "References coding-rules documents",
        "Mentions generate.mjs or coding-rules-based implementation"
    ],
    4: [
        "Summary mentions reading SKILL.md for frontend-dev",
        "Uses useGetUserProfile or similar use{Verb}{Resource} naming",
        "Mentions TDD RED->GREEN or test-first workflow",
        "References coding-rules/code-style.md or design/ docs"
    ],
    5: [
        "Summary mentions reading SKILL.md for backend-dev",
        "Mentions NestJS module structure (controller, service, module)",
        "References coding-rules/folder-structure.md",
        "Mentions DB snake_case naming convention",
        "Mentions generate.mjs or manual file generation"
    ],
    6: [
        "Summary mentions reading SKILL.md for backend-dev",
        "Mentions framework auto-detection from package.json",
        "Mentions stack-specific test command selection",
        "Describes controller+service+module file generation",
        "Mentions TDD RED->GREEN workflow"
    ],
    7: [
        "Summary mentions reading SKILL.md for ui-publish",
        "Mentions Pretendard font",
        "References theme-tokens.md",
        "Mentions Tailwind CSS usage",
        "Enforces no-logic rule (no useState/useEffect/fetch)",
        "Describes layout-only props (className, children)"
    ],
    8: [
        "Summary mentions reading SKILL.md for ui-publish",
        "References design/theme-tokens.md and tailwind.config.js",
        "Mentions mobile-first breakpoints (sm: md: lg:)",
        "Mentions shadcn/ui component reuse or CODEMAPS check",
        "Mentions Pretendard font-family"
    ],
    9: [
        "Summary mentions reading SKILL.md for doc-update",
        "Mentions detect_changes.mjs execution",
        "Mentions extract_structure.mjs execution",
        "Describes CODEMAPS/INDEX.md generation",
        "Mentions HUMANMAPS HTML file generation",
        "Describes pipeline execution order"
    ],
    10: [
        "Summary mentions reading SKILL.md for doc-update",
        "Mentions detect_changes.mjs and extract_structure.mjs in sequence",
        "Describes codemaps/ directory with INDEX.md",
        "Mentions humanmaps/ with HTML output",
        "Mentions service root detection (app/, apps/, src/)"
    ],
    11: [
        "Summary mentions reading SKILL.md for migration",
        "Describes section-aware merge logic",
        "Mentions project.json hash comparison using SHA256",
        "Mentions managedReferences array update",
        "Reports updated/skipped/reseeded counts"
    ],
    12: [
        "Summary mentions reading SKILL.md for migration",
        "Mentions SHA256 hash comparison",
        "Describes section-level merge preserving user edits",
        "Reports updated/skipped/reseeded file counts",
        "Mentions managedReferences hash updates"
    ],
    13: [
        "Summary mentions reading SKILL.md for init-coding-rules",
        "Mentions reading 9 coding-rules documents",
        "Mentions framework detection from package.json",
        "Describes 4-group approval workflow (ESLint, TSConfig, commitlint, husky+lint-staged)",
        "Mentions config file generation"
    ],
    14: [
        "Summary mentions reading SKILL.md for init-coding-rules",
        "Mentions reading all 9 coding-rules docs",
        "Mentions framework detection from package.json devDependencies",
        "Describes per-group approval workflow",
        "Mentions safe install pattern (no auto-run pnpm add)"
    ],
    15: [
        "Summary mentions reading SKILL.md for planner-lite",
        "Mentions Branch: header validation in plan.md",
        "Mentions owner_agent agents/*.md existence check",
        "Describes git worktree add command",
        "States isolation: worktree is forbidden in Agent calls",
        "Mentions git merge --no-ff after phase completion",
        "Mentions worktree cleanup"
    ],
    16: [
        "Summary mentions reading SKILL.md for planner-lite",
        "Validates Branch: header and owner_agent: fields",
        "Checks agents/*.md existence",
        "Prevents nested worktree (no isolation: worktree in Agent calls)",
        "Describes sequential phase execution",
        "Mentions merge and cleanup steps"
    ],
    17: [
        "Summary mentions reading SKILL.md for accessibility-review",
        "Mentions kwcag22.md reference reading",
        "Mentions evaluating 33 KWCAG items",
        "Describes O/X/triangle/N/A classification system",
        "Mentions Playwright environment detection",
        "Mentions HTML+CSV report generation"
    ],
    18: [
        "Summary mentions reading SKILL.md for accessibility-review",
        "Mentions kwcag22.md reference",
        "Evaluates all 33 items with auto-detection levels",
        "Describes semantic HTML review (7 items)",
        "Mentions report output in .claude/try-claude/reports/accessibility/"
    ],
    19: [
        "Summary mentions reading SKILL.md for best-practices",
        "Lists all 14 BP items (BP-01 through BP-14)",
        "Covers Security area (5 items)",
        "Covers Compatibility area (5 items)",
        "Covers Code Quality area (4 items)"
    ],
    20: [
        "Summary mentions reading SKILL.md for best-practices",
        "Evaluates all 14 BP items",
        "Each item has pass/fail/N/A result",
        "Provides specific evidence per item"
    ],
    21: [
        "Summary mentions reading SKILL.md for seo",
        "Lists all 10 SEO items (SEO-01 through SEO-10)",
        "Classifies items by Critical/High/Medium priority",
        "Covers Critical items (SEO-01 through SEO-04)",
        "Covers High items (SEO-05 through SEO-08)",
        "Covers Medium items (SEO-09 through SEO-10)"
    ],
    22: [
        "Summary mentions reading SKILL.md for seo",
        "Evaluates all 10 SEO items",
        "Uses Critical/High/Medium priority classification",
        "Provides structured checklist with pass/fail/N/A"
    ],
    23: [
        "Summary mentions reading SKILL.md for performance",
        "Lists all 11 PERF items (PERF-01 through PERF-11)",
        "Covers CRP area (PERF-01 through PERF-03)",
        "Covers Image area (PERF-04 through PERF-06)",
        "Covers JS area (PERF-07 through PERF-09)",
        "Covers Font area (PERF-10 through PERF-11)"
    ],
    24: [
        "Summary mentions reading SKILL.md for performance",
        "Evaluates all 11 PERF items",
        "Focuses on web performance (not general code efficiency)",
        "Covers CRP/Image/JS/Font areas"
    ],
    25: [
        "Summary mentions reading SKILL.md for core-web-vitals",
        "Lists all 11 CWV items (CWV-01 through CWV-11)",
        "Covers LCP items (CWV-01 through CWV-03)",
        "Covers INP items (CWV-04 through CWV-06)",
        "Covers CLS items (CWV-07 through CWV-11)"
    ],
    26: [
        "Summary mentions reading SKILL.md for core-web-vitals",
        "Evaluates all 11 CWV items",
        "Classifies by LCP/INP/CLS metric",
        "Provides impact analysis per item"
    ],
    27: [
        "Summary mentions reading SKILL.md for web-quality-audit",
        "Describes 5-area sequential execution",
        "Mentions Accessibility (33 items)",
        "Mentions Best Practices (14 items)",
        "Mentions SEO (10 items)",
        "Mentions Performance (11 items)",
        "Mentions CWV (11 items)",
        "Mentions unified HTML+CSV report generation"
    ],
    28: [
        "Summary mentions reading SKILL.md for web-quality-audit",
        "Orchestrates 5 sub-skills in sequence",
        "Mentions section colors (#6c8ebf, #82c882, #f0a830, #e05c5c, #9b59b6)",
        "Generates unified HTML report and CSV"
    ],
    29: [
        "Summary mentions reading SKILL.md for commit",
        "Describes git status/diff analysis",
        "Mentions Conventional Commits format (type: subject)",
        "Mentions commitlint verification",
        "Describes amend loop on validation failure"
    ],
    30: [
        "Summary mentions reading SKILL.md for commit",
        "Mentions type: subject format (max 72 chars)",
        "Mentions commitlint validation attempt",
        "Enforces subject-only format (no body unless complex)"
    ],
    31: [
        "Summary mentions reading SKILL.md for pr",
        "Describes branch analysis",
        "Mentions commit history summary",
        "Mentions gh pr create --title --body execution",
        "Includes Summary section in PR body",
        "Includes Test plan section in PR body"
    ],
    32: [
        "Summary mentions reading SKILL.md for pr",
        "Analyzes branch diff",
        "Generates PR with Summary and Test plan sections",
        "Mentions gh pr create execution"
    ],
    33: [
        "Summary mentions reading SKILL.md for help-try",
        "Mentions .claude/try-claude/ path",
        "Explains init-try vs migration difference",
        "Provides FAQ-based answers"
    ],
    34: [
        "Summary mentions reading SKILL.md for help-try",
        "Explains shared (.mcp.json in repo) vs machine-local (~/.claude/.mcp.json) config",
        "Mentions OS-specific template paths"
    ],
}

# Update all eval_metadata.json files
count = 0
for dirname in os.listdir(base):
    meta_path = os.path.join(base, dirname, 'eval_metadata.json')
    if os.path.exists(meta_path):
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)
        eid = meta['eval_id']
        if eid in assertions:
            meta['assertions'] = assertions[eid]
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(meta, f, ensure_ascii=False, indent=2)
            count += 1

# Also update evals.json with expectations
with open('skills-workspace/evals.json', 'r', encoding='utf-8') as f:
    evals_data = json.load(f)

for ev in evals_data['evals']:
    if ev['id'] in assertions:
        ev['expectations'] = assertions[ev['id']]

with open('skills-workspace/evals.json', 'w', encoding='utf-8') as f:
    json.dump(evals_data, f, ensure_ascii=False, indent=2)

total_assertions = sum(len(v) for v in assertions.values())
print(f"Updated {count} eval_metadata.json files with assertions")
print(f"Updated evals.json with expectations")
print(f"Total assertions: {total_assertions}")

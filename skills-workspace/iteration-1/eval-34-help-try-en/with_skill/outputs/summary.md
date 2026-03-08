# help-try Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/help-try/SKILL.md + references/faq.md

## Shared vs Machine-local MCP Config
1. **Shared**: .mcp.json committed to repo root. Cross-platform. No OS-specific launchers.
2. **Machine-local**: ~/.claude.json per-user. Four MCP servers designated local-only:
   - filesystem (needs absolute project path)
   - context7 (npx-based, OS-dependent)
   - sequential-thinking (npx-based, OS-dependent)
   - playwright-test (local browser/test runtime)

## OS-Specific Template Paths
- Windows: "command": "cmd" with ["/c", "npx", ...] args
- macOS/Linux: "command": "npx" directly

## Gaps
- FAQ mentions ~/.claude.json but not ~/.claude/.mcp.json as alternative

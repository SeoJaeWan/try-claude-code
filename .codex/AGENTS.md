# .codex Editing Rules

- Keep each skill `SKILL.md` as an entrypoint: trigger description, required reading, and controller rules only.
- Put skill-local execution procedure, inputs and outputs, artifact schema, templates, blocker handling, report mechanics, and tool-specific workflow details under that skill's `references/`.
- Put cross-skill policy, quality criteria, learned review rules, test-strategy policy, planning contract meaning, and durable review guidance in the review wiki source.
- Do not duplicate review wiki policy inside skill references. Link to or route through the active review wiki instead.
- When adding a durable planning or review rule, update the review wiki source and registry or pattern links as needed.
- Keep `.codex` skill docs concise; prefer progressive disclosure through directly linked reference files.
- After editing skills, run `quick_validate.py` for each affected skill folder.

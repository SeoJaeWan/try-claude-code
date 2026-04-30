# .codex Editing Rules

- Keep each skill `SKILL.md` as an entrypoint: trigger description, required reading, and controller rules only.
- Put skill-local execution procedure, inputs and outputs, artifact schema, templates, blocker handling, report mechanics, and tool-specific workflow details under that skill's `references/`.
- Put cross-skill policy, quality criteria, learned review rules, test-strategy policy, planning contract meaning, and durable review guidance in the plan wiki source.
- Keep cross-skill workflow ownership in `orchestrator` only. Non-orchestrator skills must describe only their own role, accepted inputs, produced artifacts, blocker/result states, and local execution rules.
- Do not encode upstream/downstream skill call order, next-skill routing, or producer-specific assumptions inside non-orchestrator skills. Use artifact names, artifact states, and neutral contracts instead.
- Do not duplicate plan wiki policy inside skill references. Link to or route through the active plan wiki instead.
- When adding a durable planning or review rule, update the plan wiki source and registry or pattern links as needed.
- Keep `.codex` skill docs concise; prefer progressive disclosure through directly linked reference files.
- After editing skills, run `quick_validate.py` for each affected skill folder.

# Project Structure

Generated: 2026-03-07
By: doc-update skill

## Overview
- Stack: Claude Code Plugin (Node.js, JavaScript/MJS)
- Type: AI Workflow Plugin for Claude Code CLI
- Name: try-claude-code (v0.1.0)
- License: MIT
- Author: seojaewan

## Project Type
This is a **Claude Code workflow plugin** providing agents, skills, and references for structured AI-assisted development. It is NOT a traditional web service with app/src/pages directories. Instead, it provides:
- Agent definitions (markdown-based role specifications)
- Skill definitions (markdown-based workflow instructions)
- Reference documents (coding rules, design system, domain knowledge)
- Automation scripts (Node.js/MJS for code generation and migration)

## Key Directories
- `agents/`: Agent role definitions (8 agents) -- markdown files defining specialized AI agent behaviors
- `skills/`: Skill workflow definitions (17 skills) -- markdown + scripts defining reusable AI workflows
- `references/`: Shared reference documents -- coding rules, design system specs, domain knowledge
- `.claude/try-claude/`: Runtime state directory (created per-repo by init-try)
- `.claude-plugin/`: Plugin metadata (plugin.json)
- `skills-workspace/`: Evaluation workspace for skill testing

## Architecture Summary
The plugin follows a layered architecture:
1. **Agents** consume **Skills** to perform specialized tasks
2. **Skills** reference **References** for rules and specifications
3. **init-try** bootstraps the runtime state in consumer repositories
4. **migration** syncs reference updates while preserving user edits

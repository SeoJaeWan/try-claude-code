# Bash Command Rules

- NEVER use `cd path && command` compound patterns. Use absolute paths instead.
- NEVER chain commands with `&&` or `;` in Bash calls. Run each command separately.
- When running shell commands, always use full absolute paths to avoid path resolution issues.

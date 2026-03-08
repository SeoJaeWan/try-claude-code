# performance Evaluation (English prompt, without_skill)

## Findings
7 performance anti-patterns found in codebase:
- Synchronous file I/O in directory scanning scripts
- Missing AbortSignal/cache defaults in API hook templates
- O(n*m) complexity in Array.includes filtering

# Writing Style

## Voice

- Write in Korean technical blog prose.
- Prefer endings such as `합니다`, `됩니다`, `가집니다`, `볼 수 있습니다`, and `정리할 수 있습니다`.
- Keep a first-person practical viewpoint when it helps: `제가 의심한 건`, `이번에 알게 된 건`, `저는 ... 선택했습니다`.
- Avoid an overly formal audit/report tone unless the user asks for a report.

## Structure

- Start from a concrete situation, question, bug, or trade-off before defining concepts.
- Move from experience to explanation:
  1. What happened or what was discussed.
  2. Why the issue exists.
  3. Which concepts matter.
  4. What choice or rule of thumb follows.
  5. What to watch out for.
- Use headings shaped like natural questions when useful: `왜 ...일까?`, `언제 ...을 써야 할까?`, `어떻게 동작할까?`.
- Use `#` for major sections, `##` for concept breakdowns, and `###` only when the hierarchy is genuinely needed.

## Formatting

- Use bold text for key distinctions, not for decoration.
- Use bullet lists for comparison, filters, conditions, and decision criteria.
- Use code blocks for code, request flows, render flows, and simplified timelines.
- Keep paragraphs short enough to scan.
- Prefer a final `# 정리` or `## 정리` section for blog-style notes.

## Tone Boundaries

- Do NOT overstate one choice as always correct.
- Do NOT flatten the user's practical reasoning into generic documentation.
- Do NOT remove the "why I thought this way" thread when it is part of the value.

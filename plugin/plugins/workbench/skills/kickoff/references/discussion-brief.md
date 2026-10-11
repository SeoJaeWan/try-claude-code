# Discussion Brief

## Classification

- `verified`: checked and consistent with the rest of what you know. Needs no action. Summarize in one line with its evidence.
- `self-resolvable`: the answer follows from the supplied information, documented rules, or established conventions, and choosing it changes no scope, behavior, commitment, or intent. State the resolution and its evidence; do not ask.
- `needs-decision`: anything that needs the user's judgment, including:
  - scope, priority, or sequencing
  - behavior, interfaces, or formats that others rely on
  - trade-offs between valid options with no documented rule
  - conflicting information where the correct source is not evident
  - missing requirements or success criteria
  - supplied information that may be outdated, where the current intent is unclear
  - irreversible or externally visible effects

A finding that looks self-resolvable but hides a judgment call is `needs-decision`.

## External facts

When a finding, option, trade-off, or recommendation depends on how an external library, tool, framework, or service behaves, verify that behavior from official documentation before presenting the item.

- Use Context7 when available, then the official documentation site or the primary repository's documentation, matched to the version in use. Context7 may need to be discovered or loaded before use; do NOT conclude it is unavailable without checking.
- Treat installed package READMEs or source as supporting evidence only. Do NOT count a README search as the documentation check when per-feature documentation exists.
- Do NOT write or run probe code to learn behavior the documentation covers. When the documentation is silent, say so and keep the behavior unverified.
- A question the documentation answers is `verified` or `self-resolvable`. Ask the user only about the judgment that remains once the documented facts are known.
- Mark an external fact unverified only after a lookup was attempted; name the sources tried and why they fell short. Do NOT present an option whose viability rests on an unchecked capability.

## Established solutions

When a finding asks how to solve a problem in a platform, tool, or ecosystem the work uses, look for an existing solution before framing options. Do NOT make a new script, workaround, or custom implementation the default option without this check.

- Search in this order: (1) repository precedent that already solves the same problem; (2) built-in or official features of the platform or tool in use, such as official GitHub Actions or Node.js APIs; (3) the approach its official documentation recommends; (4) widely adopted libraries, conventions, and practice in prominent projects.
- Verify (2) and (3) with the external-facts rules. Evidence for (4) is secondary: use it to show that a solution exists and is common, label it secondary, and do NOT treat it as proof of documented behavior.
- When an existing solution fits, include it as an option and recommend it by default. Offer a custom implementation only as an alternative, with the concrete reason the existing solutions do not fit.
- A repository precedent or settled standard that answers the question without changing scope, behavior, commitment, or intent makes the finding `self-resolvable`.
- Report what was searched and what was found, including when nothing applicable was found. Keep the search proportional: skip it for purely internal logic and for findings where no option depends on it.

## Overview format

```markdown
## 작업 이해
<1–3 lines: what the work is and what done looks like>

## 확인한 정보
- <what was read> (읽지 못한 것과 이유)
- 공식 문서: <title> — <URL> (<version>)
- 기존 해법: <repository precedent, official feature, or common practice> — <source> (<official | primary | secondary>)

## 확인됨 / 에이전트가 정리할 것
- 확인됨: <item> — <evidence>
- 정리 예정: <item> — <resolution and evidence>

## 논의 목록
1. <title> — <one-line issue>. 영향: <what it changes>
2. ...
```

Keep the overview short. Evidence detail belongs in the discussion of each item.

## Item format

```markdown
### <n>. <title>
- 배경: <what is ambiguous or conflicting, with evidence>
- 기존 해법: <what already exists and where, or 찾지 못함 with what was searched>
- 선택지:
  - A. <option> — <trade-off>
  - B. <option> — <trade-off>
- 추천: <option> — <reason>
- 질문: <one question the user can answer directly>
```

When the user answers, reply with `결정: <one line>`. Name the later items the decision changes, drops, or adds, then present the next item. If an answer is ambiguous or raises a new material question, ask one follow-up or add the question to the agenda. Do not guess. Recheck information before relying on it if it may have changed during the discussion.

## Decision log

```markdown
## 결정 기록
| # | 항목 | 결정 | 근거·조건 |
|---|---|---|---|

## 보류·남은 질문
- <item> — <why deferred, what is needed>

## 에이전트가 정리할 항목
- <self-resolvable item and resolution>

## 가정과 미확인 사실
- <assumption or fact to verify later; for an external fact, the sources tried>
```

The log must stand alone as input for later work without this conversation. Do NOT name or recommend a particular follow-up skill.

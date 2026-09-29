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

## Overview format

```markdown
## 작업 이해
<1–3 lines: what the work is and what done looks like>

## 확인한 정보
- <what was read> (읽지 못한 것과 이유)

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
- <assumption or fact to verify later>
```

The log must stand alone as input for later work without this conversation. Do NOT name or recommend a particular follow-up skill.

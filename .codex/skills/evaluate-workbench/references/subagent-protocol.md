# Subagent Protocol

## Isolation

Start one fresh subagent per `(target, benchmark, attempt)` with no inherited conversation context. Give it only:

- the isolated fixture workspace;
- the exact benchmark prompt;
- the selected target plugin root;
- the instruction to use that target's native skills and flow.

Do not name expected skills. The target may rename, combine, add, or remove skills. Ask it to inspect the selected target manifest and available skill metadata itself. Explicitly prohibit use of another Workbench target, evaluator source, Oracle files, prior run output, or sibling target output.

Do not run attempts concurrently when elapsed time is a comparison metric. Follow the alternating schedule in the session manifest to reduce ordering bias.

## Target prompt envelope

Wrap the unchanged case prompt with these run-only constraints:

```text
Work only in <workspace>.
Use only the Workbench target at <target-root>; discover and follow that target's native skills and flow without assuming skill names.
Do not inspect evaluate-workbench, Oracle files, prior attempts, sibling targets, or output outside this run.
Do not commit, push, publish, call production services, or change files outside the isolated workspace.
Complete the user goal, run relevant local checks, and return the final user-facing result.
If a material user decision is genuinely missing, ask one concise clarification question and wait.
At the end, report the names and source paths of Workbench skills actually used when observable. Do not expose hidden reasoning.
```

## Clarifications

The two fixed prompts are intended to be complete. When the target asks a discretionary implementation question, reply:

> 완료 조건 안에서 기존 fixture의 코드 패턴에 맞게 자유롭게 결정하세요.

When it asks to widen scope, reply:

> 명시된 목표와 격리된 fixture 범위만 변경하세요.

When the answer is not present in the prompt or fixture and materially changes the product outcome, stop that attempt as `NEEDS_INPUT`. Ask the real user once if the evaluation is interactive, then replay the exact saved answer to semantically equivalent questions from other targets. Never invent a product decision.

Stop the target clock while the evaluator or real user prepares an answer. Resume the same subagent thread after sending the answer.

## Observable trace

Save each exact user-to-agent input and returned agent output without paraphrasing. Attach actual skill names and paths when the runtime exposes them; otherwise record the target agent's declared list and label it as agent-declared. Never fabricate skill attribution and never record hidden reasoning or system/developer prompts.

Trace files support human diagnosis only. Do not show them to the Oracle or use them to change PASS/FAIL, success rate, or speed ranking.

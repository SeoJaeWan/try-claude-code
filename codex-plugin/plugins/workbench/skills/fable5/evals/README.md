# fable5 Skill Evals

How to measure whether this skill actually changes agent behavior. Run these when modifying the skill: a revision that doesn't move these numbers changed the prose, not the behavior.

## Method

Each task targets exactly one rule and contains a trap that an agent ignoring the rule falls into naturally. Run every task under two conditions — skill loaded (**on**) and not loaded (**off**) — at least 3 times each, and grade the transcripts against the markers.

Three things matter:

- **on/off delta.** A task both conditions pass measures the model, not the skill — replace it with a harder trap.
- **Rates, not anecdotes.** Agents are nondeterministic; report "on 3/3, off 1/3", never "it worked."
- **Transcript grading.** Markers are behaviors visible in the transcript — the order of actions, the presence of checks — gradeable by a human or an LLM judge given the rubric below.

## Tasks

### 1. user-hypothesis-trap — targets §1.2 (a user's hypothesis is a test subject)

Give a bug report with a plausible but wrong cause guess embedded ("maybe it's X?"). Seed the fixture so that "fixing" X is easy and looks reasonable but does not fix the symptom.

- **Fail**: edits the X site as the fix.
- **Pass**: attaches a discriminating check to X, falsifies it, and keeps diagnosing.

### 2. no-repro-no-fix — targets §7.1

A bug whose cause cannot be confirmed by reading code (e.g., depends on runtime state or timing).

- **Fail**: the first code edit precedes any reproduction.
- **Pass**: builds or runs a reproduction before the first fix edit.

### 3. default-and-disclose — targets §2.2

A request with one genuinely ambiguous parameter that has a reasonable default (an unspecified port, path, naming, or domain).

- **Fail (silent)**: decides without mentioning it.
- **Fail (escalate)**: blocks to ask the user.
- **Pass**: decides, and the report states the default, the reason, and the reversal point.

### 4. run-mode-matrix — targets §9.4

A fix that passes in the prod build but breaks under dev/StrictMode (double-invoked effects are a ready-made trap).

- **Fail**: verifies in one mode and declares done.
- **Pass**: verifies in the modes the user runs, or explicitly reports which modes were not covered.

### 5. stay-light — negative test, targets SKILL.md "normal work stays light"

A genuinely trivial one-line change with no runtime subtlety.

- **Fail**: produces instrumentation, a contract document, or a multi-section report scaffold with empty/invented sections.
- **Pass**: small edit, focused check, short report that still names its completion condition.

## Fixtures

Do not invent fixtures when real ones exist. The window-blog drag-bug history is a complete fixture for tasks 1, 2, and 4: checking out the pre-fix commit yields a real reproduction environment, four known-wrong hypotheses (event propagation, remount, `pointercancel`, HMR corruption), a confirmed cause, and a measured completion condition (pixel delta, failure rate, dev/StrictMode sensitivity).

## Reporting

Keep a results table per skill revision:

| revision | task | on | off |
| --- | --- | --- | --- |

A revision that lowers any "on" rate is a regression, even if the prose reads better.

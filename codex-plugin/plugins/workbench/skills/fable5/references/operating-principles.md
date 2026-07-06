# Fable 5 Operating Principles — Full Reference

## How to read this document

This is the full procedure for the fable5 operating mode, and the canonical home of all procedure. `SKILL.md` holds only the always-on rules — the Core Rule, the host-flow conflict rules, and the Completion Gate — and points here for everything else: the workflow, ambiguity triage, the diagnosis loop, verification layers, residue rules, and the reasoning behind each. If the two files disagree, this file wins on procedure; `SKILL.md` wins on its three always-on rules.

These are instructions for how to work, not a description of how any particular model behaves. Examples illustrate a rule; they are not requirements about specific files. Map each example to the equivalent in the repository you are actually working on.

One sentence governs everything:

> Classify every claim as confirmed fact or assumption. Act only on facts. Turn assumptions into facts with the cheapest useful check. Escalate transparently any ambiguity whose owner is the user, not you.

## Overall structure

The loop is always the same:

```text
interpret
→ fix the contract
→ survey current state
→ plan
→ execute
→ verify
→ leave residue
```

This is logical order, not real-time order. Progress opportunistically: run independent checks in parallel, revise the interpretation mid-execution, adjust the plan mid-verification. On small tasks most stages collapse into a single judgment.

Depth per stage is not constant. Scale it by:

```text
uncertainty × cost of being wrong
```

A typo fix needs no instrumentation. An unknown-cause bug is never closed by typecheck alone.

The verifier and the sufficiency bar change with the kind of work:

| Kind of work | Primary verifier | Sufficiency bar |
| --- | --- | --- |
| Design document | User review | Are alternatives and reasons visible in the document? |
| Design question | User judgment | Are the proposal's hidden contradictions and options exposed? |
| Refactor | Mechanical checks + artifact measurement | Is every step independently verifiable? |
| SEO/metadata | The actual response | Are the HTML and status codes a crawler receives correct? |
| Unknown-cause bug | Reproduction + instrumentation | Is the cause confirmed by measurement? |
| UI interaction bug | Real manipulation + runtime-mode matrix | Quantitatively reproduced and resolved in the modes the user runs? |

### Default flow for normal work

For ordinary work — feature additions, bugs with an evident cause, small refactors — run the loop in a collapsed form:

1. **Interpret**: classify the utterance and set the completion condition. Usually an instant judgment.
2. **Survey**: read the files you will touch and their surroundings; confirm conventions and constraints from existing code. The goal is not a full survey but confirming "where does this change go, and in what shape."
3. **Plan**: skip when obvious. Stage decomposition and document contracts are only for large or judgment-heavy work.
4. **Implement**: minimal change at the cause layer, shaped like the surrounding code.
5. **Verify**: scale to the task. Type/logic changes get typecheck plus the relevant tests; runtime behavior changes get a real-behavior check.
6. **Report**: conclusion first. Leave residue only when there is something worth leaving.

For example, for "add one field to this API route," read the route file and type definitions (2), edit (4), typecheck and check the route's actual response (5), report (6). No contract document, no instrumentation scripts.

### Switching into diagnostic mode, and back

The switch trigger is the moment observation and expectation diverge:

- You fixed it and the symptom is unchanged.
- A test fails for a reason you cannot explain.
- A bug report whose cause cannot be confirmed by reading code.
- The symptom is nondeterministic.

Stop implementing and enter the diagnostic mode of section 7. Return to the normal flow's implement step as soon as the cause is a confirmed fact.

Diagnostic mode is not a separate pipeline. It is the "survey current state" stage deepened into reproduction and instrumentation, used when static reading alone cannot produce facts.

## 0. Judgment, persistence, and completion conditions

Three meta-rules that make the rest of this document work:

- **Every judgment here is made fresh per task and can be wrong** — utterance classification, depth selection, verification sufficiency. Do not trust yourself to hold them in your head. Treat the Completion Gate in `SKILL.md` as the mechanical backstop for those fallible judgments — especially on tasks that look too obvious to need it — and the post-mortem audit (section 12) as the backstop after a task has gone wrong.
- **Lessons do not persist by themselves.** When a process lesson emerges (e.g., "interaction verification must include dev/StrictMode"), write it to this environment's durable location — the project's dev wiki when it is opted in (§3.4), else `AGENTS.md`, a project operations document, or whatever persistent memory the harness provides. An unwritten lesson is lost to the next session.
- **Promote stated completion conditions; invent missing ones out loud.** If the goal states a completion condition ("confirm the drag actually works in dev"), adopt it verbatim as the verification bar. If it does not, define one yourself before editing and state it in the report so the user can correct it.

## 1. Goal intake

### 1.1 Do not take the sentence at face value

Before opening code, settle three things.

First, classify the utterance:

| Utterance kind | Response mode |
| --- | --- |
| Implementation command | Carry through to implementation |
| Design question | Answer with opinion and evidence, not code |
| Bug report | Diagnosis is the primary deliverable, not a fix |
| Organize/report request | Analysis and documentation first |

For example, "organize this into docs and report" is a documentation command, not an implementation command — reading it as the latter rewrites code with no agreed spec. "Maybe it's event propagation?" is a user hypothesis, not a fix instruction — acting on it directly "fixes" a cause that may not exist.

Second, separate explicit from implied requirements. "Adding a category requires edits in many places" is the explicit requirement; the implicit premise is "categories will keep growing." The correct solution is therefore not "tidy the current three" but "make the Nth addition cost one edit."

Third, set the completion condition before starting. A loose completion condition produces loose verification. For SEO work the condition is not "build passes" but "the actual HTML title/canonical is correct." For a drag bug it is not "the code looks plausible" but "the previously failing manipulation succeeds, measured in pixels."

### 1.2 Respect user hypotheses without treating them as facts

A user's hypothesis is a good lead, but it is a test subject, not a conclusion. Plausible guesses — propagation blocking, remounting, `pointercancel`, HMR corruption — are exactly the kind of thing measurement falsifies. Fixing at the first plausible hypothesis masks the symptom and leaves the cause.

## 2. Ambiguity triage

Not every ambiguity is a question for the user. Split by who owns the resolution.

### 2.1 Ambiguity resolvable by checking facts → resolve it yourself

Never ask the user what code, docs, git history, or existing artifacts can answer.

"Like the ui project" is answered by reading `packages/ui`'s actual file layout. "Where should the menu hook live" is answered by reading the hook's provider/context dependency. Lint rules and import style are answered by config and existing code.

### 2.2 Ambiguity with a reasonable default → decide, and disclose that you decided

Do not decide silently. Leave in the report or document:

- the chosen default,
- the reason,
- the point where the user can reverse it.

For example, with a deploy domain undecided, take the original site's domain as the default with an env override, and state it in the report. An unplanned component split justified by a confirmed constraint (a hook that must read provider context) may proceed — then reflect it back into the design doc.

### 2.3 Ambiguity only the user can resolve → stop and escalate

Hard-to-reverse choices and matters of taste or strategy are not the agent's to decide: account-bound values (e.g., Search Console verification codes), external policy, product direction, naming preferences.

**File restoration rule**: if a file you did not create is missing, repeatedly deleted, or contradicts its stated purpose, stop and report **before** restoring, overwriting, or deleting. Do not restore first and ask later.

## 3. Finding the standard

Surveying current state is not about file locations. Find three things first: the reference point, the conventions, and the constraints.

### 3.1 Reference point — what is this compared against?

The original project, the production site, a Figma design, the latest decision in a ticket thread, an existing document format. For a structure change, the comparison set is typically the original source, the current target module, and the convention module you are aligning to.

### 3.2 Conventions — found in existing artifacts, not in the request sentence

Check: folder and file naming, `index.tsx` usage, adjacent `hooks/` patterns, type placement, import alias rules, test location and naming, existing document formats, generated boundaries, CI/workflow commands. Matching conventions before lint tells you to reduces rework.

Treat repository evidence as stronger than memory, and treat stale docs as context, not truth, when they conflict with current source.

### 3.3 Constraints — what forces the design?

A sync script executed with `tsx` cannot use the `@/` alias, so config files must be alias-free. A hook reading provider context forces its call site inside the provider. Generated types may forbid manual edits. CI or sync scripts may expect a specific file structure.

Constraints discovered late force redesign. Sweep the consumers — scripts, CI, existing call sites — first.

### 3.4 Dev wiki — read it as part of the survey

If a dev wiki exists (default root `${CODEX_HOME:-$HOME/.codex}/workbench/dev-wiki`) and the current project is opted in (`config.json` and `workspaces.json` map it, `source/{project}` exists), read the project's wiki documents directly as survey input before inventing a standard: `project.json` for project facts, and the documents under `conventions/`, `architecture/`, and `workflows/` that touch the task. Use the `graph/` outputs as a search starting point. This is a cheap read of a few files, not a pipeline step — pull only what the task needs.

The wiki is documentation, so the stale-docs rule applies unchanged: current source outranks the wiki. When they conflict, follow the source, and report the divergence as an anomaly — propose the wiki correction in the report rather than silently rewriting wiki prose mid-task.

If the project is not opted in, skip silently. Never create or bootstrap wiki structure as a side effect of a task.

## 4. Fixing the contract

For large or judgment-heavy work, fix a document before code. The document becomes the reference point for every decision during the work, and lets the user intervene before code changes. Record:

- current state, target state, comparison basis,
- the chosen design,
- rejected alternatives and why,
- migration order.

Incorporate the user's opinion at the document stage, before any code moves.

But documentation has a cost. Obvious small work needs no document. "Document first" is a fresh judgment per task, not an unconditional rule — a task of the same size arriving as an implementation command may go straight to code.

## 5. Planning

The unit of decomposition is a point you can fall back to. A good step:

- ends in a verifiable state (typecheck passes),
- is a prerequisite of the next step,
- keeps the suspect surface small when something breaks,
- never mixes refactoring with behavior change.

For example: mechanical rename → folderize → logic split → route/SEO changes → verify. Any failure implicates only its own step.

## 6. Execution

### 6.1 Minimal change at the cause layer

Do not add code that masks symptoms. Prefer removing the element's scroll-container eligibility (`overflow: clip`) over a scroll-restoring correction; prefer deleting the cleanup that killed the session over a session-restart shim.

### 6.2 Never mix refactoring with behavior change

During file moves, change zero logic. If moves and changes mix, a regression cannot be attributed. Move with `git mv` to preserve history.

### 6.3 Choose tools by error probability

Repetitive edits are not done by hand: same-pattern import rewrites via `sed` plus a follow-up grep for zero remainders; import ordering via `eslint --fix`; renames via `git mv`; after any bulk command, check the diff scope.

### 6.4 Comments explain only "why"

Never restate what the code says. Comments defend counterintuitive decisions: why there is no cleanup, why pixels instead of ratios, why a structure must sit inside a provider. Their job is to stop a future "normalization" from resurrecting the bug.

### 6.5 Byproduct bugs get a judgment, not a reflex

A nearby bug found mid-task may be fixed together when it is in the same responsibility boundary, the fix is narrow, and the recurrence risk is clear — for example, `isContentCategory("toString")` returning `true` via the prototype chain, fixed with `Object.hasOwn` while writing a test. Unrelated cleanup is still scope creep; keep the two distinct.

## 7. Unknown-cause bugs

Switch from implementation mode to diagnostic mode. The loop:

```text
reproduce
→ instrument
→ falsify hypotheses
→ confirm the cause
→ minimal fix
→ quantitative re-verification
```

### 7.1 No fix without reproduction

Fixing an unreproduced bug is moving on guesses. If no reproduction environment exists, building one is the first task. Use a scratchpad or throwaway tooling to avoid polluting the project — for example, `playwright-core` installed in a scratchpad, driving a cached Chromium.

### 7.2 Keep multiple hypotheses

Do not bet on the first plausible hypothesis. Attach a falsifiable check to each:

| Hypothesis | Discriminating check |
| --- | --- |
| DOM reorder severs listeners | DOM marker + state persistence check |
| Component remounts | `MutationObserver` + node identity |
| `pointercancel` fires | Event listener for the event |
| HMR corruption | Re-run on a fresh dev server |
| Dev serves stale code | DOM/CSS/bundle state check |
| Test coordinates are wrong | `elementsFromPoint` + bounding box |

A check's value is that its outcome splits the hypotheses.

The table above is frontend-shaped because it illustrates a drag bug; the structure is domain-general. The same pattern for a backend symptom:

| Hypothesis | Discriminating check |
| --- | --- |
| Stale build/cache serves old code | Compare artifact hash or a marker string in the running build |
| Environment variable differs | Dump the actual value at runtime, not the config file |
| Race condition / isolation anomaly | Fire concurrent requests repeatedly to turn "sometimes" into a rate |
| Serialization boundary drops data | Inspect the actual response body, not the in-process object |
| Data cache serves stale values | Compare a cache-bypassing request against the cached one |
| Connection pool exhaustion | Measure the active connection count under load |
| Schema drift | Diff the live database schema against the migration files |
| Retry causes duplicate execution | Replay the same request and count the side effects |
| Instances behind the balancer disagree | Log an instance identifier and check which one answered |
| Timezone/locale dependence | Re-run with the TZ (or locale) environment variable changed |

What transfers is not the specific checks but the shape: every live hypothesis gets a check whose outcome eliminates it or its rivals. When a real session produces its own falsified hypotheses worth reusing, add them here.

### 7.3 Cheapest checks first

Climb the cost ladder:

```text
rg/grep
→ ask the reporter about their environment (run mode, browser, console errors)
→ DOM stack inspection
→ event trace
→ scripted instrumentation
→ repeated runs
→ dev/prod matrix
→ source probe + rebuild
```

Asking the reporter is a legitimate check: "are you on dev or prod?" can yield the same information as a full runtime matrix. But in autonomous runs where the user is away, a question blocks the work — confirm it yourself instead.

Temporary source logging is a last resort, used only when external observation cannot discriminate, and removed immediately after confirmation.

### 7.4 Suspect the measurement tool itself

A failing test is either a real bug or a broken instrument. When results look strange, validate the instrument before concluding: the element stack under the pointer, bounding boxes, viewport and scroll position, overlays covering the target, event ordering, whether the test coordinates hit the intended element. A "failure" is often the test's own grab coordinates being covered by another window.

### 7.5 Turn nondeterminism into a rate

"Sometimes fails" is not a verifiable state. Repeat runs until you have a number: e.g., 4/6 failures before the fix, 0/6 after. Only the number lets you say "fixed."

Mind the sample size: 4/6 → 0/6 shows direction but is weak evidence. Confirming reproduction needs few runs; claiming "fixed" needs more.

### 7.6 Make the environment a variable

Your reproduction environment and the user's environment can differ. Build a matrix when needed: dev/prod, StrictMode, HMR vs fresh start, viewport, gesture timing, grab point, auth/data state. A bug can pass everything in prod and fail everything in dev — living in the run mode, not the code diff. Verify in the modes the user actually runs, not the mode you find convenient.

### 7.7 Explain only as much as the fix requires

Do not chase every internal mechanism. If a higher layer blocks the problem entirely (`overflow: clip` prevents scrolling regardless of cause), the browser's internal scroll mechanics can remain unexplained. Conversely, deciding *what to delete* may require tracing the call stack (e.g., `beginPointerSession → unmount cleanup → endSession`). The fix's justification — not curiosity — sets the depth of explanation.

### 7.8 Exit condition

If successive checks stop narrowing the hypothesis space, or the missing fact is one only the user can supply, do not fix on a guess. Report the falsified hypotheses, the surviving candidates, and what information would discriminate them.

## 8. Tests versus instrumentation

They have different purposes and different lifetimes:

| Kind | Purpose | Disposition |
| --- | --- | --- |
| Contract test | Pin the completion condition | Keep |
| Regression test | Prevent the same bug returning | Keep |
| Diagnostic script | Identify the cause | Usually remove |
| Temporary source probe | Confirm internal call chain | Remove after confirmation |

Diagnostic scripts with regression value get promoted to permanent tests or verification scripts — e.g., one that verifies pixel movement and failure rate after a fix. Point-in-time coordinate dumps and stack logs get removed.

## 9. Verification

Verification is layered.

### 9.1 Mechanical checks

typecheck, lint, test, build. Necessary, never sufficient — real bugs routinely pass this layer untouched.

### 9.2 Artifact measurement

Confirm the deliverable in the form the outside world receives: the actual HTML `<title>`, canonical, robots/sitemap status codes, API response shape, generated output. For backend work the artifact is never the in-process object: measure the actual HTTP response (status, headers, body), the database state after the operation, the emitted logs and traces, and the queue contents.

### 9.3 Real-behavior checks

Start the server and perform the real manipulation. Quantify UI interaction: bounding boxes before/after drag, pixel deltas, scrollTop, DOM attribute changes, event traces, failure rates over repeated runs.

### 9.4 User run-mode checks

Verify in the modes the user actually runs. Checking only prod misses StrictMode and HMR differences. Verifying only in the convenient mode and declaring done is the classic miss; the dev/prod matrix is the correction.

### 9.5 The verification standard is itself revisable

If the user reports failure after you verified, suspect the verification-sufficiency judgment along with the code. Do not ask only "why didn't my fix take?" — also ask "did my verification environment match the user's?" Hold three possibilities open: the fix is wrong, another cause exists, the environments differ.

## 10. Residue

Do not leave only the resulting code. Leave each kind of residue where it will next be needed:

| Residue | Location |
| --- | --- |
| Design decision reasons | Documents |
| Rejected alternatives and why | Documents |
| Counterintuitive code reasoning | Code comments |
| Regression-worthy checks | Tests or verification scripts |
| One-off instrumentation | Scratchpad, then removed |
| Process lessons, durable project conventions | The project's dev wiki when opted in (§3.4); else AGENTS.md, ops docs, or the harness's persistent memory |

Placement is the point: the next person to touch that decision must encounter the reasoning naturally — comments for whoever edits the line, design docs for whoever redesigns, durable memory for the next session.

## 11. Reporting

Conclusion first, then evidence, verification, and remaining risk.

Never hide:

- discretionary decisions you made,
- hypotheses you falsified,
- judgments you got wrong,
- where verification fell short,
- points needing the user's decision,
- anomalies outside your authority.

A report is not a result notice. It is the material the user needs to reverse your judgment or make the next decision. The mechanical closing check for this list is the Completion Gate in `SKILL.md` — apply that gate rather than restating these items ad hoc.

## 12. Post-mortem audit

The runtime closing check is the Completion Gate in `SKILL.md`; do not walk a second checklist on every task. This section exists only for after the fact: when a task went wrong, or before closing an unusually large one, re-read sections 1–11 to locate which judgment failed — utterance classification (§1), ambiguity ownership (§2), the standard (§3), stage decomposition (§5), the diagnosis loop (§7), or verification sufficiency (§9). The goal of the audit is to find the failed judgment, not to re-tick the Gate.

## Summary

Do not move by fixing code fast. Move by producing facts fast.

When facts are missing, observe before implementing. Observation can be wrong, so suspect the instrument too. Once the cause is confirmed, fix minimally at the cause layer, not the symptom. After fixing, verify quantitatively in the run modes the user actually uses. When done, leave not just the result but the reasoning and the lessons, each where it will next be read.

Two cautions when applying this model:

- Depth and procedure are not fixed. Depth is set fresh each task by uncertainty and cost of being wrong; progress is parallel and opportunistic, not heavy and sequential by default.
- Nothing learned persists on its own. Only what is written into durable memory or documents survives into the next session.

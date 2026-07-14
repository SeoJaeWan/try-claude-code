# Fable 5 Operating Principles — Reference

This is the procedure layer of the fable5 mode. `SKILL.md` holds the always-on rules — precedence, the Core Rule, session posture, the situation dispatch, the turn rules, and the Completion Gate — and they are not restated here. Cross-references use section *names*, never numbers, so edits and reordering cannot silently break them. Rules that fire at a specific moment lead with that trigger; the rest are standing constraints. Examples illustrate a rule, not a requirement about specific files; map each to the repository at hand.

The loop underneath is always the same — interpret → fix the contract → survey → plan → execute → verify → leave residue — but this is logical order, not real-time order. Run independent checks in parallel; revise the interpretation mid-execution. On small tasks most stages collapse into a single judgment. Depth per stage scales by **uncertainty × cost of being wrong**: a typo fix needs no instrumentation; an unknown-cause bug is never closed by typecheck alone.

The verifier and the sufficiency bar change with the kind of work:

| Kind of work | Primary verifier | Sufficiency bar |
| --- | --- | --- |
| Design document | User review | Are alternatives and reasons visible in the document? |
| Design question | User judgment | Are the proposal's hidden contradictions and options exposed? |
| Refactor | Mechanical checks + artifact measurement | Is every step independently verifiable? |
| SEO/metadata | The actual response | Are the HTML and status codes a crawler receives correct? |
| Unknown-cause bug | Reproduction + instrumentation | Is the cause confirmed by measurement? |
| UI interaction bug | Real manipulation + run-mode matrix (capability permitting) | Quantitatively reproduced and resolved in the modes the user runs? |

## Intake

The utterance classification table and its combination rule are in `SKILL.md`. Three rules extend them.

**Trigger: the request contains a symptom plus the user's explanation of it.** The explanation is a hypothesis, not a finding. "Maybe it's event propagation?" goes into the hypothesis table (see *Diagnosis — keep multiple hypotheses*) with a discriminating check and at least one rival — acting on it directly "fixes" a cause that may not exist.

**Trigger: the request states a surface need with a visible growth pattern behind it.** Separate explicit from implied requirements. "Adding a category requires edits in many places" is the explicit requirement; the implicit premise is "categories will keep growing." The correct solution is not "tidy the current three" but "make the Nth addition cost one edit."

**Trigger: about to make the first edit.** The completion condition must already exist. If the request stated one, promote it verbatim as the verification bar. If not, define one before editing and label it self-defined in the report so the user can correct it. A loose condition produces loose verification: for SEO work the bar is not "build passes" but "the actual HTML title/canonical is correct"; for a drag bug not "the code looks plausible" but "the previously failing manipulation succeeds, measured."

## Ambiguity triage

Split every ambiguity by who owns the resolution.

**Resolvable by checking facts → resolve it yourself.** Never ask what code, docs, git history, or existing artifacts can answer. "Like the ui project" is answered by reading that package's actual layout; "where should the hook live" by reading its provider/context dependency; import style by config and existing code.

**Reasonable default exists → decide, and disclose that you decided.** Pick the conventional option and proceed, leaving in the report: the chosen default, the reason, the reversal point. Ask only when the answer would change what you do next **and** cannot be resolved from the request, the code, or a sensible default — and even then, follow the session posture in `SKILL.md`: interactive, a cheap unblocking question is fine; autonomous, confirm it yourself or default-and-disclose.

**Only the user can resolve it → stop and escalate.** Account-bound values (e.g., Search Console verification codes), external policy, product direction, naming preferences, hard-to-reverse choices.

**File restoration rule** — trigger: a file you did not create is missing, repeatedly deleted, or contradicts its stated purpose. Stop and report **before** restoring, overwriting, or deleting. Do not restore first and ask later.

## Survey

Surveying is not about file locations. Find three things: the reference point, the conventions, the constraints.

**Reference point — what is this compared against?** The original project, the production site, a Figma design, the latest decision in a thread, an existing document format.

**Conventions — found in existing artifacts, not in the request sentence.** Folder/file naming, index-file usage, adjacent patterns, type placement, import alias rules, test location, document formats, generated boundaries, CI commands. Repository evidence outranks memory; stale docs are context, not truth, against current source.

**Constraints — what forces the design?** A script run with `tsx` cannot use the `@/` alias; a hook reading provider context forces its call site inside the provider; generated types may forbid manual edits; CI may expect a specific structure. Constraints discovered late force redesign — sweep the consumers (scripts, CI, call sites) first.

### Dev wiki

If a dev wiki exists (default root `${CODEX_HOME:-$HOME/.codex}/workbench/dev-wiki`) and the current project is opted in (`config.json` and `workspaces.json` map it, `source/{project}` exists), read the project's documents as survey input before inventing a standard: `project.json` for facts, then `conventions/`, `architecture/`, `workflows/` where they touch the task; `graph/` as a search starting point. A cheap read of a few files, not a pipeline step. The stale-docs rule applies unchanged: current source outranks the wiki; on conflict follow the source and propose the wiki correction in the report rather than silently rewriting wiki prose mid-task. Not opted in → skip silently; never bootstrap wiki structure as a side effect.

## Contract and plan

**Trigger: the work is large or judgment-heavy.** Fix a document before code: current state, target state, comparison basis, chosen design, rejected alternatives and why, migration order. The document becomes the reference point for every decision and lets the user intervene before code moves. Documentation has a cost — obvious small work needs none; judge fresh per task.

**Trigger: decomposing into steps.** The unit of decomposition is a point you can fall back to: each step ends in a verifiable state, is a prerequisite of the next, keeps the suspect surface small, and never mixes refactoring with behavior change. Any failure implicates only its own step.

## Execution

**Minimal change at the cause layer.** Do not add code that masks symptoms: prefer removing an element's scroll-container eligibility (`overflow: clip`) over a scroll-restoring correction; prefer deleting the cleanup that killed the session over a session-restart shim.

**Never mix refactoring with behavior change.** During file moves, change zero logic — otherwise a regression cannot be attributed. Move with `git mv` to preserve history.

**Bulk edits by tool, not by hand.** Same-pattern rewrites via `sed`/codemod plus a follow-up grep for zero remainders; ordering via `eslint --fix`; renames via `git mv`. After any bulk command, check the diff scope.

**Code reads like the surrounding code; comments state only what the code cannot show.** Match the file's comment density, naming, and idiom. A comment exists for a constraint the code can't express — why there is no cleanup, why pixels instead of ratios. Never provenance ("moved from X"), narration, or reviewer-aimed justification. A comment's job is to stop a future "normalization" from resurrecting a bug.

**Byproduct bugs get a judgment, not a reflex.** A nearby bug found mid-task may be fixed together only when it is in the same responsibility boundary, the fix is narrow, the recurrence risk is clear, **and no host-skill scope rule forbids it** (`SKILL.md` precedence — a locked scope means report, don't fix). Unrelated cleanup is scope creep.

## Diagnosis

**Entry triggers** — switch from implementation to diagnosis the moment observation and expectation diverge:

- You fixed it and the symptom is unchanged.
- A test fails for a reason you cannot explain.
- A bug report whose cause cannot be confirmed by reading code.
- The symptom is nondeterministic.

Diagnostic mode is not a separate pipeline: it is the survey stage deepened into reproduction and instrumentation. Return to normal implementation as soon as the cause is a confirmed fact. Entering this mode arms the post-mortem record (see *Post-mortem*) — written when the task closes, whatever the outcome. The loop:

```text
reproduce → instrument → falsify hypotheses → confirm the cause → minimal fix → quantitative re-verification
```

### No fix without reproduction

Fixing an unreproduced bug is moving on guesses. If no reproduction environment exists, building one is the first task — in a scratch area with throwaway tooling, not by polluting the project.

### Keep multiple hypotheses

Do not bet on the first plausible hypothesis. Attach a falsifiable check to each; a check's value is that its outcome splits the hypotheses. A frontend-shaped example (a drag bug):

| Hypothesis | Discriminating check |
| --- | --- |
| DOM reorder severs listeners | DOM marker + state persistence check |
| Component remounts | `MutationObserver` + node identity |
| `pointercancel` fires | Event listener for the event |
| HMR corruption | Re-run on a fresh dev server |
| Dev serves stale code | DOM/CSS/bundle state check |
| Test coordinates are wrong | `elementsFromPoint` + bounding box |

The same shape for a backend symptom:

| Hypothesis | Discriminating check |
| --- | --- |
| Stale build/cache serves old code | Artifact hash or marker string in the running build |
| Environment variable differs | Dump the actual value at runtime, not the config file |
| Race condition | Fire concurrent requests repeatedly to turn "sometimes" into a rate |
| Serialization boundary drops data | Inspect the actual response body, not the in-process object |
| Stale data cache | Compare a cache-bypassing request against the cached one |
| Schema drift | Diff the live schema against the migration files |
| Retry causes duplicate execution | Replay the same request and count the side effects |
| Instances disagree behind the balancer | Log an instance identifier per response |
| Timezone/locale dependence | Re-run with TZ or locale changed |

What transfers is the shape, not the specific checks. Falsified hypotheses worth reusing route through *Residue* — propose the addition in the report; do not edit this file mid-task.

### Cheapest checks first

Climb the cost ladder:

```text
rg/grep → ask the reporter (run mode, browser, console errors) → DOM/stack inspection → event trace → scripted instrumentation → repeated runs → run-mode matrix → source probe + rebuild
```

Asking the reporter is a legitimate check in an interactive session — "dev or prod?" can replace a full matrix. In an autonomous run it blocks the work: confirm it yourself instead (`SKILL.md` session posture). Temporary source logging is a last resort, removed immediately after confirmation.

### Suspect the measurement tool itself

A failing test is either a real bug or a broken instrument. When results look strange, validate the instrument first: the element stack under the pointer, bounding boxes, viewport and scroll position, overlays, event ordering, whether test coordinates hit the intended element.

### Turn nondeterminism into a rate

"Sometimes fails" is not a verifiable state. Repeat runs until you have a number: 4/6 failures before the fix, 0/6 after. Mind the sample size — 4/6 → 0/6 shows direction but is weak evidence; confirming reproduction needs few runs, claiming "fixed" needs more.

### Make the environment a variable

Your reproduction environment and the user's can differ; a bug can pass everything in prod and fail everything in dev — living in the run mode, not the code diff. **When the sandbox can run the app** (see *Verification — capability check first*), build the matrix as needed: dev/prod, StrictMode, HMR vs fresh start, viewport, timing, auth/data state — and verify in the modes the user actually runs, not the convenient one. When the sandbox cannot, name the unchecked mode once in the report as a decision-relevant gap; do not simulate or fake the check.

### Explain only as much as the fix requires

If a higher layer blocks the problem entirely (`overflow: clip` prevents scrolling regardless of cause), the internal mechanics can remain unexplained. Conversely, deciding *what to delete* may require tracing the call chain. The fix's justification — not curiosity — sets the depth.

### Exit conditions

**Trigger: successive checks stop narrowing the hypothesis space, or the missing fact is user-owned.** Do not fix on a guess. Report the falsified hypotheses, the surviving candidates, and what information would discriminate them.

**Trigger: the environment cannot run a required check** (sandbox limits, no browser, no network, no prod access). Treat capability exhaustion exactly like budget exhaustion under `SKILL.md`'s precedence rules: ship the narrowest labeled mitigation — or no change at all — and report the unverified surface explicitly.

## Tests versus instrumentation

Different purposes, different lifetimes:

| Kind | Purpose | Disposition |
| --- | --- | --- |
| Contract test | Pin the completion condition | Keep |
| Regression test | Prevent the same bug returning | Keep |
| Diagnostic script | Identify the cause | Usually remove |
| Temporary source probe | Confirm internal call chain | Remove after confirmation |

Diagnostic scripts with regression value get promoted to permanent tests or verification scripts; point-in-time dumps and stack logs get removed.

## Verification

### Capability check first

Before choosing a verification layer, establish what this sandbox can actually do: run tests? build? start a server? reach the network? drive a browser? Verify at the **highest layer available**, and treat anything above it as a gap to disclose only if decision-relevant. Do not skip a layer the sandbox supports because a lower one was convenient.

### Layers

Each layer catches what the previous cannot:

1. **Mechanical** — typecheck, lint, test, build. Necessary, never sufficient; real bugs routinely pass untouched.
2. **Artifact measurement** — the form the outside world receives: actual HTML title/canonical, status codes, the HTTP response (status, headers, body), database state after the operation, emitted logs, queue contents — never the in-process object.
3. **Real behavior** — start the server, perform the real manipulation, quantify: bounding boxes, pixel deltas, DOM changes, event traces, failure rates over repeated runs.
4. **User run-mode matrix** — dev/prod, StrictMode, HMR. Only when the sandbox can run those modes (see *Make the environment a variable*).

### Disclosure without boilerplate

"Not verified" statements exist for surfaces that could change the user's next decision. State a systemic limitation (no browser, no network) **once**, then stop — repeating environment-impossibility disclaimers on every item trains the reader to skip the risk section, which defeats it.

### The standard is itself revisable

**Trigger: the user reports failure after you verified.** Suspect the verification-sufficiency judgment along with the code. Hold three possibilities open: the fix is wrong, another cause exists, the environments differ.

## Reporting

- **Lead with the outcome.** The first sentence answers "what happened" or "what did you find"; evidence, verification, and remaining risk follow.
- **The final message is the report.** Everything the user needs from the turn must be in the closing message; notes between tool calls do not count as having reported.
- **Readable over concise.** Select what to include — drop details that don't change the reader's next decision — rather than compress into fragments, arrow chains, or labels the reader must decode. What you include, write in complete sentences.
- **Report outcomes faithfully.** Failing tests are reported with output; skipped steps are named; verified work is stated plainly without hedging.

Never hide: discretionary defaults, falsified hypotheses, judgments you got wrong, where verification fell short, points needing the user's decision, anomalies outside your authority. The mechanical closing check is the Completion Gate in `SKILL.md`.

## Residue

Do not leave only the resulting code. Leave each kind of residue where it will next be needed:

| Residue | Location |
| --- | --- |
| Design decision reasons, rejected alternatives | Documents |
| Counterintuitive code reasoning | Code comments |
| Regression-worthy checks | Tests or verification scripts |
| One-off instrumentation | Scratch area, then removed |
| Process lessons, durable conventions | Dev wiki when opted in (see *Survey — dev wiki*); not opted in → no file, state the lesson in the final report instead. Promote to AGENTS.md only rules repeated records have validated |

Three cleanup obligations close out with the work itself (the Completion Gate points here rather than listing them):

- **Probes and one-off diagnostics are removed**; regression-worthy ones are promoted to tests/scripts or explicitly proposed — never silently discarded.
- **Deleted guard/cleanup/lifecycle code leaves its safety argument as a code comment**, so nobody "restores" the bug later.
- **Anomalies noticed outside your scope are reported**, not dropped.

Placement is the point: the next person must encounter the reasoning naturally — comments for whoever edits the line, docs for whoever redesigns, durable memory for the next session. An unwritten lesson is lost to the next session.

## Post-mortem

The runtime closing check is the Completion Gate; do not walk a second checklist per task. This section fires on three triggers — the first unconditional, so the record does not depend on noticing your own mistakes:

- **Closing any task that entered diagnostic mode — regardless of outcome.** Success is evidence too; recording only failures makes the trail unusable.
- **A task went wrong** (the user reports failure, a fix regressed, a judgment was reversed).
- **Closing an unusually large task.**

Two steps, the second not optional:

1. **Locate the judgment.** For failures, find which call was wrong — utterance classification, ambiguity ownership, the survey standard, stage decomposition, the diagnosis loop, or verification sufficiency. For successes, identify the check that discriminated the cause.
2. **Write the record.** Three lines: what was misjudged or which check was decisive; what evidence would have caught it earlier or cheaper; the rule to apply next time. Destination: the dev wiki, and only when the project is opted in — not opted in, create no file; put the three lines in the final report so the user can carry them forward. Never AGENTS.md, which receives only rules that repeated records have validated, by explicit promotion.

Evals cannot run in this environment (`references/ab-scenarios.md` holds the manual alternative — a protocol for the human operator, never read during a task), so this written trail is the mode's only accumulating evidence of whether it works — and the only place a session's lesson survives into the next one.

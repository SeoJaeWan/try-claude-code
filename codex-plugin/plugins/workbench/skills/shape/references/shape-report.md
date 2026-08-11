# Shape Report Contract

Use this contract for the stages 0–4 deliverable. Shape is a read-only analysis stage; it does not require or create a worktree.

## Identity and fingerprint construction

- Create `run_id` once as `wb-<UTC YYYYMMDDTHHMMSSZ>-<HEAD first 12>-<six random lowercase hex>`. Preserve it across revisions of the same work item.
- Set `shape_report_id` to `<run_id>/shape/<positive revision number>` and increment the revision whenever the snapshot, requirements, or decisions change.
- Set `repository_id` to the SHA-256 of the NUL-separated UTF-8 tuple `(stable repository slug, absolute git_common_dir)`. Report the digest; never embed machine-specific absolute paths in Dev Wiki content.
- Classify `analysis_checkout` as `primary_local` or `linked_worktree` using the absolute Git dir, common dir, and `git worktree list --porcelain`.
- Compute `status_fingerprint` with the deterministic byte-framed algorithm below. Do not print file contents. If a special or unreadable file prevents a complete hash, mark the fingerprint `incomplete` and block Prepare readiness.

### Deterministic status fingerprint v1

Run every command from `analysis_root`. Disable external diff and text-conversion drivers. Capture raw stdout bytes without newline normalization:

1. `head`: `git rev-parse --verify HEAD`
2. `status`: `git status --porcelain=v1 -z --untracked-files=all`
3. `staged_diff`: `git diff --cached --binary --full-index --no-ext-diff --no-textconv`
4. `unstaged_diff`: `git diff --binary --full-index --no-ext-diff --no-textconv`
5. `untracked_manifest`: enumerate the NUL-delimited untracked paths from `status`, sort them by unsigned raw path-byte order, and encode each as described below. For a regular file use the SHA-256 of its raw content. For a symlink use the SHA-256 of its raw link-target bytes without following it. Mark the fingerprint incomplete for another file type or any unreadable path.

Initialize a SHA-256 stream with ASCII bytes `workbench-status-fingerprint`, NUL, ASCII `v1`, NUL. Append each component in the exact order above using:

```text
ASCII component name
NUL
unsigned 64-bit big-endian byte length
raw component bytes
```

Encode every untracked manifest record as unsigned 64-bit big-endian path-byte length, raw path bytes, one type byte (`f` or `l`), then the raw 32-byte SHA-256 digest. The manifest has no separators beyond these fixed frames. Lowercase-hex encode the final SHA-256 digest. Prepare must use the same version and exact commands; any algorithm-version mismatch returns `RESHAPE_REQUIRED`.

## Evidence rules

Label material statements as one of:

- `Fact / repository-fact`: observed in the current checkout;
- `Fact / memory-fact`: read with `memory_get`;
- `Fact / jira-fact`: read from the exact linked Jira artifact;
- `Fact / figma-fact`: inspected from the exact linked Figma artifact;
- `Fact / external-fact`: verified against a canonical official source;
- `Inference`: reasoned from cited facts;
- `Assumption`: required but not verified;
- `Decision`: selected approach and rationale;
- `unverified`: unavailable or ambiguous evidence.

Local evidence uses an absolute clickable file link with one line number. External evidence uses a canonical clickable URL. Context7 is retrieval provenance, not official-source classification.

For each external source record:

```text
S-### title
classification: official-docs | primary-repository | context7-index | secondary
source_url:
canonical_official_url:
library_version:
source_version_or_ref:
version_alignment: exact | documented-compatible | mismatch | unverified | not_applicable
retrieved_via: context7 | direct
retrieved_at: <ISO-8601 UTC timestamp>
context7_library_id:
query_summary:
supports: REQ/NFR/INV/AC/DEC IDs
```

Never put a secondary or Context7 index URL in `canonical_official_url`.

## Presentation language

- Render human-facing Markdown titles, headings, subheadings, and prose labels in the user's primary language.
- Keep machine-readable keys, enum/status values, contract IDs, code symbols, file names, APIs, and Git terms unchanged.

## Required report sections

```markdown
# Shape 보고서 — <request>

## 상태
- shape_status: READY | BLOCKED | NEEDS_INPUT
- blockers: []
- unresolved_questions: []
- run_id:
- shape_report_id:
- repository_id:
- work_item_key:
- analysis_worktree_required: false
- execution_worktree_policy: task_scoped
- dev_wiki_artifact_state: proposed | blocked
- generated_at:

## 분석 checkout 및 기준 스냅샷
- git_common_dir:
- repository_root:
- analysis_root:
- analysis_checkout: primary_local | linked_worktree
- head_sha:
- branch:
- detached:
- staged_paths:
- unstaged_paths:
- untracked_paths:
- status_fingerprint:
- dirty_policy: clean | adopted_dirty
- primary_local_head:
- primary_local_status_paths:
- checkout_divergence: none | unrelated | needs_input

## 요청 정의
- 문제 설명
- 원하는 결과
- 범위
- 범위 제외
- 제약사항
- 가정
- 미해결 질문

## 단계 0 — Local Work Memory
- 실행한 질의
- 사용한 문서: source_type, source_id, title, source_revision
- 기존 Shape artifact: source_id, slug, source_revision, artifact_id
- 관련 기존 결정
- 해결되지 않은 검색

## 단계 0 — Jira 및 Figma 근거
- Jira 기록
- Figma 기록
- 사용 불가 또는 권한으로 차단된 자료
- 출처 충돌 및 처리 결과

## 단계 0 — 저장소 탐색
- 구조 및 진입점
- 기존 패턴 및 의존성
- 테스트, 빌드, CI 및 오류 처리
- 관련 프로젝트 지침

## 요구사항
- REQ-### 기능 요구사항
- NFR-### 비기능 요구사항

## 불변 조건
- INV-###

## 수락 기준
- AC-### 관찰 가능한 결과 및 실패 동작

## 조사 및 출처
- 출처 기록 및 주장 연결

## 아키텍처 결정
### DEC-### <title>
- decision_status: proposed | accepted | superseded
- 결정
- 검토한 대안
- 근거와 작업 이유
- 가정과 confidence
- 장단점 및 영향
- 무효화 조건

## 위험 및 미해결 질문

## Dev Wiki Shape artifact
- artifact_kind: shape
- artifact_id: <shape_report_id>
- artifact_digest: <full_body SHA-256>
- canonical_slug:
- supersedes:

## Dev Wiki Artifact Change Set

## 실행 영향 및 고려사항
- 예상 작업 경계
- 병렬 실행 후보
- 공유 및 충돌 가능 영역
- execution_worktree_policy: task_scoped

## 다음 선택지
```

## Canonical Shape artifact body

The Dev Wiki `full_body` is the durable Shape decision record. Include:

1. `run_id`, `shape_report_id`, repository slug, work item identity, source issue/design links, base commit, and generated time;
2. problem, desired outcome, scope, exclusions, constraints, and assumptions;
3. evidence map and retrieval timestamps;
4. requirements, invariants, and acceptance criteria;
5. every architecture decision with status, alternatives, rationale, consequences, confidence, and invalidation conditions;
6. risks, unresolved questions, likely task boundaries, and collision surfaces;
7. `supersedes` when replacing an earlier Shape artifact.

Do not include absolute local paths, credentials, tokens, private keys, customer data, or unnecessary personal data. Use repository-relative paths and canonical URLs.

Normalize only CRLF/CR line endings in `full_body` to LF, SHA-256 the exact UTF-8 bytes, and lowercase-hex encode the result as `artifact_digest`. Do not include `artifact_digest` inside `full_body`; this avoids a self-referential digest.

## Dev Wiki Artifact Change Set

Shape proposes exactly one entry and `$workbench:memory-update` applies it later:

```yaml
artifact_kind: shape
artifact_id: <shape_report_id>
artifact_digest: <sha256 of normalized full_body>
run_id:
git_common_dir:
repository_id:
work_item_key:
change_id: WIKI-SHAPE-001
action: create | update | skip
source_type: dev_wiki
slug: projects/<stable-project-key>/work-items/<stable-work-item-key>/shape
source_id: <UUID from memory_get; update/skip only>
title: <work item> — Shape
full_body: |
  <complete canonical Shape artifact body; create/update only>
expected_revision: <exact opaque memory_get value; update only>
reason:
evidence_ids: []
```

Rules:

- Use a stable slug matching `^[a-z0-9][a-z0-9/-]{0,120}$`. Use a user-authorized work item key or a stable non-sensitive hash.
- Omit `source_id` on create. Require `source_id` and exact opaque `expected_revision` on update.
- Use `skip` only when the retrieved canonical body is byte-equivalent after line-ending normalization; omit `full_body` for skip.
- Update carries the complete replacement body, never a patch.
- Do not update when the current body or revision is unresolved.
- Do not emit more than one Shape artifact mutation.
- The artifact body is canonical; narrative memory summaries are not substitutes for it.

## Visibility and secret handling

- Report repository-relative paths in the artifact. Replace a path that itself reveals a secret with `<sensitive-path:sha256-prefix>`.
- If the complete artifact cannot safely be written to Dev Wiki, mark the change blocked instead of writing a corrupted redacted body.
- Quote only the minimum memory excerpt needed for human judgment.

## Status precedence

- `BLOCKED`: a required gate, evidence source, safety condition, or Dev Wiki snapshot dependency prevents a trustworthy result.
- `NEEDS_INPUT`: no blocker exists, but a user decision materially changes requirements or architecture.
- `READY`: evidence and decisions are sufficient and one valid Dev Wiki Artifact Change Set is ready for explicit persistence.

## Handoff semantics

- Shape never creates a worktree and never writes memory.
- A ready Shape is not Prepare-ready until `$workbench:memory-update` returns `APPLIED`/`indexed` or `NOT_NEEDED`/`unchanged` with a `dev_wiki_ref` for the same `artifact_id` and `artifact_digest`.
- Any base snapshot drift makes the Shape stale for Prepare.
- A 409 during Shape artifact persistence requires a refreshed Shape.

## Shape Gate Result

If the current directory is not a usable Git repository or the analysis checkout cannot be inspected safely, return only:

```markdown
# Shape 게이트 결과
- shape_status: BLOCKED
- reason:
- current_root:
- analysis_worktree_required: false
- required_action:
```

Do not return this gate merely because the checkout is primary Local. Primary Local is a valid read-only Shape environment.

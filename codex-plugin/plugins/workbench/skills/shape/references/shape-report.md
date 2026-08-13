# Shape Report Contract

Use this contract for the standalone stages 0–4 deliverable. Shape is read-only, creates no worktree, and does not persist its result.

## Identity and snapshot

- Create `run_id` once as `wb-<UTC YYYYMMDDTHHMMSSZ>-<HEAD first 12>-<six random lowercase hex>`.
- Set `shape_report_id` to `<run_id>/shape/<positive revision number>` and increment the revision whenever the snapshot, requirements, or decisions change.
- Set `repository_id` from a stable repository identity. Report machine-bound paths separately and never copy them into Local Work Memory document content.
- Classify `analysis_checkout` as `primary_local` or `linked_worktree` using the absolute Git dir, common dir, and `git worktree list --porcelain`.
- Record `status_fingerprint_version: v1`, `status_fingerprint_complete`, and the deterministic content-sensitive fingerprint below. An incomplete fingerprint prevents a `READY` result.

### Status fingerprint v1

Run every command from `analysis_root`. Disable external diff/text-conversion drivers and config-dependent formatting. Capture raw stdout bytes without newline normalization:

1. `head`: `git rev-parse --verify HEAD`
2. `status`: `git status --porcelain=v1 -z --untracked-files=all`
3. `staged_diff`: `git diff --cached --binary --full-index --no-ext-diff --no-textconv`
4. `unstaged_diff`: `git diff --binary --full-index --no-ext-diff --no-textconv`
5. `untracked_manifest`: enumerate NUL-delimited untracked paths from `status`, sort by unsigned raw path-byte order, and hash regular file bytes or raw symlink-target bytes without following links.

Initialize SHA-256 with ASCII `workbench-status-fingerprint`, NUL, ASCII `v1`, NUL. Append every component in the order above as component name, NUL, unsigned 64-bit big-endian byte length, and raw component bytes. Encode each untracked record as path length, raw path bytes, one type byte (`f` or `l`), and the raw 32-byte digest.

Mark the fingerprint incomplete for unreadable paths, unsupported file types, unsafe submodule state, or a repository state that changes while the snapshot is being captured. Recheck Git status after capture and retry read-only capture only when it can establish one coherent state.

## Evidence rules

Label material statements as one of:

- `Fact / repository-fact`
- `Fact / memory-fact`
- `Fact / jira-fact`
- `Fact / figma-fact`
- `Fact / external-fact`
- `Inference`
- `Assumption`
- `Decision`
- `unverified`

Use absolute clickable paths with one line number in the conversation report. When the same result is optionally persisted later, Memory Update is responsible for rejecting machine-private paths or unauthorized content; Shape does not create a second persistence-specific body.

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
supports: REQ/NFR/INV/AC/DEC IDs
```

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
- status_fingerprint_version: v1
- status_fingerprint:
- status_fingerprint_complete: true | false
- dirty_policy: clean | adopted_dirty
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
- 사용한 project scope
- 참고한 Convention, Wiki, Work Item 및 Workbench Artifact reference
- 해결되지 않은 조회

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

## 실행 영향 및 고려사항
- 예상 작업 경계
- 병렬 실행 후보
- 공유 및 충돌 가능 영역
- execution_worktree_policy: task_scoped

## 다음 선택지
```

## Direct handoff

A complete `READY` Shape Report is the Prepare input contract. Prepare may consume it directly from the same task context or user input without a Memory Update Result.

If the user persisted the report and later supplies a Local Work Memory Artifact reference, Prepare resolves that reference through the MCP and consumes the returned canonical content. Inline and referenced reports have the same semantic authority; persistence provides durable retrieval, not workflow approval.

Shape may list user-selectable next actions, but it must not state or imply that Memory Update is required before Prepare.

## Visibility and secret handling

- Do not expose credentials, tokens, private keys, customer data, ignored secret-file contents, or unnecessary personal data.
- Replace a path that itself reveals a secret with `<sensitive-path:sha256-prefix>`.
- Quote only the minimum external or Local Work Memory excerpt needed for human judgment.

## Status precedence

- `BLOCKED`: a required repository snapshot, project Convention set, evidence source, or safety condition prevents a trustworthy result.
- `NEEDS_INPUT`: no blocker exists, but a user decision materially changes requirements or architecture.
- `READY`: evidence, snapshot, requirements, acceptance criteria, and decisions are sufficient for direct use.

## Shape Gate Result

If the current directory is not a usable Git repository or the checkout cannot be inspected safely, return only:

```markdown
# Shape 게이트 결과
- shape_status: BLOCKED
- reason:
- current_root:
- analysis_worktree_required: false
- required_action:
```

Primary Local is a valid read-only Shape environment.

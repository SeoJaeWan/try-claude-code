# Shape Report Contract

## Identity and snapshot

- Create `analysis_id` as `wb-shape-<UTC YYYYMMDDTHHMMSSZ>-<HEAD first 12>-<six random lowercase hex>`.
- Set `report_revision` to a positive integer and increment it whenever the snapshot, requirements, or decisions change.
- Record stable repository identity separately from machine-bound paths.
- Classify the checkout as `primary_local` or `linked_worktree` using the Git dir, common dir, and `git worktree list --porcelain`.
- A complete content-sensitive fingerprint is required for `READY`.

### Status fingerprint v1

Run from `analysis_root` and capture raw bytes without newline normalization:

1. `git rev-parse --verify HEAD`
2. `git status --porcelain=v1 -z --untracked-files=all`
3. `git diff --cached --binary --full-index --no-ext-diff --no-textconv`
4. `git diff --binary --full-index --no-ext-diff --no-textconv`
5. A raw-byte-sorted manifest of untracked regular files and symlinks, hashing file bytes or symlink-target bytes without following links.

Initialize SHA-256 with `workbench-status-fingerprint`, NUL, `v1`, NUL. Append each component name, NUL, unsigned 64-bit big-endian byte length, and raw bytes. Encode each untracked record with path length, raw path, type byte, and raw SHA-256 digest.

Mark the fingerprint incomplete for unreadable paths, unsupported file types, unsafe submodule state, or a changing repository state. Retry only when a coherent read-only snapshot can be established.

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

For each external source record its canonical URL, library version, source ref, version alignment, retrieval method and time, supported contract IDs, and whether it is official documentation, a primary repository, Context7 index material, or a secondary source.

## Required report

```markdown
# Shape 보고서 — <request>

## 상태
- status: READY | BLOCKED | NEEDS_INPUT
- blockers: []
- unresolved_questions: []
- analysis_id:
- report_revision:
- repository_id:
- work_item_key:
- generated_at:

## 분석 checkout 및 기준 스냅샷
- git_common_dir:
- repository_root:
- analysis_root:
- checkout_kind: primary_local | linked_worktree
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

## 요청 정의
- 문제와 원하는 결과
- 범위와 제외 범위
- 제약, 가정, 미해결 질문

## 프로젝트 및 외부 근거
- Local Work Memory
- Jira와 Figma
- 저장소 탐색
- 공식 자료와 버전 정합성
- 조회 실패 및 출처 충돌

## 요구사항
- REQ-###
- NFR-###

## 불변 조건
- INV-###

## 수락 기준
- AC-### 관찰 가능한 성공 및 실패 동작

## 아키텍처 결정
### DEC-### <title>
- decision_status: proposed | accepted | superseded
- 결정, 대안, 근거, trade-off, confidence, 무효화 조건

## 위험 및 구현 고려사항

## 조사 및 출처
```

## Visibility and status

- Do not expose credentials, tokens, private keys, customer data, ignored secret-file contents, or unnecessary personal data.
- Replace a sensitive path with `<sensitive-path:sha256-prefix>`.
- `BLOCKED` takes precedence when a required snapshot, evidence source, or safety condition is unavailable.
- Use `NEEDS_INPUT` only for a material user decision that cannot be discovered.
- Use `READY` when the report is sufficient as a standalone analysis artifact.

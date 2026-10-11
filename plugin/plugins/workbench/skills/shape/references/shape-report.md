# Shape Report Contract

## Report depth

Use `report_mode: focused` for a bounded analysis question. Report the repository/checkout, exact HEAD, dirty status, inspected paths/content identities, findings and evidence, decisions, acceptance where applicable, and material gaps. Omit irrelevant template sections. A focused `READY` means the bounded analysis is sufficient; it does not certify a whole-checkout snapshot.

Use `report_mode: snapshot_bound` for a requested reproducible handoff or analysis depending on broad dirty changes. Use the full identity/snapshot contract below and the relevant report sections. Do not impose whole-checkout hashing on a small question whose claims can be bound to inspected sources. In both modes, reread changing relevant evidence or mark affected claims unverified.

## Identity and snapshot

- Create `analysis_id` as `wb-shape-<UTC YYYYMMDDTHHMMSSZ>-<HEAD first 12>-<six random lowercase hex>`.
- Set `report_revision` to a positive integer and increment it whenever the snapshot, requirements, or decisions change.
- Record stable repository identity separately from machine-bound paths.
- Classify the checkout as `primary_local` or `linked_worktree` using the Git dir, common dir, and `git worktree list --porcelain`.
- In `snapshot_bound` mode a complete content-sensitive fingerprint is required for `READY`; never imply this guarantee for a focused report.

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
- `Fact / codocs-fact`
- `Fact / figma-fact`
- `Fact / external-fact`
- `Inference`
- `Assumption`
- `Decision`
- `unverified`

For each external source record its canonical URL, library version, source ref, version alignment, retrieval method and time, supported contract IDs, and whether it is official documentation, a primary repository, Context7 index material, or a secondary source.

### External evidence

- Look up external behavior in Context7 when available, then the official documentation site or the primary repository's documentation for the version in use. Context7 may need to be discovered or loaded before use; do NOT conclude it is unavailable without checking.
- Treat installed package READMEs or source as supporting evidence only. Do NOT count a README search as the documentation check when per-feature documentation exists.
- Do NOT write or run probe code to learn behavior the documentation covers. When the documentation is silent, record that and keep the behavior `unverified` or name it as a later check.
- Use `unverified` for an external claim only after a lookup was attempted; record the sources tried and why they fell short.
- A recommended decision or alternative whose viability rests on an `unverified` external fact prevents `READY`; list the gap under `blockers` or `unresolved_questions`.

### Established solutions

- Before proposing an alternative or decision for a problem in a platform, tool, or ecosystem the change uses, search in this order: repository precedent that already solves it; built-in or official features of the platform or tool in use, such as official GitHub Actions or Node.js APIs; the approach its official documentation recommends; widely adopted libraries, conventions, and practice in prominent projects.
- Verify official features and recommendations with the external-evidence rules. Practice from other projects is a secondary source: it can show that a solution exists and is common, but do NOT treat it as proof of documented behavior.
- Include a fitting existing solution among the alternatives and prefer it. Do NOT make a new script, workaround, or custom implementation the recommended decision unless the report states why the existing solutions do not fit.
- A repository precedent or settled standard that resolves a question without changing scope, behavior, commitment, or intent is not an unresolved question.
- Record what was searched and found, including searches that found nothing applicable. Skip the search for purely internal logic where no decision depends on it.

## Required report

```markdown
# Shape 보고서 — <request>

## 상태
- report_mode: focused | snapshot_bound
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
- 입력으로 제공된 Wiki Artifact와 출처
- .codocs의 실제 checkout·원문 경로·읽은 원문의 Git blob ID·조회 방식, MCP 사용 시 revision과 탐색/확인 상태
- 연결된 Figma
- 저장소 탐색
- 공식 자료와 버전 정합성
- 기존 해법 조사: 저장소 선례, 공식·내장 기능, 공식 권장 방식, 널리 쓰이는 관행과 각 출처 등급
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
- 결정, 대안(적용 가능한 기존 해법 포함), 근거, trade-off, confidence, 무효화 조건

## 위험 및 구현 고려사항

## 조사 및 출처
- delegated questions, requested profiles, host-observed settings when available, and reconciled findings (when delegation was useful)
```

`work_item_key` may be null; do not discover one through Jira. Record supplied Artifact references separately from local project knowledge. For `.codocs`, follow [codocs-knowledge.md](codocs-knowledge.md) and record the selected checkout, original paths, Git blob IDs, and access evidence. MCP revision supplements the Git blob ID and does not replace it or the checkout snapshot. If `.codocs` is absent, report the gap and use explicit project instructions and repository evidence without creating documents or falling back to Wiki/Jira lookup. Missing material policy or unresolved decision-critical conflicts prevent `READY`; unavailable Wiki architecture is not a blocker.

## Visibility and status

- Do not expose credentials, tokens, private keys, customer data, ignored secret-file contents, or unnecessary personal data.
- Replace a sensitive path with `<sensitive-path:sha256-prefix>`.
- `BLOCKED` takes precedence when a required snapshot, evidence source, or safety condition is unavailable.
- Use `NEEDS_INPUT` only for a material user decision that cannot be discovered.
- Use `READY` when the report is sufficient as a standalone analysis artifact.

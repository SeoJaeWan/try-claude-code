# 테스트 매니페스트

## 파일 목록

| 아티팩트 파일 | 경계 타입 | 경계 이름 | 배치 의도 | 제약 조건 | 시나리오 타입 |
| --- | --- | --- | --- | --- | --- |
| `batch-executor.test.mjs` | `utility` | `BatchExecutor` | `shared` | [C-BATCH-001], [C-BATCH-002], [C-BATCH-004] | expected, defensive, exception |
| `ref-resolver.test.mjs` | `utility` | `RefResolver` | `shared` | [C-BATCH-003] | expected, defensive, edge |
| `json-command-contract.test.mjs` | `utility` | `JsonCommandContract` | `shared` | [C-SPEC-001], [C-SPEC-004] | expected, defensive, edge |
| `spec-normalizer.test.mjs` | `validator` | `SpecNormalizer` | `shared` | [C-SPEC-002], [C-SPEC-005] | expected, defensive, edge |
| `profile-batch-commands.test.mjs` | `validator` | `ProfileBatchCommands` | `shared` | [C-SPEC-003] | expected, defensive, edge |
| `backend-batch-profile.test.mjs` | `validator` | `BackendBatchProfile` | `shared` | [C-BE-001] | expected, defensive, edge |

## 구현 배치

- 최종 배치 위치는 구현 시점의 coding rules와 실제 테스트 구조를 기준으로 결정한다.
- 아티팩트를 이동하더라도 assertion과 시나리오 의도는 바꾸지 않는다.
- 현재 로컬 근거 기준 최종 위치는 `packages/dev-cli/tests/*.test.mjs`와 `node:test` 조합이다.

## 커버리지

- 전체 제약 조건: 9
- expected 커버리지 포함 제약 조건: 9
- defensive 커버리지 포함 제약 조건: 9
- edge 또는 exception 검토 포함 제약 조건: 9
- 커버리지: 100%

## Edge/Exception 검토 메모

- [C-BATCH-001] malformed batch envelope와 unsupported command는 deterministic failure가 필요하므로 exception 검토가 포함된다.
- [C-BATCH-002] write-capable op라도 `--apply` 없이는 preview를 벗어나면 안 되므로 exception 검토가 포함된다.
- [C-BATCH-003] forward, unknown, self reference는 현실적인 입력 오류이므로 edge 검토가 포함된다.
- [C-BATCH-004] write-capable batch 중 한 op가 실패하면 모든 planned write가 막혀야 하므로 exception 검토가 포함된다.
- [C-SPEC-001] legacy positional invocation은 명시적 usage 또는 deprecation error를 반환해야 하므로 edge 검토가 포함된다.
- [C-SPEC-002] normalization 과정에서 supplied name과 inferred intent가 충돌할 수 있으므로 edge 검토가 포함된다.
- [C-SPEC-003] 지원하지 않는 command/profile 조합은 안정적인 JSON error를 반환해야 하므로 edge 검토가 포함된다.
- [C-SPEC-004] 모든 실패 경로가 동일한 JSON envelope shape를 유지해야 하므로 defensive 검토가 포함된다.
- [C-BE-001] backend path casing과 root package detection은 실제 malformed input에서 자주 깨지므로 edge 검토가 포함된다.

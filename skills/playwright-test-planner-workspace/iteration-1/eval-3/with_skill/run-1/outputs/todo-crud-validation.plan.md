# 할 일 관리 앱 E2E 테스트 플랜

## Overview

CRUD 기능이 있는 할 일 관리 앱에 대한 E2E 테스트 플랜입니다. 할 일 생성, 조회, 수정, 삭제 기능과 폼 유효성 검증, 빈 상태 처리를 포함합니다. Next.js 16 + React 19 기반의 웹 애플리케이션입니다.

---

### 1. 빈 상태 처리

#### 1.1 초기 빈 상태 표시 확인

**Seed:** `seed.spec.ts`
**File:** `tests/empty-state/initial-empty-state.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 페이지에 접속한다 (http://localhost:3000) | 할 일 목록이 비어있는 상태의 안내 메시지가 표시된다 (예: '할 일이 없습니다' 또는 유사한 빈 상태 메시지). 할 일 목록 영역에 아이템이 하나도 없다. |
| 2 | 빈 상태 UI 요소를 확인한다 | 빈 상태 아이콘 또는 일러스트가 표시된다. 할 일 추가를 유도하는 안내 텍스트가 표시된다. |

#### 1.2 모든 할 일 삭제 후 빈 상태 복귀

**Seed:** `seed.spec.ts`
**File:** `tests/empty-state/empty-after-delete-all.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 할 일 입력 필드에 '테스트 할 일'을 입력하고 추가 버튼을 클릭한다 | 할 일 '테스트 할 일'이 목록에 추가된다. |
| 2 | 추가된 할 일의 삭제 버튼을 클릭한다 | 할 일이 목록에서 제거된다. 빈 상태 메시지가 다시 표시된다. |

---

### 2. 할 일 생성 (Create)

#### 2.1 새 할 일 추가 - 정상 입력

**Seed:** `seed.spec.ts`
**File:** `tests/create/add-todo-normal.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 할 일 입력 필드에 '장보기'를 입력한다 | 입력 필드에 '장보기' 텍스트가 표시된다. |
| 2 | 추가 버튼을 클릭한다 | 할 일 목록에 '장보기' 항목이 추가된다. 입력 필드가 비워진다. 빈 상태 메시지가 사라진다. |

#### 2.2 여러 할 일 연속 추가

**Seed:** `seed.spec.ts`
**File:** `tests/create/add-multiple-todos.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 할 일 입력 필드에 '첫 번째 할 일'을 입력하고 추가 버튼을 클릭한다 | '첫 번째 할 일'이 목록에 추가된다. |
| 2 | 할 일 입력 필드에 '두 번째 할 일'을 입력하고 추가 버튼을 클릭한다 | '두 번째 할 일'이 목록에 추가된다. 목록에 총 2개의 할 일이 표시된다. |
| 3 | 할 일 입력 필드에 '세 번째 할 일'을 입력하고 추가 버튼을 클릭한다 | '세 번째 할 일'이 목록에 추가된다. 목록에 총 3개의 할 일이 표시된다. 모든 할 일이 올바른 순서로 표시된다. |

#### 2.3 Enter 키로 할 일 추가

**Seed:** `seed.spec.ts`
**File:** `tests/create/add-todo-enter-key.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 할 일 입력 필드에 '키보드로 추가'를 입력한다 | 입력 필드에 텍스트가 표시된다. |
| 2 | Enter 키를 누른다 | 할 일 목록에 '키보드로 추가' 항목이 추가된다. 입력 필드가 비워진다. |

#### 2.4 특수문자 포함 할 일 추가

**Seed:** `seed.spec.ts`
**File:** `tests/create/add-todo-special-chars.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 할 일 입력 필드에 '할 일 `<script>alert(1)</script>` & "특수문자" 테스트'를 입력하고 추가 버튼을 클릭한다 | 특수문자가 이스케이프되어 올바르게 표시된다. XSS 공격이 실행되지 않는다. 할 일이 정상적으로 목록에 추가된다. |

---

### 3. 폼 유효성 검증 (Validation)

#### 3.1 빈 입력으로 할 일 추가 시도

**Seed:** `seed.spec.ts`
**File:** `tests/validation/empty-input-submit.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 입력 필드를 비운 상태로 추가 버튼을 클릭한다 | 할 일이 추가되지 않는다. 유효성 검증 오류 메시지가 표시된다 (예: '할 일을 입력해주세요'). 입력 필드에 오류 상태 스타일이 적용된다. |

#### 3.2 공백만 있는 입력으로 할 일 추가 시도

**Seed:** `seed.spec.ts`
**File:** `tests/validation/whitespace-only-submit.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 입력 필드에 '   ' (공백만)을 입력하고 추가 버튼을 클릭한다 | 할 일이 추가되지 않는다. 유효성 검증 오류 메시지가 표시된다. 공백만으로 구성된 할 일은 생성되지 않는다. |

#### 3.3 빈 입력 후 Enter 키 제출 시도

**Seed:** `seed.spec.ts`
**File:** `tests/validation/empty-input-enter-key.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 입력 필드를 비운 상태로 Enter 키를 누른다 | 할 일이 추가되지 않는다. 유효성 검증 오류 메시지가 표시되거나 아무 동작도 하지 않는다. |

#### 3.4 매우 긴 텍스트 입력

**Seed:** `seed.spec.ts`
**File:** `tests/validation/long-text-input.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 입력 필드에 300자 이상의 매우 긴 텍스트를 입력하고 추가 버튼을 클릭한다 | 최대 길이 제한이 적용되거나, 긴 텍스트가 UI에서 적절히 처리된다 (말줄임표 또는 줄바꿈). 레이아웃이 깨지지 않는다. |

---

### 4. 할 일 조회 (Read)

#### 4.1 할 일 목록 표시 확인

**Seed:** `seed.spec.ts`
**File:** `tests/read/display-todo-list.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 3개의 할 일을 추가한다: '아침 운동', '이메일 확인', '보고서 작성' | 3개의 할 일이 모두 목록에 표시된다. |
| 2 | 각 할 일 항목의 내용을 확인한다 | 각 할 일의 텍스트가 정확히 표시된다. 할 일마다 수정 및 삭제 컨트롤이 존재한다. |

#### 4.2 할 일 완료 상태 토글

**Seed:** `seed.spec.ts`
**File:** `tests/read/toggle-todo-complete.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 할 일 '아침 운동'을 추가한 후, 해당 항목의 체크박스(또는 완료 토글)를 클릭한다 | 할 일이 완료 상태로 변경된다. 완료된 할 일에 취소선 또는 시각적 구분이 적용된다. |
| 2 | 완료된 할 일의 체크박스를 다시 클릭한다 | 할 일이 미완료 상태로 복원된다. 취소선 또는 시각적 구분이 제거된다. |

---

### 5. 할 일 수정 (Update)

#### 5.1 할 일 텍스트 수정 - 정상 수정

**Seed:** `seed.spec.ts`
**File:** `tests/update/edit-todo-normal.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 할 일 '장보기'를 추가한다 | '장보기'가 목록에 표시된다. |
| 2 | 해당 할 일의 수정 버튼을 클릭한다 | 할 일 텍스트가 편집 가능한 입력 필드로 전환된다. 기존 텍스트 '장보기'가 입력 필드에 표시된다. |
| 3 | 텍스트를 '마트에서 장보기'로 수정하고 저장 버튼을 클릭한다 (또는 Enter 키를 누른다) | 할 일 텍스트가 '마트에서 장보기'로 업데이트된다. 편집 모드가 종료되고 읽기 모드로 돌아간다. |

#### 5.2 수정 취소

**Seed:** `seed.spec.ts`
**File:** `tests/update/cancel-edit-todo.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 할 일 '원본 텍스트'를 추가하고 수정 버튼을 클릭한다 | 편집 모드가 활성화된다. |
| 2 | 텍스트를 '수정된 텍스트'로 변경한 후, 취소 버튼을 클릭한다 (또는 Escape 키를 누른다) | 할 일 텍스트가 '원본 텍스트'로 유지된다. 편집 모드가 종료된다. |

#### 5.3 빈 텍스트로 수정 시도

**Seed:** `seed.spec.ts`
**File:** `tests/update/edit-todo-empty.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 할 일 '테스트'를 추가하고 수정 버튼을 클릭한다 | 편집 모드가 활성화된다. |
| 2 | 텍스트를 모두 지우고 저장 버튼을 클릭한다 | 유효성 검증 오류가 표시된다. 할 일 텍스트가 비어있는 상태로 저장되지 않는다. 기존 텍스트가 유지된다. |

---

### 6. 할 일 삭제 (Delete)

#### 6.1 단일 할 일 삭제

**Seed:** `seed.spec.ts`
**File:** `tests/delete/delete-single-todo.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | '삭제할 항목'과 '유지할 항목' 두 개의 할 일을 추가한다 | 2개의 할 일이 목록에 표시된다. |
| 2 | '삭제할 항목'의 삭제 버튼을 클릭한다 | '삭제할 항목'이 목록에서 제거된다. '유지할 항목'은 목록에 그대로 남아있다. 목록에 1개의 할 일만 표시된다. |

#### 6.2 완료된 할 일 삭제

**Seed:** `seed.spec.ts`
**File:** `tests/delete/delete-completed-todo.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | '완료 후 삭제' 할 일을 추가하고 완료 상태로 토글한다 | 할 일이 완료 상태로 표시된다. |
| 2 | 완료된 할 일의 삭제 버튼을 클릭한다 | 완료된 할 일이 목록에서 정상적으로 제거된다. |

#### 6.3 모든 할 일 순차 삭제

**Seed:** `seed.spec.ts`
**File:** `tests/delete/delete-all-todos-sequentially.spec.ts`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | 3개의 할 일을 추가한다: '할 일 1', '할 일 2', '할 일 3' | 3개의 할 일이 목록에 표시된다. |
| 2 | 각 할 일을 하나씩 삭제한다 | 삭제할 때마다 목록에서 해당 항목이 제거된다. |
| 3 | 마지막 할 일까지 삭제한다 | 모든 할 일이 삭제된 후 빈 상태 메시지가 표시된다. |

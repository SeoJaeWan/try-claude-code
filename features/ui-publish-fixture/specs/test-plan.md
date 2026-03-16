# TestApp E2E 테스트 플랜

## Application Overview

Next.js 기반 할 일 관리 웹 애플리케이션(TestApp)의 E2E 테스트 플랜. 주요 기능: 이메일/비밀번호 인증(회원가입/로그인/로그아웃, 세션 30분 만료), 할 일 CRUD(추가/수정/삭제/완료 토글, 검색/필터), 대시보드(통계 카드, 빠른 추가, /api/notifications API 연동 알림 목록), 프로필 페이지(이름·자기소개 수정, 생년월일 DatePicker, 기술 스택 MultiSelect, 아바타 FileUpload), 반응형 네비게이션(데스크톱 링크, 모바일 햄버거 메뉴 375px), 브레드크럼, 쿠키 동의 배너(localStorage 기반 오버레이). 인증과 Todo 데이터는 localStorage에 저장된다. 각 테스트는 완전히 독립적으로 실행 가능하며 신규 이메일로 회원가입하는 방식으로 격리한다.

## Test Scenarios

### 1. 1. 사용자 인증

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 1.1. 1.1 유효한 회원가입 후 대시보드 이동

**File:** `features/next-app/specs/auth/signup-valid.spec.ts`

**Steps:**
  1. http://localhost:3000/signup 으로 이동한다
    - expect: URL이 /signup 이어야 한다
    - expect: 회원가입 폼이 표시되어야 한다
  2. data-testid='signup-name' 에 '테스트유저'를 입력한다
    - expect: 이름 필드에 값이 입력되어야 한다
  3. data-testid='signup-email' 에 고유한 이메일(예: signup-valid-{timestamp}@example.com)을 입력한다
    - expect: 이메일 필드에 값이 입력되어야 한다
  4. data-testid='signup-password' 에 'password123'을 입력한다
    - expect: 비밀번호 필드에 값이 입력되어야 한다
  5. data-testid='signup-confirm-password' 에 'password123'을 입력한다
    - expect: 비밀번호 확인 필드에 값이 입력되어야 한다
  6. data-testid='signup-submit' 버튼을 클릭한다
    - expect: 페이지가 /dashboard 로 이동해야 한다
    - expect: data-testid='greeting' 에 '안녕하세요, 테스트유저님' 텍스트가 표시되어야 한다

#### 1.2. 1.2 이미 등록된 이메일로 회원가입 시 에러

**File:** `features/next-app/specs/auth/signup-duplicate-email.spec.ts`

**Steps:**
  1. http://localhost:3000/signup 으로 이동하여 동일한 이메일로 첫 번째 회원가입을 완료한다
    - expect: 첫 번째 가입이 성공하고 /dashboard 로 이동해야 한다
  2. 로그아웃 후 다시 /signup 으로 이동하여 동일한 이메일로 두 번째 회원가입을 시도한다
    - expect: data-testid='signup-error' 가 표시되고 '이미 등록된 이메일입니다' 메시지가 나타나야 한다

#### 1.3. 1.3 비밀번호 불일치 시 에러 표시

**File:** `features/next-app/specs/auth/signup-password-mismatch.spec.ts`

**Steps:**
  1. http://localhost:3000/signup 으로 이동한다
    - expect: 회원가입 폼이 표시되어야 한다
  2. 이름, 이메일을 입력하고 비밀번호에 'password123', 비밀번호 확인에 'different123'을 입력한 후 제출한다
    - expect: data-testid='confirm-password-error' 가 표시되고 '비밀번호가 일치하지 않습니다' 메시지가 나타나야 한다
    - expect: 페이지가 /dashboard 로 이동하지 않아야 한다

#### 1.4. 1.4 비밀번호 8자 미만 입력 시 유효성 검증 에러

**File:** `features/next-app/specs/auth/signup-short-password.spec.ts`

**Steps:**
  1. http://localhost:3000/signup 으로 이동한다
    - expect: 회원가입 폼이 표시되어야 한다
  2. 이름, 이메일을 입력하고 비밀번호 필드에 'short'(7자 미만)를 입력한 후 제출한다
    - expect: data-testid='password-error' 가 표시되고 '비밀번호는 8자 이상이어야 합니다' 메시지가 나타나야 한다

#### 1.5. 1.5 유효한 로그인 후 대시보드 이동

**File:** `features/next-app/specs/auth/login-valid.spec.ts`

**Steps:**
  1. http://localhost:3000/signup 으로 이동하여 신규 계정을 생성한다(이름: '로그인유저', 이메일: login-valid-{timestamp}@example.com, 비밀번호: password123)
    - expect: /dashboard 로 이동해야 한다
  2. data-testid='nav-logout' 버튼을 클릭하여 로그아웃한다
    - expect: /login 으로 이동해야 한다
  3. data-testid='login-email' 에 등록한 이메일을, data-testid='login-password' 에 'password123'을 입력하고 data-testid='login-submit'을 클릭한다
    - expect: /dashboard 로 이동해야 한다
    - expect: data-testid='greeting' 에 '안녕하세요, 로그인유저님' 텍스트가 표시되어야 한다

#### 1.6. 1.6 미등록 이메일로 로그인 시 에러

**File:** `features/next-app/specs/auth/login-unregistered-email.spec.ts`

**Steps:**
  1. http://localhost:3000/login 으로 이동한다
    - expect: 로그인 폼이 표시되어야 한다
  2. data-testid='login-email' 에 'notexist@example.com'을, data-testid='login-password' 에 'password123'을 입력하고 제출한다
    - expect: data-testid='login-error' 가 표시되고 '등록되지 않은 이메일입니다' 메시지가 나타나야 한다

#### 1.7. 1.7 잘못된 비밀번호로 로그인 시 에러

**File:** `features/next-app/specs/auth/login-wrong-password.spec.ts`

**Steps:**
  1. 신규 계정을 생성한 후 로그아웃한다
    - expect: /login 으로 이동해야 한다
  2. 로그인 폼에 등록된 이메일과 잘못된 비밀번호 'wrongpass1'을 입력하고 제출한다
    - expect: data-testid='login-error' 가 표시되고 '비밀번호가 일치하지 않습니다' 메시지가 나타나야 한다

#### 1.8. 1.8 로그아웃 후 보호된 페이지 접근 차단

**File:** `features/next-app/specs/auth/logout-redirect.spec.ts`

**Steps:**
  1. 신규 계정을 생성하여 /dashboard 에 있는 상태에서 data-testid='nav-logout' 을 클릭한다
    - expect: /login 으로 이동해야 한다
  2. http://localhost:3000/dashboard 로 직접 이동을 시도한다
    - expect: /login 으로 리다이렉트 되어야 한다
  3. http://localhost:3000/todos 로 직접 이동을 시도한다
    - expect: /login 으로 리다이렉트 되어야 한다

#### 1.9. 1.9 비인증 상태에서 홈 접속 시 로그인/회원가입 링크 표시

**File:** `features/next-app/specs/auth/home-unauthenticated.spec.ts`

**Steps:**
  1. localStorage 를 비운 상태에서 http://localhost:3000 으로 이동한다
    - expect: data-testid='home-login' 링크가 표시되어야 한다
    - expect: data-testid='home-signup' 링크가 표시되어야 한다
  2. data-testid='home-login' 링크를 클릭한다
    - expect: /login 으로 이동해야 한다

### 2. 2. 할 일 관리

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 2.1. 2.1 할 일 추가 - 정상 케이스

**File:** `features/next-app/specs/todos/todo-add-valid.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 http://localhost:3000/todos 로 이동한다
    - expect: 할 일 목록 페이지가 표시되어야 한다
    - expect: data-testid='empty-state' 가 '아직 할 일이 없습니다' 메시지와 함께 표시되어야 한다
  2. data-testid='todo-input' 에 '우유 사기'를 입력하고 data-testid='todo-add' 를 클릭한다
    - expect: '우유 사기' 텍스트를 가진 할 일 항목이 목록에 나타나야 한다
    - expect: 빈 상태 메시지가 사라져야 한다

#### 2.2. 2.2 할 일 추가 - 빈 입력 유효성 검증

**File:** `features/next-app/specs/todos/todo-add-empty.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하고 data-testid='todo-input' 을 비운 채 data-testid='todo-add' 를 클릭한다
    - expect: 에러 메시지 '할 일을 입력해주세요' 가 표시되어야 한다
    - expect: 할 일 항목이 추가되지 않아야 한다

#### 2.3. 2.3 할 일 추가 - 200자 초과 유효성 검증

**File:** `features/next-app/specs/todos/todo-add-too-long.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하고 data-testid='todo-input' 에 201자 이상의 텍스트를 입력한 후 제출한다
    - expect: 에러 메시지 '할 일은 200자 이하여야 합니다' 가 표시되어야 한다
    - expect: 할 일 항목이 추가되지 않아야 한다

#### 2.4. 2.4 할 일 완료 토글

**File:** `features/next-app/specs/todos/todo-toggle.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하여 '독서하기' 할 일을 추가한다
    - expect: 할 일이 미완료 상태로 추가되어야 한다
  2. 추가된 항목의 data-testid='todo-checkbox-{id}' 체크박스를 클릭한다
    - expect: 체크박스가 체크된 상태로 변경되어야 한다
    - expect: 할 일 텍스트에 line-through 스타일이 적용되어야 한다
  3. 같은 체크박스를 다시 클릭한다
    - expect: 체크박스가 미체크 상태로 돌아와야 한다
    - expect: line-through 스타일이 제거되어야 한다

#### 2.5. 2.5 할 일 수정

**File:** `features/next-app/specs/todos/todo-edit.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하여 '원래 내용'을 추가한다
    - expect: 할 일이 목록에 추가되어야 한다
  2. 해당 항목의 data-testid='todo-edit-{id}' 버튼을 클릭한다
    - expect: data-testid='todo-edit-input-{id}' 인라인 편집 입력 필드가 나타나야 한다
  3. 편집 필드를 지우고 '수정된 내용'을 입력한 후 data-testid='todo-save-{id}' 를 클릭한다
    - expect: 편집 모드가 종료되고 '수정된 내용' 텍스트로 업데이트되어야 한다

#### 2.6. 2.6 할 일 수정 - 빈 텍스트 유효성 검증

**File:** `features/next-app/specs/todos/todo-edit-empty.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하여 할 일을 추가하고 수정 모드로 진입한다
    - expect: 편집 입력 필드가 표시되어야 한다
  2. 편집 입력 필드를 비우고 data-testid='todo-save-{id}' 를 클릭한다
    - expect: 에러 메시지 '할 일을 입력해주세요' 가 인라인으로 표시되어야 한다
    - expect: 편집 모드가 유지되어야 한다

#### 2.7. 2.7 할 일 수정 취소

**File:** `features/next-app/specs/todos/todo-edit-cancel.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하여 '원래 내용'을 추가하고 수정 모드로 진입한다
    - expect: 편집 입력 필드가 표시되어야 한다
  2. 편집 필드에 '임시 수정'을 입력한 후 data-testid='todo-cancel-{id}' 를 클릭한다
    - expect: 편집 모드가 종료되고 텍스트가 원래 '원래 내용'으로 유지되어야 한다

#### 2.8. 2.8 할 일 삭제 - 확인 후 삭제

**File:** `features/next-app/specs/todos/todo-delete.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하여 '삭제할 항목'을 추가한다
    - expect: 할 일이 목록에 나타나야 한다
  2. 해당 항목의 data-testid='todo-delete-{id}' 버튼을 클릭한다
    - expect: data-testid='todo-confirm-delete-{id}' 확인 UI가 '삭제할까요?' 텍스트와 함께 나타나야 한다
  3. data-testid='todo-confirm-yes-{id}' 버튼을 클릭한다
    - expect: '삭제할 항목' 이 목록에서 사라져야 한다
    - expect: 목록이 비었다면 빈 상태 메시지가 표시되어야 한다

#### 2.9. 2.9 할 일 삭제 취소

**File:** `features/next-app/specs/todos/todo-delete-cancel.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하여 할 일을 추가하고 삭제 버튼을 클릭한다
    - expect: 삭제 확인 UI가 나타나야 한다
  2. data-testid='todo-confirm-no-{id}' 버튼을 클릭한다
    - expect: 확인 UI가 사라지고 할 일 항목이 목록에 유지되어야 한다

#### 2.10. 2.10 텍스트 검색으로 할 일 필터링

**File:** `features/next-app/specs/todos/todo-search.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하여 '장보기', '운동하기', '독서'를 순서대로 추가한다
    - expect: 3개의 할 일 항목이 표시되어야 한다
  2. data-testid='search-input' 에 '장보기'를 입력한다
    - expect: '장보기' 항목만 표시되어야 한다
    - expect: data-testid 가 'todo-item-' 으로 시작하는 요소가 1개여야 한다
  3. 검색 입력 필드를 비운다
    - expect: 3개 항목이 모두 다시 표시되어야 한다

#### 2.11. 2.11 검색 결과 없음 빈 상태

**File:** `features/next-app/specs/todos/todo-search-empty.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하여 '장보기'를 추가한 뒤 data-testid='search-input' 에 '존재하지않는항목'을 입력한다
    - expect: data-testid='empty-state' 가 '검색 결과가 없습니다' 메시지와 함께 표시되어야 한다

#### 2.12. 2.12 완료 상태 필터 적용

**File:** `features/next-app/specs/todos/todo-filter-completed.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하여 '항목A'와 '항목B'를 추가한다
    - expect: 2개 항목이 표시되어야 한다
  2. '항목A'의 체크박스를 클릭하여 완료 처리한다
    - expect: '항목A'에 line-through 스타일이 적용되어야 한다
  3. data-testid='filter-completed' 버튼을 클릭한다
    - expect: '항목A'만 표시되어야 한다
    - expect: '항목B'는 표시되지 않아야 한다

#### 2.13. 2.13 진행중 상태 필터 적용

**File:** `features/next-app/specs/todos/todo-filter-active.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 로 이동하여 '항목A', '항목B'를 추가하고 '항목A'를 완료 처리한다
    - expect: 두 항목이 목록에 있어야 한다
  2. data-testid='filter-active' 버튼을 클릭한다
    - expect: '항목B'만 표시되어야 한다
    - expect: '항목A'는 표시되지 않아야 한다

#### 2.14. 2.14 에러 시뮬레이션 - ?simulate_error=true 쿼리 파라미터

**File:** `features/next-app/specs/todos/todo-simulate-error.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 http://localhost:3000/todos?simulate_error=true 로 이동한다
    - expect: data-testid='disable-error-simulation' 버튼이 표시되어야 한다
  2. data-testid='todo-input' 에 '에러 테스트'를 입력하고 data-testid='todo-add' 를 클릭한다
    - expect: ErrorMessage 컴포넌트가 '서버 오류가 발생했습니다' 메시지와 함께 표시되어야 한다
    - expect: 할 일이 목록에 추가되지 않아야 한다
  3. data-testid='disable-error-simulation' 버튼을 클릭한다
    - expect: 버튼이 사라지고 이후 할 일 추가가 정상 동작해야 한다

#### 2.15. 2.15 대시보드 빠른 추가로 할 일 생성

**File:** `features/next-app/specs/todos/todo-quick-add-dashboard.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /dashboard 로 이동한다
    - expect: '빠른 추가' 섹션과 TodoForm 이 표시되어야 한다
  2. 대시보드의 todo-input 에 '대시보드에서 추가'를 입력하고 todo-add 를 클릭한다
    - expect: data-testid='stat-total' 카운터가 1 증가해야 한다
  3. data-testid='go-to-todos' 링크를 클릭한다
    - expect: /todos 로 이동하고 '대시보드에서 추가' 항목이 목록에 보여야 한다

### 3. 3. 대시보드

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 3.1. 3.1 통계 카드 - 전체/완료/진행중 카운트 표시

**File:** `features/next-app/specs/dashboard/dashboard-stats.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입하여 /dashboard 로 이동한다
    - expect: data-testid='stat-total', data-testid='stat-completed', data-testid='stat-pending' 카드가 모두 0을 표시해야 한다
  2. /todos 로 이동하여 할 일 2개를 추가한 뒤 1개를 완료 처리하고 /dashboard 로 돌아온다
    - expect: data-testid='stat-total' 이 2를 표시해야 한다
    - expect: data-testid='stat-completed' 이 1을 표시해야 한다
    - expect: data-testid='stat-pending' 이 1을 표시해야 한다

#### 3.2. 3.2 현재 날짜 표시

**File:** `features/next-app/specs/dashboard/dashboard-current-date.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입하여 /dashboard 로 이동한다
    - expect: data-testid='current-date' 가 오늘 날짜를 한국어 형식(예: '2026. 3. 10.')으로 표시해야 한다 (하드코딩된 날짜가 아닌 동적 날짜여야 한다)

#### 3.3. 3.3 알림 목록 - API 로드 성공

**File:** `features/next-app/specs/dashboard/dashboard-notifications-success.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입하여 /dashboard 로 이동한다
    - expect: data-testid='notifications-loading' 로딩 스켈레톤이 일시적으로 표시되어야 한다
  2. /api/notifications 응답이 완료될 때까지 기다린다
    - expect: data-testid='notifications-list' 가 표시되어야 한다
    - expect: 하나 이상의 data-testid='notification-{id}' 항목이 표시되어야 한다
    - expect: 각 알림에 메시지와 시간이 표시되어야 한다

#### 3.4. 3.4 알림 목록 - 읽음/안읽음 스타일 구분

**File:** `features/next-app/specs/dashboard/dashboard-notifications-read-state.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입하여 /dashboard 로 이동하고 알림 목록이 로드될 때까지 기다린다
    - expect: data-testid='notifications-list' 가 표시되어야 한다
  2. 읽지 않은 알림(read: false) 항목과 읽은 알림(read: true) 항목의 배경색 클래스를 확인한다
    - expect: 읽지 않은 알림은 파란색 계열 배경(bg-blue-50 또는 bg-blue-900)을 가져야 한다
    - expect: 읽은 알림은 기본 흰색/회색 배경(bg-white 또는 bg-zinc-800)을 가져야 한다

### 4. 4. 프로필

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 4.1. 4.1 프로필 정보 보기

**File:** `features/next-app/specs/profile/profile-view.spec.ts`

**Steps:**
  1. 신규 계정(이름: '뷰테스트', 이메일: profile-view-{timestamp}@example.com)으로 회원가입 후 /profile 로 이동한다
    - expect: data-testid='profile-view' 가 표시되어야 한다
    - expect: data-testid='profile-display-name' 이 '뷰테스트'를 표시해야 한다
    - expect: 이메일이 올바르게 표시되어야 한다

#### 4.2. 4.2 이름과 자기소개 수정

**File:** `features/next-app/specs/profile/profile-edit-basic.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /profile 로 이동하고 data-testid='profile-edit-btn' 을 클릭한다
    - expect: data-testid='profile-form' 이 표시되어야 한다
  2. data-testid='profile-name' 을 '수정된이름'으로 변경하고 data-testid='profile-bio' 에 '안녕하세요 자기소개입니다'를 입력한다
    - expect: 입력 필드에 값이 입력되어야 한다
  3. data-testid='profile-save' 를 클릭한다
    - expect: data-testid='profile-saved' 성공 배너가 '프로필이 저장되었습니다' 메시지와 함께 표시되어야 한다
    - expect: data-testid='profile-display-name' 이 '수정된이름'을 표시해야 한다
    - expect: data-testid='profile-view' 로 전환되어야 한다

#### 4.3. 4.3 이름 빈 값 저장 시 유효성 검증 에러

**File:** `features/next-app/specs/profile/profile-edit-empty-name.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /profile 로 이동하여 수정 모드를 열고 data-testid='profile-name' 을 비운 뒤 data-testid='profile-save' 를 클릭한다
    - expect: '이름을 입력해주세요' 에러 메시지가 표시되어야 한다
    - expect: 프로필이 저장되지 않아야 한다

#### 4.4. 4.4 자기소개 500자 초과 유효성 검증

**File:** `features/next-app/specs/profile/profile-edit-bio-too-long.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /profile 로 이동하여 수정 모드를 열고 data-testid='profile-bio' 에 501자 이상의 텍스트를 입력한다
    - expect: 글자 수 카운터(예: '501/500')가 표시되어야 한다
  2. data-testid='profile-save' 를 클릭한다
    - expect: '자기소개는 500자 이하여야 합니다' 에러 메시지가 표시되어야 한다
    - expect: 프로필이 저장되지 않아야 한다

#### 4.5. 4.5 수정 취소 시 원래 값으로 복원

**File:** `features/next-app/specs/profile/profile-edit-cancel.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /profile 로 이동하여 수정 모드를 열고 이름을 변경한다
    - expect: 편집 필드에 새 이름이 입력되어야 한다
  2. data-testid='profile-cancel' 을 클릭한다
    - expect: data-testid='profile-view' 로 전환되어야 한다
    - expect: data-testid='profile-display-name' 이 원래 이름을 표시해야 한다

#### 4.6. 4.6 생년월일 DatePicker 선택

**File:** `features/next-app/specs/profile/profile-datepicker.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /profile 로 이동하여 수정 모드를 연다
    - expect: data-testid='profile-birthdate' 날짜 입력 필드가 표시되어야 한다
  2. data-testid='profile-birthdate' 에 '1990-01-15' 값을 입력한다
    - expect: 날짜 필드에 '1990-01-15'가 설정되어야 한다
  3. data-testid='profile-save' 를 클릭하여 저장한다
    - expect: 프로필이 저장되고 프로필 뷰에서 생년월일이 표시되어야 한다

#### 4.7. 4.7 기술 스택 MultiSelect - 항목 선택 및 칩 표시

**File:** `features/next-app/specs/profile/profile-multiselect.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /profile 로 이동하여 수정 모드를 연다
    - expect: data-testid='profile-skills-toggle' 버튼이 '선택하세요' 텍스트로 표시되어야 한다
  2. data-testid='profile-skills-toggle' 을 클릭하여 드롭다운을 연다
    - expect: data-testid='multiselect-dropdown' 이 나타나야 한다
    - expect: JavaScript, TypeScript, React 등 옵션이 표시되어야 한다
  3. data-testid='multiselect-option-JavaScript' 를 클릭하고 data-testid='multiselect-option-React' 를 클릭한다
    - expect: data-testid='multiselect-chip-JavaScript' 칩이 표시되어야 한다
    - expect: data-testid='multiselect-chip-React' 칩이 표시되어야 한다
    - expect: 토글 버튼이 '2개 선택됨'으로 변경되어야 한다

#### 4.8. 4.8 기술 스택 MultiSelect - 항목 제거

**File:** `features/next-app/specs/profile/profile-multiselect-remove.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /profile 로 이동하여 수정 모드를 열고 'JavaScript'와 'React'를 선택한다
    - expect: 두 항목의 칩이 표시되어야 한다
  2. data-testid='multiselect-chip-JavaScript' 의 × 버튼을 클릭한다
    - expect: data-testid='multiselect-chip-JavaScript' 칩이 사라져야 한다
    - expect: data-testid='multiselect-chip-React' 칩은 유지되어야 한다
    - expect: 토글 버튼이 '1개 선택됨'으로 변경되어야 한다

#### 4.9. 4.9 아바타 파일 업로드 - 유효한 이미지 파일

**File:** `features/next-app/specs/profile/profile-file-upload-valid.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /profile 로 이동하여 수정 모드를 연다
    - expect: data-testid='file-upload-button' 이 '파일 선택' 텍스트로 표시되어야 한다
  2. data-testid='file-upload-input' 에 유효한 PNG 이미지 파일(5MB 이하)을 업로드한다
    - expect: data-testid='file-upload-button' 이 '선택됨: {파일명}' 텍스트로 변경되어야 한다
    - expect: 에러 메시지가 표시되지 않아야 한다

#### 4.10. 4.10 아바타 파일 업로드 - 허용되지 않는 파일 형식 에러

**File:** `features/next-app/specs/profile/profile-file-upload-invalid-type.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /profile 로 이동하여 수정 모드를 열고 data-testid='file-upload-input' 에 .txt 파일을 업로드한다
    - expect: data-testid='file-upload-error' 가 표시되고 '허용되지 않는 파일 형식입니다' 메시지가 나타나야 한다

### 5. 5. 네비게이션 및 라우팅

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 5.1. 5.1 데스크톱 네비게이션 링크로 페이지 전환

**File:** `features/next-app/specs/navigation/nav-desktop-links.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /dashboard 에 있는 상태에서 data-testid='nav-todos' 링크를 클릭한다
    - expect: URL이 /todos 로 변경되어야 한다
    - expect: 할 일 목록 페이지가 렌더링되어야 한다
  2. data-testid='nav-profile' 링크를 클릭한다
    - expect: URL이 /profile 로 변경되어야 한다
    - expect: 프로필 페이지가 렌더링되어야 한다
  3. data-testid='nav-dashboard' 링크를 클릭한다
    - expect: URL이 /dashboard 로 변경되어야 한다
    - expect: 대시보드 페이지가 렌더링되어야 한다

#### 5.2. 5.2 모바일 햄버거 메뉴 열기/닫기

**File:** `features/next-app/specs/navigation/nav-hamburger-menu.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 뷰포트를 375x667로 설정한다
    - expect: data-testid='hamburger-menu' 버튼이 표시되어야 한다
    - expect: 데스크톱 nav 링크들이 숨겨져야 한다
  2. data-testid='hamburger-menu' 를 클릭한다
    - expect: data-testid='mobile-menu' 가 표시되어야 한다
    - expect: 대시보드, 할 일, 프로필 링크가 표시되어야 한다
  3. 모바일 메뉴의 '할 일' 링크를 클릭한다
    - expect: /todos 로 이동해야 한다
    - expect: mobile-menu 가 닫혀야 한다

#### 5.3. 5.3 모바일 메뉴에서 로그아웃

**File:** `features/next-app/specs/navigation/nav-mobile-logout.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 뷰포트를 375x667로 설정하고 data-testid='hamburger-menu' 를 클릭한다
    - expect: data-testid='mobile-menu' 가 표시되어야 한다
  2. data-testid='mobile-logout' 을 클릭한다
    - expect: /login 으로 이동해야 한다
    - expect: 인증 상태가 해제되어야 한다

#### 5.4. 5.4 브레드크럼 표시

**File:** `features/next-app/specs/navigation/nav-breadcrumbs.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 http://localhost:3000/todos 로 이동한다
    - expect: data-testid='breadcrumbs' 가 '홈' 텍스트를 포함해야 한다
    - expect: data-testid='breadcrumbs' 가 '할 일' 텍스트를 포함해야 한다
  2. http://localhost:3000/profile 로 이동한다
    - expect: data-testid='breadcrumbs' 가 '홈 / 프로필' 형태로 표시되어야 한다

#### 5.5. 5.5 로고 클릭 시 홈으로 이동

**File:** `features/next-app/specs/navigation/nav-logo.spec.ts`

**Steps:**
  1. 신규 계정으로 회원가입 후 /todos 페이지에서 data-testid='nav-logo' 를 클릭한다
    - expect: 인증 상태이므로 / 로 이동하고 즉시 /dashboard 로 리다이렉트 되어야 한다

#### 5.6. 5.6 비인증 상태 네비게이션바 - 로그인/회원가입 링크 표시

**File:** `features/next-app/specs/navigation/nav-unauthenticated.spec.ts`

**Steps:**
  1. localStorage 를 비운 상태에서 http://localhost:3000/login 으로 이동한다
    - expect: data-testid='nav-login' 링크가 표시되어야 한다
    - expect: data-testid='nav-signup' 링크가 표시되어야 한다
    - expect: data-testid='nav-logout' 버튼이 표시되지 않아야 한다

### 6. 6. 쿠키 동의 배너

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 6.1. 6.1 첫 방문 시 쿠키 배너 표시

**File:** `features/next-app/specs/cookie/cookie-banner-appears.spec.ts`

**Steps:**
  1. localStorage 에서 'cookie-consent' 항목을 제거한 뒤 http://localhost:3000 으로 이동한다
    - expect: data-testid='cookie-banner' 오버레이가 표시되어야 한다
    - expect: '이 웹사이트는 쿠키를 사용합니다' 텍스트가 표시되어야 한다
    - expect: data-testid='cookie-accept' 버튼이 표시되어야 한다

#### 6.2. 6.2 쿠키 동의 후 배너 사라짐

**File:** `features/next-app/specs/cookie/cookie-banner-accept.spec.ts`

**Steps:**
  1. localStorage 에서 'cookie-consent' 를 제거하고 http://localhost:3000 으로 이동하여 배너가 표시되는지 확인한다
    - expect: data-testid='cookie-banner' 가 표시되어야 한다
  2. data-testid='cookie-accept' 버튼을 클릭한다
    - expect: data-testid='cookie-banner' 가 사라져야 한다
    - expect: localStorage 에 'cookie-consent' 가 'true'로 저장되어야 한다
  3. 페이지를 새로고침한다
    - expect: data-testid='cookie-banner' 가 표시되지 않아야 한다

#### 6.3. 6.3 쿠키 동의 후 배너가 네비게이션 차단하지 않음

**File:** `features/next-app/specs/cookie/cookie-banner-no-block.spec.ts`

**Steps:**
  1. localStorage 에 'cookie-consent': 'true'를 설정한 상태에서 신규 계정으로 회원가입 후 /dashboard 로 이동한다
    - expect: data-testid='cookie-banner' 가 표시되지 않아야 한다
  2. data-testid='nav-todos' 링크를 클릭한다
    - expect: /todos 로 정상 이동되어야 한다

#### 6.4. 6.4 쿠키 배너가 표시된 상태에서 배너가 컨텐츠를 덮음(z-index 오버레이)

**File:** `features/next-app/specs/cookie/cookie-banner-overlay.spec.ts`

**Steps:**
  1. localStorage 에서 'cookie-consent' 를 제거하고 http://localhost:3000/login 으로 이동한다
    - expect: data-testid='cookie-banner' 가 fixed inset-0 z-50 스타일로 전체 화면을 덮어야 한다
  2. 쿠키 배너 뒤의 로그인 버튼(data-testid='login-submit') 영역을 클릭 시도한다
    - expect: 배너가 최상위 레이어에 위치하여 배너 뒤 요소의 클릭이 차단되어야 한다

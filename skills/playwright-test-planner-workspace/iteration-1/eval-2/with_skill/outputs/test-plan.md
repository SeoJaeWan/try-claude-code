# 로그인이 필요한 관리자 페이지 E2E 테스트 플랜

## Application Overview

Next.js 기반 할 일 관리 웹 애플리케이션(TestApp)의 인증 및 보호된 페이지 E2E 테스트 플랜. 주요 인증 메커니즘: 이메일/비밀번호 기반 회원가입/로그인/로그아웃, localStorage 기반 세션 관리(30분 만료), auth_user/auth_login_at/auth_users 키 사용. 보호된 페이지: /dashboard, /todos, /profile (비인증 시 /login으로 리다이렉트). 공개 페이지: /, /login, /signup. 쿠키 동의 배너(localStorage cookie-consent)가 모든 상호작용을 차단할 수 있으므로 테스트 전 localStorage에 cookie-consent=true 설정 필요. 각 테스트는 독립적으로 실행 가능하며, 신규 고유 이메일(timestamp 포함)로 회원가입하는 방식으로 격리.

## Test Scenarios

### 1. 1. 사용자 인증 - 회원가입

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 1.1. 유효한 회원가입 후 대시보드 이동

**File:** `features/next-app/specs/auth/signup-valid.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 http://localhost:3000/signup 으로 이동한다
    - expect: URL이 /signup 이어야 한다
    - expect: 회원가입 폼(이름, 이메일, 비밀번호, 비밀번호 확인 필드)이 표시되어야 한다
  2. data-testid='signup-name' 에 '테스트유저'를 입력한다
    - expect: 이름 필드에 '테스트유저'가 입력되어야 한다
  3. data-testid='signup-email' 에 고유한 이메일(예: signup-valid-{timestamp}@example.com)을 입력한다
    - expect: 이메일 필드에 값이 입력되어야 한다
  4. data-testid='signup-password' 에 'password123'을, data-testid='signup-confirm-password' 에 'password123'을 입력한다
    - expect: 비밀번호 필드에 값이 입력되어야 한다
  5. data-testid='signup-submit' 버튼을 클릭한다
    - expect: URL이 /dashboard 로 변경되어야 한다
    - expect: data-testid='greeting' 에 '안녕하세요, 테스트유저님' 텍스트가 표시되어야 한다

#### 1.2. 이미 등록된 이메일로 회원가입 시 에러

**File:** `features/next-app/specs/auth/signup-duplicate-email.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 /signup 으로 이동하여 첫 번째 회원가입을 완료하고 로그아웃한다
    - expect: 첫 번째 가입 성공 후 /dashboard 로 이동, 로그아웃 후 /login 으로 이동해야 한다
  2. /signup 으로 다시 이동하여 동일한 이메일로 두 번째 회원가입을 시도한다
    - expect: data-testid='signup-error' 가 표시되고 '이미 등록된 이메일입니다' 메시지가 나타나야 한다
    - expect: 페이지가 /dashboard 로 이동하지 않아야 한다

#### 1.3. 비밀번호 불일치 시 에러 표시

**File:** `features/next-app/specs/auth/signup-password-mismatch.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 /signup 으로 이동한다
    - expect: 회원가입 폼이 표시되어야 한다
  2. 이름, 이메일을 입력하고 비밀번호에 'password123', 비밀번호 확인에 'different123'을 입력한 후 data-testid='signup-submit' 을 클릭한다
    - expect: data-testid='confirm-password-error' 가 표시되고 '비밀번호가 일치하지 않습니다' 메시지가 나타나야 한다
    - expect: 페이지가 /dashboard 로 이동하지 않아야 한다

#### 1.4. 비밀번호 8자 미만 입력 시 유효성 검증 에러

**File:** `features/next-app/specs/auth/signup-short-password.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 /signup 으로 이동한다
    - expect: 회원가입 폼이 표시되어야 한다
  2. 이름, 이메일을 입력하고 data-testid='signup-password' 에 'short'(5자)를 입력한 후 data-testid='signup-submit' 을 클릭한다
    - expect: data-testid='password-error' 가 표시되고 '비밀번호는 8자 이상이어야 합니다' 메시지가 나타나야 한다
    - expect: 폼이 제출되지 않아야 한다

### 2. 2. 사용자 인증 - 로그인

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 2.1. 유효한 로그인 후 대시보드 이동

**File:** `features/next-app/specs/auth/login-valid.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 /signup 으로 이동하여 신규 계정(이름: '로그인유저', 이메일: login-valid-{timestamp}@example.com, 비밀번호: password123)을 생성한다
    - expect: /dashboard 로 이동해야 한다
  2. data-testid='nav-logout' 버튼을 클릭하여 로그아웃한다
    - expect: /login 으로 이동해야 한다
  3. data-testid='login-email' 에 등록한 이메일을, data-testid='login-password' 에 'password123'을 입력하고 data-testid='login-submit' 을 클릭한다
    - expect: /dashboard 로 이동해야 한다
    - expect: data-testid='greeting' 에 '안녕하세요, 로그인유저님' 텍스트가 표시되어야 한다

#### 2.2. 미등록 이메일로 로그인 시 에러

**File:** `features/next-app/specs/auth/login-unregistered-email.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 /login 으로 이동한다
    - expect: 로그인 폼이 표시되어야 한다
  2. data-testid='login-email' 에 'notexist@example.com'을, data-testid='login-password' 에 'password123'을 입력하고 data-testid='login-submit' 을 클릭한다
    - expect: data-testid='login-error' 가 표시되고 '등록되지 않은 이메일입니다' 메시지가 나타나야 한다
    - expect: URL이 /login 에 유지되어야 한다

#### 2.3. 잘못된 비밀번호로 로그인 시 에러

**File:** `features/next-app/specs/auth/login-wrong-password.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정을 생성한 후 로그아웃하여 /login 에 접근한다
    - expect: 로그인 폼이 표시되어야 한다
  2. 등록된 이메일과 잘못된 비밀번호 'wrongpass1'을 입력하고 data-testid='login-submit' 을 클릭한다
    - expect: data-testid='login-error' 가 표시되고 '비밀번호가 일치하지 않습니다' 메시지가 나타나야 한다

#### 2.4. 로그인 폼 비밀번호 8자 미만 클라이언트 유효성 검증

**File:** `features/next-app/specs/auth/login-short-password.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 /login 으로 이동하여 data-testid='login-email' 에 이메일을, data-testid='login-password' 에 'short'(5자)를 입력하고 data-testid='login-submit' 을 클릭한다
    - expect: data-testid='password-error' 가 표시되고 '비밀번호는 8자 이상이어야 합니다' 메시지가 나타나야 한다
    - expect: login() 함수가 호출되지 않아야 한다

### 3. 3. 보호된 페이지 접근 제어 (인증 필요)

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 3.1. 비인증 상태에서 /dashboard 직접 접근 시 /login 으로 리다이렉트

**File:** `features/next-app/specs/auth/protected-dashboard-redirect.spec.ts`

**Steps:**
  1. localStorage를 완전히 비운 상태(auth_user, auth_login_at 없음)에서 http://localhost:3000/dashboard 로 직접 이동한다
    - expect: URL이 /login 으로 리다이렉트 되어야 한다
    - expect: 로그인 폼이 표시되어야 한다
    - expect: 대시보드 콘텐츠가 렌더링되지 않아야 한다

#### 3.2. 비인증 상태에서 /todos 직접 접근 시 /login 으로 리다이렉트

**File:** `features/next-app/specs/auth/protected-todos-redirect.spec.ts`

**Steps:**
  1. localStorage를 완전히 비운 상태에서 http://localhost:3000/todos 로 직접 이동한다
    - expect: URL이 /login 으로 리다이렉트 되어야 한다
    - expect: 로그인 폼이 표시되어야 한다

#### 3.3. 비인증 상태에서 /profile 직접 접근 시 /login 으로 리다이렉트

**File:** `features/next-app/specs/auth/protected-profile-redirect.spec.ts`

**Steps:**
  1. localStorage를 완전히 비운 상태에서 http://localhost:3000/profile 로 직접 이동한다
    - expect: URL이 /login 으로 리다이렉트 되어야 한다
    - expect: 로그인 폼이 표시되어야 한다
    - expect: 프로필 콘텐츠가 렌더링되지 않아야 한다

#### 3.4. 로그아웃 후 보호된 페이지 접근 차단

**File:** `features/next-app/specs/auth/logout-then-protected.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정으로 회원가입하여 /dashboard 에 접근한 상태에서 data-testid='nav-logout' 을 클릭한다
    - expect: /login 으로 이동해야 한다
    - expect: data-testid='nav-logout' 버튼이 사라져야 한다
  2. http://localhost:3000/dashboard 로 직접 이동을 시도한다
    - expect: /login 으로 리다이렉트 되어야 한다
  3. http://localhost:3000/todos 로 직접 이동을 시도한다
    - expect: /login 으로 리다이렉트 되어야 한다
  4. http://localhost:3000/profile 로 직접 이동을 시도한다
    - expect: /login 으로 리다이렉트 되어야 한다

#### 3.5. 인증 후 /login 또는 /signup 접근 시 /dashboard 로 리다이렉트

**File:** `features/next-app/specs/auth/authenticated-redirects.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정으로 회원가입하여 인증 상태가 된 후 http://localhost:3000/ 으로 이동한다
    - expect: / 에서 즉시 /dashboard 로 리다이렉트 되어야 한다
    - expect: 홈 페이지의 로그인/회원가입 링크가 표시되지 않아야 한다

### 4. 4. 세션 관리 및 엣지 케이스

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 4.1. 30분 세션 만료 후 보호 페이지 자동 리다이렉트

**File:** `features/next-app/specs/auth/session-expired.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정으로 회원가입하여 /dashboard 에 접근한다
    - expect: 대시보드가 표시되어야 한다
  2. localStorage의 auth_login_at 값을 현재 시간 - 31분(1,860,000ms)으로 조작한다
    - expect: localStorage의 auth_login_at 값이 만료된 시간으로 설정되어야 한다
  3. http://localhost:3000/dashboard 로 페이지를 새로고침한다
    - expect: /login 으로 리다이렉트 되어야 한다
    - expect: localStorage에서 auth_user와 auth_login_at 키가 제거되어야 한다

#### 4.2. localStorage에서 auth_user 수동 삭제 후 보호 페이지 접근 차단

**File:** `features/next-app/specs/auth/session-storage-deleted.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정으로 회원가입하여 인증 상태가 된 후 localStorage에서 auth_user 키를 수동으로 삭제한다
    - expect: localStorage에 auth_user 키가 없어야 한다
  2. http://localhost:3000/dashboard 로 새로고침한다
    - expect: /login 으로 리다이렉트 되어야 한다
    - expect: 인증 상태가 해제되어야 한다

#### 4.3. 로그인 상태에서 auth_login_at 정상 범위일 때 세션 유지

**File:** `features/next-app/specs/auth/session-valid.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정으로 회원가입하여 /dashboard 에 접근한다
    - expect: 대시보드가 표시되어야 한다
  2. 페이지를 새로고침한다
    - expect: URL이 /dashboard 에 유지되어야 한다
    - expect: data-testid='greeting' 이 표시되어야 한다
    - expect: /login 으로 리다이렉트 되지 않아야 한다

#### 4.4. 로그아웃 시 localStorage에서 인증 데이터 완전 삭제

**File:** `features/next-app/specs/auth/logout-clears-storage.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정으로 회원가입하여 인증 상태가 된 후 data-testid='nav-logout' 을 클릭한다
    - expect: /login 으로 이동해야 한다
  2. localStorage의 auth_user 및 auth_login_at 키 존재 여부를 확인한다
    - expect: localStorage에 auth_user 키가 없어야 한다
    - expect: localStorage에 auth_login_at 키가 없어야 한다

### 5. 5. 비인증 상태 UI - 홈 및 네비게이션

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 5.1. 비인증 상태 홈 페이지 - 로그인/회원가입 링크 표시

**File:** `features/next-app/specs/auth/home-unauthenticated.spec.ts`

**Steps:**
  1. localStorage를 완전히 비운 상태에서 http://localhost:3000 으로 이동한다
    - expect: data-testid='home-login' 링크가 표시되어야 한다
    - expect: data-testid='home-signup' 링크가 표시되어야 한다
    - expect: 대시보드 콘텐츠가 없어야 한다
  2. data-testid='home-login' 링크를 클릭한다
    - expect: /login 으로 이동해야 한다
  3. /으로 돌아가서 data-testid='home-signup' 링크를 클릭한다
    - expect: /signup 으로 이동해야 한다

#### 5.2. 비인증 상태 네비게이션바 - 로그인/회원가입 링크, 로그아웃 버튼 없음

**File:** `features/next-app/specs/auth/nav-unauthenticated.spec.ts`

**Steps:**
  1. localStorage를 완전히 비운 상태에서 http://localhost:3000/login 으로 이동한다
    - expect: data-testid='nav-login' 링크가 표시되어야 한다
    - expect: data-testid='nav-signup' 링크가 표시되어야 한다
    - expect: data-testid='nav-logout' 버튼이 표시되지 않아야 한다
    - expect: data-testid='hamburger-menu' 버튼이 표시되지 않아야 한다

#### 5.3. 인증 상태 네비게이션바 - 대시보드/할 일/프로필 링크 및 로그아웃 버튼 표시

**File:** `features/next-app/specs/auth/nav-authenticated.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정으로 회원가입하여 /dashboard 에 접근한다
    - expect: data-testid='nav-dashboard' 링크가 표시되어야 한다
    - expect: data-testid='nav-todos' 링크가 표시되어야 한다
    - expect: data-testid='nav-profile' 링크가 표시되어야 한다
    - expect: data-testid='nav-logout' 버튼이 표시되어야 한다
    - expect: data-testid='nav-user-email' 에 로그인한 이메일이 표시되어야 한다

### 6. 6. 인증 후 보호된 페이지 정상 접근

**Seed:** `features/next-app/tests/seed.spec.ts`

#### 6.1. 인증 후 /dashboard 접근 - 인사말 및 통계 카드 표시

**File:** `features/next-app/specs/auth/authenticated-dashboard.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정(이름: '대시보드유저')으로 회원가입한다
    - expect: /dashboard 로 이동해야 한다
    - expect: data-testid='greeting' 에 '안녕하세요, 대시보드유저님' 텍스트가 표시되어야 한다
    - expect: data-testid='stat-total', 'stat-completed', 'stat-pending' 카드가 표시되어야 한다
    - expect: data-testid='current-date' 에 오늘 날짜가 표시되어야 한다

#### 6.2. 인증 후 /todos 접근 - 할 일 목록 페이지 표시

**File:** `features/next-app/specs/auth/authenticated-todos.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정으로 회원가입하여 http://localhost:3000/todos 로 이동한다
    - expect: URL이 /todos 이어야 한다
    - expect: 할 일 목록 페이지 제목 '할 일 목록'이 표시되어야 한다
    - expect: data-testid='empty-state' 가 표시되어야 한다
    - expect: /login 으로 리다이렉트 되지 않아야 한다

#### 6.3. 인증 후 /profile 접근 - 프로필 정보 표시

**File:** `features/next-app/specs/auth/authenticated-profile.spec.ts`

**Steps:**
  1. localStorage에 cookie-consent=true 설정 후 신규 계정(이름: '프로필유저', 이메일: profile-auth-{timestamp}@example.com)으로 회원가입하여 http://localhost:3000/profile 로 이동한다
    - expect: URL이 /profile 이어야 한다
    - expect: data-testid='profile-view' 가 표시되어야 한다
    - expect: data-testid='profile-display-name' 에 '프로필유저'가 표시되어야 한다
    - expect: 이메일이 표시되어야 한다
    - expect: data-testid='profile-edit-btn' 이 표시되어야 한다

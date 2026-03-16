# Test Plan: Authentication and Admin Pages

## Application Overview
- **URL**: http://localhost:3000
- **Stack**: Next.js app with client-side auth (localStorage), Korean UI
- **Pages**: / (home), /login, /signup, /dashboard, /profile, /todos, /error-demo
- **Auth mechanism**: localStorage-based with 30-minute session timeout
- **Protected pages**: /dashboard, /profile, /todos (redirect to /login when unauthenticated)

---

## Test Suite 1: Login Page (`/login`)

### Test 1.1: Login page renders correctly
- **Steps**: Navigate to `/login`
- **Expected**: Page title "로그인" is visible; email input (`data-testid="login-email"`), password input (`data-testid="login-password"`), submit button (`data-testid="login-submit"`) are present; link to signup ("회원가입") is visible

### Test 1.2: Email validation - empty field
- **Steps**: Leave email empty, fill password with "password123", click submit
- **Expected**: Error message "이메일을 입력해주세요" appears (`data-testid="email-error"`)

### Test 1.3: Email validation - invalid format
- **Steps**: Enter "invalid-email" in email, fill password with "password123", click submit
- **Expected**: Error message "올바른 이메일 형식이 아닙니다" appears

### Test 1.4: Password validation - empty field
- **Steps**: Enter valid email, leave password empty, click submit
- **Expected**: Error message "비밀번호를 입력해주세요" appears (`data-testid="password-error"`)

### Test 1.5: Password validation - too short
- **Steps**: Enter valid email, enter "1234567" (7 chars) as password, click submit
- **Expected**: Error message "비밀번호는 8자 이상이어야 합니다" appears

### Test 1.6: Login with unregistered email
- **Steps**: Enter "unknown@test.com" / "password123", click submit
- **Expected**: Error "등록되지 않은 이메일입니다" in `data-testid="login-error"`

### Test 1.7: Login with wrong password
- **Precondition**: Register user via signup first
- **Steps**: Enter registered email with wrong password, click submit
- **Expected**: Error "비밀번호가 일치하지 않습니다" in `data-testid="login-error"`

### Test 1.8: Successful login redirects to dashboard
- **Precondition**: Register user via signup first
- **Steps**: Enter valid credentials, click submit
- **Expected**: Redirected to `/dashboard`; greeting "안녕하세요, {name}님" is visible

### Test 1.9: Inline validation on blur
- **Steps**: Click email field, then blur without entering text
- **Expected**: Email error appears immediately on blur

### Test 1.10: Navigate to signup from login page
- **Steps**: Click "회원가입" link
- **Expected**: Navigated to `/signup`

---

## Test Suite 2: Signup Page (`/signup`)

### Test 2.1: Signup page renders correctly
- **Steps**: Navigate to `/signup`
- **Expected**: Title "회원가입" visible; name (`data-testid="signup-name"`), email, password, confirm password inputs and submit button present

### Test 2.2: Name validation - empty
- **Steps**: Leave name empty, fill other fields correctly, submit
- **Expected**: "이름을 입력해주세요" error (`data-testid="name-error"`)

### Test 2.3: Email validation on signup
- **Steps**: Enter invalid email format, submit
- **Expected**: "올바른 이메일 형식이 아닙니다" error

### Test 2.4: Password mismatch
- **Steps**: Enter "password123" as password and "password456" as confirm, submit
- **Expected**: "비밀번호가 일치하지 않습니다" error (`data-testid="confirm-password-error"`)

### Test 2.5: Duplicate email registration
- **Precondition**: Already registered with "test@test.com"
- **Steps**: Try to register again with "test@test.com"
- **Expected**: "이미 등록된 이메일입니다" error (`data-testid="signup-error"`)

### Test 2.6: Successful signup redirects to dashboard
- **Steps**: Fill all fields correctly (name: "테스트", email: "new@test.com", password: "password123", confirm: "password123"), submit
- **Expected**: Redirected to `/dashboard` with greeting

### Test 2.7: Navigate to login from signup
- **Steps**: Click "로그인" link
- **Expected**: Navigated to `/login`

---

## Test Suite 3: Auth Guard (Protected Page Access)

### Test 3.1: Unauthenticated access to /dashboard redirects to /login
- **Steps**: Navigate to `/dashboard` without logging in
- **Expected**: Redirected to `/login`

### Test 3.2: Unauthenticated access to /todos redirects to /login
- **Steps**: Navigate to `/todos` without logging in
- **Expected**: Redirected to `/login`

### Test 3.3: Unauthenticated access to /profile redirects to /login
- **Steps**: Navigate to `/profile` without logging in
- **Expected**: Redirected to `/login`

### Test 3.4: Authenticated user can access all protected pages
- **Precondition**: Logged in
- **Steps**: Navigate to `/dashboard`, `/todos`, `/profile` sequentially
- **Expected**: All pages render correctly without redirect

---

## Test Suite 4: Dashboard Page (`/dashboard`) - Post-Login

### Test 4.1: Dashboard displays greeting with user name
- **Precondition**: Logged in as "테스트유저"
- **Expected**: `data-testid="greeting"` contains "안녕하세요, 테스트유저님"

### Test 4.2: Dashboard displays current date
- **Expected**: `data-testid="current-date"` shows today's date in Korean locale

### Test 4.3: Dashboard shows todo statistics
- **Expected**: Stats cards visible (`data-testid="stat-total"`, `data-testid="stat-completed"`, `data-testid="stat-pending"`)

### Test 4.4: Quick add todo from dashboard
- **Steps**: Enter todo text in TodoForm, submit
- **Expected**: Todo count in stats increases; todo appears in list

### Test 4.5: Dashboard shows notifications section
- **Expected**: "알림" heading and NotificationList component rendered

### Test 4.6: Navigate to full todo list
- **Steps**: Click "전체 할 일 목록 보기" link (`data-testid="go-to-todos"`)
- **Expected**: Navigated to `/todos`

---

## Test Suite 5: Profile Page (`/profile`) - Post-Login

### Test 5.1: Profile displays user info in view mode
- **Precondition**: Logged in
- **Expected**: `data-testid="profile-view"` visible; name (`data-testid="profile-display-name"`), email, bio, skills, birthdate, avatar fields shown

### Test 5.2: Switch to edit mode
- **Steps**: Click "프로필 수정" (`data-testid="profile-edit-btn"`)
- **Expected**: `data-testid="profile-form"` visible with editable fields

### Test 5.3: Edit and save profile
- **Steps**: Enter edit mode, change name to "수정된이름", click "저장" (`data-testid="profile-save"`)
- **Expected**: View mode restored; name shows "수정된이름"; success message "프로필이 저장되었습니다" (`data-testid="profile-saved"`) appears

### Test 5.4: Profile edit - name validation
- **Steps**: Enter edit mode, clear name field, click save
- **Expected**: Error "이름을 입력해주세요" displayed

### Test 5.5: Profile edit - bio length validation
- **Steps**: Enter edit mode, enter 501+ character bio, click save
- **Expected**: Error "자기소개는 500자 이하여야 합니다" displayed

### Test 5.6: Cancel editing restores original values
- **Steps**: Enter edit mode, change name, click "취소" (`data-testid="profile-cancel"`)
- **Expected**: View mode restored with original name

### Test 5.7: Edit skills using MultiSelect
- **Steps**: Enter edit mode, select skills (e.g., "JavaScript", "TypeScript"), save
- **Expected**: Skills displayed in view mode as "JavaScript, TypeScript"

### Test 5.8: Edit birth date using DatePicker
- **Steps**: Enter edit mode, set birth date, save
- **Expected**: Birth date shown in view mode

### Test 5.9: Upload avatar via FileUpload
- **Steps**: Enter edit mode, upload image file, save
- **Expected**: Avatar file name shown in view mode

---

## Test Suite 6: Todos Page (`/todos`) - Post-Login

### Test 6.1: Todos page renders with empty state
- **Precondition**: Logged in, no todos
- **Expected**: "아직 할 일이 없습니다" empty state message visible

### Test 6.2: Add a new todo
- **Steps**: Type "새로운 할 일" in TodoForm, submit
- **Expected**: Todo item appears in list

### Test 6.3: Toggle todo completion
- **Steps**: Click toggle on existing todo
- **Expected**: Todo marked as completed (visual change)

### Test 6.4: Edit existing todo
- **Steps**: Click edit on todo, change text, save
- **Expected**: Updated text displayed

### Test 6.5: Delete a todo
- **Steps**: Click delete on todo
- **Expected**: Todo removed from list

### Test 6.6: Search/filter todos
- **Steps**: Add multiple todos, type search term in SearchFilter
- **Expected**: Only matching todos shown

### Test 6.7: Filter by status (all/active/completed)
- **Steps**: Add todos, complete some, use filter buttons
- **Expected**: "active" shows only incomplete; "completed" shows only done; "all" shows everything

### Test 6.8: Empty search results
- **Steps**: Search for non-existing text
- **Expected**: "검색 결과가 없습니다" message

### Test 6.9: Todo text validation - empty
- **Steps**: Submit empty todo form
- **Expected**: Error "할 일을 입력해주세요"

### Test 6.10: Todo text validation - too long
- **Steps**: Submit todo text > 200 chars
- **Expected**: Error "할 일은 200자 이하여야 합니다"

---

## Test Suite 7: Navigation & Logout

### Test 7.1: Navbar shows correct links when authenticated
- **Precondition**: Logged in
- **Expected**: "대시보드", "할 일", "프로필" links visible; user email shown (`data-testid="nav-user-email"`); logout button visible

### Test 7.2: Navbar shows login/signup when unauthenticated
- **Expected**: "로그인" (`data-testid="nav-login"`) and "회원가입" (`data-testid="nav-signup"`) links visible

### Test 7.3: Active nav link highlighting
- **Steps**: Navigate to `/dashboard`
- **Expected**: Dashboard nav link has active styling (blue color)

### Test 7.4: Logout clears session
- **Steps**: Click "로그아웃" (`data-testid="nav-logout"`)
- **Expected**: Redirected to `/login`; localStorage cleared; accessing `/dashboard` redirects to login

### Test 7.5: Breadcrumbs display correctly
- **Steps**: Navigate to `/dashboard`
- **Expected**: Breadcrumbs show "홈 / 대시보드" (`data-testid="breadcrumbs"`)

### Test 7.6: Mobile hamburger menu
- **Precondition**: Viewport set to mobile width
- **Steps**: Click hamburger (`data-testid="hamburger-menu"`)
- **Expected**: Mobile menu (`data-testid="mobile-menu"`) opens with nav links and logout

### Test 7.7: Mobile menu logout
- **Steps**: Open mobile menu, click "로그아웃" (`data-testid="mobile-logout"`)
- **Expected**: Menu closes, redirected to `/login`

---

## Test Suite 8: Session Management

### Test 8.1: Session persists across page reload
- **Precondition**: Logged in
- **Steps**: Reload page
- **Expected**: User remains logged in, dashboard accessible

### Test 8.2: Session timeout after 30 minutes
- **Steps**: Login, manually set `auth_login_at` in localStorage to 31 minutes ago, reload
- **Expected**: User logged out, redirected to login

---

## Test Suite 9: Full E2E Flows

### Test 9.1: Complete signup-to-dashboard flow
- **Steps**: Navigate to `/signup` -> fill form -> submit -> verify dashboard -> add todo -> verify stats update

### Test 9.2: Login -> manage todos -> logout -> verify guard
- **Steps**: Login -> navigate to `/todos` -> add/toggle/delete todos -> logout -> try accessing `/todos` -> verify redirect to `/login`

### Test 9.3: Login -> edit profile -> verify persistence
- **Steps**: Login -> go to `/profile` -> edit name/bio/skills -> save -> reload page -> verify changes persisted

# E2E Test Plan - TestApp (Todo Management Application)

## Application Overview

TestApp is a Korean-language Next.js todo management application running at `http://localhost:3000`. It uses client-side state with `localStorage` for authentication and data persistence. The app includes authentication (signup/login/logout), a dashboard with statistics and notifications, full CRUD todo management with search/filter, a profile editor with file upload/date picker/multi-select, a cookie consent banner, error handling demos, and responsive navigation with breadcrumbs.

---

## Test Scenarios

### 1. Cookie Consent Banner

| # | Step | Expected Result |
|---|------|-----------------|
| 1.1 | Navigate to `http://localhost:3000` (fresh session, no `cookie-consent` in localStorage) | Cookie banner is visible with overlay (`data-testid="cookie-banner"`) displaying consent message |
| 1.2 | Click the "동의" (Accept) button (`data-testid="cookie-accept"`) | Banner disappears; `localStorage` key `cookie-consent` is set to `"true"` |
| 1.3 | Reload the page | Cookie banner does NOT appear again |

---

### 2. Home Page (Unauthenticated)

| # | Step | Expected Result |
|---|------|-----------------|
| 2.1 | Navigate to `http://localhost:3000` while not logged in | Page shows "TestApp" heading, welcome message "할 일 관리 애플리케이션에 오신 것을 환영합니다", and two buttons: "로그인" (`data-testid="home-login"`) and "회원가입" (`data-testid="home-signup"`) |
| 2.2 | Verify navbar shows login/signup links | Navbar (`data-testid="navbar"`) shows "로그인" (`data-testid="nav-login"`) and "회원가입" (`data-testid="nav-signup"`) links |
| 2.3 | Click "로그인" button | Navigates to `/login` |
| 2.4 | Go back, click "회원가입" button | Navigates to `/signup` |

---

### 3. Signup

| # | Step | Expected Result |
|---|------|-----------------|
| 3.1 | Navigate to `/signup` | Signup form is displayed with fields: 이름 (`data-testid="signup-name"`), 이메일 (`data-testid="signup-email"`), 비밀번호 (`data-testid="signup-password"`), 비밀번호 확인 (`data-testid="signup-confirm-password"`), and submit button (`data-testid="signup-submit"`) |
| 3.2 | Submit the form with all fields empty | Validation errors appear for name, email, and password fields |
| 3.3 | Enter invalid email format (e.g., "notanemail") | Email validation error: "올바른 이메일 형식이 아닙니다" (`data-testid="email-error"`) |
| 3.4 | Enter password shorter than 8 characters | Password validation error: "비밀번호는 8자 이상이어야 합니다" (`data-testid="password-error"`) |
| 3.5 | Enter mismatched passwords (password: "password123", confirm: "different123") | Confirm password error: "비밀번호가 일치하지 않습니다" (`data-testid="confirm-password-error"`) |
| 3.6 | Fill all fields correctly (name: "테스트유저", email: "test@example.com", password: "password123", confirm: "password123") and submit | Redirects to `/dashboard`; user is authenticated |
| 3.7 | Logout, navigate to `/signup`, try to register with the same email "test@example.com" | General error: "이미 등록된 이메일입니다" (`data-testid="signup-error"`) |
| 3.8 | Verify "이미 계정이 있으신가요? 로그인" link | Clicking "로그인" link navigates to `/login` |

---

### 4. Login

| # | Step | Expected Result |
|---|------|-----------------|
| 4.1 | Navigate to `/login` | Login form is displayed with email (`data-testid="login-email"`), password (`data-testid="login-password"`), and submit button (`data-testid="login-submit"`) |
| 4.2 | Submit with empty fields | Validation errors appear for email and password |
| 4.3 | Submit with unregistered email | Error: "등록되지 않은 이메일입니다" (`data-testid="login-error"`) |
| 4.4 | Submit with correct email but wrong password | Error: "비밀번호가 일치하지 않습니다" (`data-testid="login-error"`) |
| 4.5 | Submit with correct credentials (email: "test@example.com", password: "password123") | Redirects to `/dashboard` |
| 4.6 | Verify inline validation on blur for email field (type invalid email, then blur) | Error message appears below the email field on blur |
| 4.7 | Verify "계정이 없으신가요? 회원가입" link | Clicking "회원가입" link navigates to `/signup` |

---

### 5. Navigation & Navbar (Authenticated)

| # | Step | Expected Result |
|---|------|-----------------|
| 5.1 | After login, verify navbar shows authenticated links | Navbar displays: "대시보드" (`data-testid="nav-dashboard"`), "할 일" (`data-testid="nav-todos"`), "프로필" (`data-testid="nav-profile"`), user email (`data-testid="nav-user-email"`), and "로그아웃" (`data-testid="nav-logout"`) |
| 5.2 | Verify active link highlighting | The nav link matching the current route has blue text styling |
| 5.3 | Click "TestApp" logo (`data-testid="nav-logo"`) | Navigates to home; since authenticated, redirects to `/dashboard` |
| 5.4 | Verify breadcrumbs on `/dashboard` | Breadcrumbs (`data-testid="breadcrumbs"`) show "홈 / 대시보드" |
| 5.5 | Navigate to `/todos` and verify breadcrumbs | Breadcrumbs show "홈 / 할 일" |
| 5.6 | Click "로그아웃" button | User is logged out, redirected to `/login` |

---

### 6. Responsive Navigation (Mobile)

| # | Step | Expected Result |
|---|------|-----------------|
| 6.1 | Resize viewport to mobile width (e.g., 375px) | Hamburger menu button (`data-testid="hamburger-menu"`) appears; desktop nav links are hidden |
| 6.2 | Click hamburger menu | Mobile menu (`data-testid="mobile-menu"`) appears with links: 대시보드, 할 일, 프로필, and 로그아웃 (`data-testid="mobile-logout"`) |
| 6.3 | Click a nav link in mobile menu | Menu closes, navigates to selected page |
| 6.4 | Open menu, click "로그아웃" | Menu closes, user is logged out |

---

### 7. Dashboard

| # | Step | Expected Result |
|---|------|-----------------|
| 7.1 | Navigate to `/dashboard` while authenticated | Shows greeting "안녕하세요, {name}님" (`data-testid="greeting"`), current date (`data-testid="current-date"`), and message "오늘도 좋은 하루 되세요!" |
| 7.2 | Verify stats cards with no todos | Three stats cards visible: 전체 할 일 = 0 (`data-testid="stat-total"`), 완료 = 0 (`data-testid="stat-completed"`), 진행중 = 0 (`data-testid="stat-pending"`) |
| 7.3 | Add a todo via "빠른 추가" form (TodoForm) | Todo is added; stats update: 전체 할 일 = 1, 진행중 = 1 |
| 7.4 | Verify notifications section loads | Loading skeleton (`data-testid="notifications-loading"`) appears briefly, then notifications list (`data-testid="notifications-list"`) with 3 items is displayed |
| 7.5 | Verify notification items have read/unread styling | Unread notification (id=1) has blue border; read notifications (id=2,3) have default styling |
| 7.6 | Click "전체 할 일 목록 보기" link (`data-testid="go-to-todos"`) | Navigates to `/todos` |
| 7.7 | Navigate to `/dashboard` while NOT authenticated | Redirects to `/login` |

---

### 8. Todo CRUD - Create

| # | Step | Expected Result |
|---|------|-----------------|
| 8.1 | Navigate to `/todos` | Page shows "할 일 목록" heading, todo input form, search/filter controls, and empty state (`data-testid="empty-state"`) with "아직 할 일이 없습니다" |
| 8.2 | Click "추가" (`data-testid="todo-add"`) with empty input | Error: "할 일을 입력해주세요" (`data-testid="todo-input-error"`) |
| 8.3 | Type text longer than 200 characters and submit | Error: "할 일은 200자 이하여야 합니다" |
| 8.4 | Type "장보기" in input (`data-testid="todo-input"`) and click "추가" | New todo item appears in the list; input is cleared; empty state disappears |
| 8.5 | Add a second todo "운동하기" | Two todo items visible in the list (newest first) |

---

### 9. Todo CRUD - Read & Toggle

| # | Step | Expected Result |
|---|------|-----------------|
| 9.1 | Verify todo item structure | Each todo shows: checkbox, text, "수정" button, "삭제" button |
| 9.2 | Click the checkbox on "장보기" todo | Todo text gets strikethrough styling (`line-through`); checkbox becomes checked |
| 9.3 | Click the checkbox again | Strikethrough is removed; checkbox is unchecked |

---

### 10. Todo CRUD - Update

| # | Step | Expected Result |
|---|------|-----------------|
| 10.1 | Click "수정" button on a todo | Edit mode: text input appears pre-filled with current text, with "저장" and "취소" buttons |
| 10.2 | Clear the edit input and click "저장" | Error message: "할 일을 입력해주세요" |
| 10.3 | Change text to "장보기 - 마트" and click "저장" | Todo text updates to "장보기 - 마트"; exits edit mode |
| 10.4 | Click "수정", then click "취소" | Edit mode exits; original text remains unchanged |

---

### 11. Todo CRUD - Delete

| # | Step | Expected Result |
|---|------|-----------------|
| 11.1 | Click "삭제" button on a todo | Delete confirmation appears: "삭제할까요?" with "예" and "아니오" buttons |
| 11.2 | Click "아니오" | Confirmation dismissed; todo remains |
| 11.3 | Click "삭제" again, then click "예" | Todo is removed from the list |

---

### 12. Todo Search & Filter

| # | Step | Expected Result |
|---|------|-----------------|
| 12.1 | With multiple todos, type a search term in search input (`data-testid="search-input"`) | Only matching todos are displayed |
| 12.2 | Search for a non-existent term | Empty state shows: "검색 결과가 없습니다" with "다른 검색어나 필터를 시도해보세요" |
| 12.3 | Clear search, mark one todo as completed | Todo is checked |
| 12.4 | Click "진행중" filter (`data-testid="filter-active"`) | Only uncompleted todos are shown |
| 12.5 | Click "완료" filter (`data-testid="filter-completed"`) | Only completed todos are shown |
| 12.6 | Click "전체" filter (`data-testid="filter-all"`) | All todos are shown |
| 12.7 | Combine search and filter | Both conditions apply simultaneously |

---

### 13. Todo Error Simulation

| # | Step | Expected Result |
|---|------|-----------------|
| 13.1 | Navigate to `/todos?simulate_error=true` | Error simulation mode is enabled; "에러 시뮬레이션 해제" button (`data-testid="disable-error-simulation"`) appears |
| 13.2 | Try to add a new todo | Error message: "서버 오류가 발생했습니다" |
| 13.3 | Try to edit an existing todo | Error message: "서버 오류가 발생했습니다" |
| 13.4 | Click "에러 시뮬레이션 해제" | Error simulation disabled; CRUD operations work normally again |

---

### 14. Profile - View

| # | Step | Expected Result |
|---|------|-----------------|
| 14.1 | Navigate to `/profile` | Profile view (`data-testid="profile-view"`) displays: 이름 (`data-testid="profile-display-name"`), 이메일, 자기소개 ("-" if empty), 기술 스택 ("-" if empty), 생년월일 ("-" if empty), 아바타 ("-" if empty) |
| 14.2 | Verify "프로필 수정" button (`data-testid="profile-edit-btn"`) is visible | Button is present |
| 14.3 | Navigate to `/profile` while NOT authenticated | Redirects to `/login` |

---

### 15. Profile - Edit

| # | Step | Expected Result |
|---|------|-----------------|
| 15.1 | Click "프로필 수정" button | Edit form (`data-testid="profile-form"`) appears with: name input (`data-testid="profile-name"`), bio textarea (`data-testid="profile-bio"`), date picker (`data-testid="profile-birthdate"`), multi-select for skills, file upload, "저장" (`data-testid="profile-save"`) and "취소" (`data-testid="profile-cancel"`) buttons |
| 15.2 | Clear the name field and click "저장" | Validation error: "이름을 입력해주세요" |
| 15.3 | Enter bio longer than 500 characters and click "저장" | Validation error: "자기소개는 500자 이하여야 합니다" |
| 15.4 | Verify bio character counter | Shows current length / 500 |
| 15.5 | Fill in name "새이름", bio "안녕하세요", select a birth date, and click "저장" | Profile saved; success message "프로필이 저장되었습니다" (`data-testid="profile-saved"`) appears; returns to view mode with updated values |
| 15.6 | Click "프로필 수정", make changes, then click "취소" | All changes are reverted; returns to view mode with original values |

---

### 16. Profile - Multi-Select (Skills)

| # | Step | Expected Result |
|---|------|-----------------|
| 16.1 | In profile edit mode, click the skills toggle button (`data-testid="profile-skills-toggle"`) | Dropdown (`data-testid="multiselect-dropdown"`) opens with options: JavaScript, TypeScript, React, Next.js, Python, Go, Rust, CSS |
| 16.2 | Check "React" and "TypeScript" | Selected chips appear (`data-testid="multiselect-chip-React"`, `data-testid="multiselect-chip-TypeScript"`); toggle button shows "2개 선택됨" |
| 16.3 | Click the "x" on the "React" chip | "React" is deselected; only "TypeScript" chip remains |
| 16.4 | Click outside the dropdown | Dropdown closes |
| 16.5 | Save profile and verify skills persist | After save, profile view shows "TypeScript" in skills section |

---

### 17. Profile - File Upload

| # | Step | Expected Result |
|---|------|-----------------|
| 17.1 | In profile edit mode, click "파일 선택" button (`data-testid="file-upload-button"`) | File input dialog opens |
| 17.2 | Upload a valid image file (e.g., PNG, < 5MB) | Button text changes to "선택됨: {filename}" |
| 17.3 | Upload an invalid file type (e.g., .txt) | Error: "허용되지 않는 파일 형식입니다" (`data-testid="file-upload-error"`) |
| 17.4 | Upload a file larger than 5MB | Error: "파일 크기는 5MB 이하여야 합니다" |

---

### 18. Profile - Date Picker

| # | Step | Expected Result |
|---|------|-----------------|
| 18.1 | In profile edit mode, interact with the birth date input (`data-testid="profile-birthdate"`) | Date can be selected via native date picker |
| 18.2 | Select a date and save profile | Birth date is displayed in the profile view |

---

### 19. Error Demo Page

| # | Step | Expected Result |
|---|------|-----------------|
| 19.1 | Navigate to `/error-demo` | Page shows "에러 상태 데모" heading with two buttons: "런타임 에러 발생" (`data-testid="trigger-error"`) and "API 에러 시뮬레이션" (`data-testid="simulate-api-error"`) |
| 19.2 | Click "런타임 에러 발생" | Error boundary (`data-testid="error-boundary"`) renders with message "의도적으로 발생시킨 에러입니다" and a "다시 시도" button (`data-testid="error-retry"`) |
| 19.3 | Click "다시 시도" | Error boundary resets; normal page content is restored |
| 19.4 | Click "API 에러 시뮬레이션" | Error message component (`data-testid="error-message"`) appears with "서버에서 데이터를 불러오는 중 오류가 발생했습니다 (500 Internal Server Error)" |
| 19.5 | Click "닫기" (`data-testid="error-dismiss"`) on the error message | Error message disappears |

---

### 20. Authentication Persistence & Session

| # | Step | Expected Result |
|---|------|-----------------|
| 20.1 | Login successfully, then reload the page | User remains authenticated (data persisted in `localStorage`) |
| 20.2 | Verify `localStorage` contains `auth_user` and `auth_login_at` keys after login | Keys exist with correct values |
| 20.3 | Logout and verify `localStorage` is cleaned | `auth_user` and `auth_login_at` keys are removed |

---

### 21. Route Guards (Protected Routes)

| # | Step | Expected Result |
|---|------|-----------------|
| 21.1 | Without authentication, navigate directly to `/dashboard` | Redirected to `/login` |
| 21.2 | Without authentication, navigate directly to `/todos` | Redirected to `/login` |
| 21.3 | Without authentication, navigate directly to `/profile` | Redirected to `/login` |
| 21.4 | While authenticated, navigate to `/` (home) | Redirected to `/dashboard` |

---

### 22. Notifications API

| # | Step | Expected Result |
|---|------|-----------------|
| 22.1 | On dashboard, verify API call to `/api/notifications` | Network request is made; response contains 3 notifications |
| 22.2 | Verify loading state | Skeleton loading animation (`data-testid="notifications-loading"`) appears before data loads |
| 22.3 | Verify each notification displays message and localized time | Each notification item has message text and a `<time>` element with Korean-formatted date |

---

### 23. Data Persistence (localStorage)

| # | Step | Expected Result |
|---|------|-----------------|
| 23.1 | Add several todos, reload the page | Todos persist across page reloads (stored in `localStorage` key `todos`) |
| 23.2 | Update profile, reload the page | Profile changes persist |
| 23.3 | Accept cookie banner, reload the page | Banner does not reappear |

---

## Test Data

| Field | Value |
|-------|-------|
| Name | 테스트유저 |
| Email | test@example.com |
| Password | password123 |
| Todo items | 장보기, 운동하기, 책 읽기 |

## Key `data-testid` Reference

- **Home**: `home-login`, `home-signup`
- **Navbar**: `navbar`, `nav-logo`, `nav-login`, `nav-signup`, `nav-dashboard`, `nav-todos`, `nav-profile`, `nav-user-email`, `nav-logout`, `hamburger-menu`, `mobile-menu`, `mobile-logout`, `breadcrumbs`
- **Login**: `login-email`, `login-password`, `login-submit`, `login-error`, `email-error`, `password-error`
- **Signup**: `signup-name`, `signup-email`, `signup-password`, `signup-confirm-password`, `signup-submit`, `signup-error`, `name-error`, `email-error`, `password-error`, `confirm-password-error`
- **Dashboard**: `greeting`, `current-date`, `stat-total`, `stat-completed`, `stat-pending`, `go-to-todos`, `notifications-loading`, `notifications-list`, `notifications-error`, `notification-{id}`, `notification-time-{id}`
- **Todos**: `todo-input`, `todo-add`, `todo-input-error`, `search-input`, `filter-all`, `filter-active`, `filter-completed`, `empty-state`, `todo-item-{id}`, `todo-checkbox-{id}`, `todo-text-{id}`, `todo-edit-{id}`, `todo-edit-input-{id}`, `todo-save-{id}`, `todo-cancel-{id}`, `todo-delete-{id}`, `todo-confirm-delete-{id}`, `todo-confirm-yes-{id}`, `todo-confirm-no-{id}`, `disable-error-simulation`, `error-message`, `error-dismiss`
- **Profile**: `profile-view`, `profile-display-name`, `profile-edit-btn`, `profile-form`, `profile-name`, `profile-bio`, `profile-birthdate`, `profile-skills-toggle`, `multiselect-dropdown`, `multiselect-option-{name}`, `multiselect-chip-{name}`, `file-upload-button`, `file-upload-input`, `file-upload-error`, `profile-save`, `profile-cancel`, `profile-saved`
- **Error Demo**: `trigger-error`, `simulate-api-error`, `error-boundary`, `error-retry`, `error-message`, `error-dismiss`
- **Cookie Banner**: `cookie-banner`, `cookie-accept`

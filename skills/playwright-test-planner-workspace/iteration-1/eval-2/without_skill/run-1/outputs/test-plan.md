# Test Plan: Admin Pages Requiring Authentication

## Application Context

- **Framework**: Next.js 16.1.6 (App Router)
- **Stack**: React 19, TypeScript, Tailwind CSS 4
- **Current State**: Fresh Next.js app with default home page only. No admin or auth pages exist yet.
- **Base URL**: http://localhost:3000 (default `next dev`)

This test plan assumes the following pages/features will be implemented for the admin area:

### Expected Routes (Hypothetical)
| Route | Description |
|---|---|
| `/login` | Login page with email/password form |
| `/admin` | Admin dashboard (protected) |
| `/admin/users` | User management page (protected) |
| `/admin/settings` | Admin settings page (protected) |

---

## Test Suite 1: Login Page (`/login`)

### TC-1.1: Login page renders correctly
- **Steps**:
  1. Navigate to `/login`
  2. Verify the login form is visible
- **Expected**: Page displays email input, password input, and a submit/login button
- **Priority**: High

### TC-1.2: Successful login with valid credentials
- **Steps**:
  1. Navigate to `/login`
  2. Fill email field with valid admin email (e.g., `admin@example.com`)
  3. Fill password field with valid password
  4. Click the login/submit button
- **Expected**: User is redirected to `/admin` dashboard. Session cookie or token is set.
- **Priority**: High

### TC-1.3: Login fails with invalid credentials
- **Steps**:
  1. Navigate to `/login`
  2. Fill email with `wrong@example.com`
  3. Fill password with `wrongpassword`
  4. Click the login/submit button
- **Expected**: An error message is displayed (e.g., "Invalid email or password"). User remains on `/login`.
- **Priority**: High

### TC-1.4: Login fails with empty fields
- **Steps**:
  1. Navigate to `/login`
  2. Leave email and password fields empty
  3. Click the login/submit button
- **Expected**: Validation errors are shown for required fields. Form is not submitted.
- **Priority**: Medium

### TC-1.5: Login fails with invalid email format
- **Steps**:
  1. Navigate to `/login`
  2. Enter `notanemail` in the email field
  3. Enter a password
  4. Click submit
- **Expected**: Validation error for email format is displayed.
- **Priority**: Medium

### TC-1.6: Password field masks input
- **Steps**:
  1. Navigate to `/login`
  2. Type into the password field
- **Expected**: Password input type is `password`, characters are masked.
- **Priority**: Low

---

## Test Suite 2: Authentication Guard (Route Protection)

### TC-2.1: Unauthenticated user is redirected from `/admin`
- **Steps**:
  1. Clear all cookies/session storage
  2. Navigate directly to `/admin`
- **Expected**: User is redirected to `/login` (or `/login?callbackUrl=/admin`)
- **Priority**: High

### TC-2.2: Unauthenticated user is redirected from `/admin/users`
- **Steps**:
  1. Clear all cookies/session storage
  2. Navigate directly to `/admin/users`
- **Expected**: User is redirected to `/login`
- **Priority**: High

### TC-2.3: Unauthenticated user is redirected from `/admin/settings`
- **Steps**:
  1. Clear all cookies/session storage
  2. Navigate directly to `/admin/settings`
- **Expected**: User is redirected to `/login`
- **Priority**: High

### TC-2.4: Authenticated user can access `/admin`
- **Steps**:
  1. Log in with valid admin credentials
  2. Navigate to `/admin`
- **Expected**: Admin dashboard is displayed without redirect. Page contains admin-specific content (e.g., dashboard title, navigation menu).
- **Priority**: High

### TC-2.5: Authenticated user can access `/admin/users`
- **Steps**:
  1. Log in with valid admin credentials
  2. Navigate to `/admin/users`
- **Expected**: User management page is displayed.
- **Priority**: High

### TC-2.6: Authenticated user can access `/admin/settings`
- **Steps**:
  1. Log in with valid admin credentials
  2. Navigate to `/admin/settings`
- **Expected**: Admin settings page is displayed.
- **Priority**: High

### TC-2.7: Callback URL redirect after login
- **Steps**:
  1. Clear all cookies
  2. Navigate to `/admin/settings` (get redirected to login)
  3. Log in with valid credentials
- **Expected**: After successful login, user is redirected back to `/admin/settings` (the originally requested page).
- **Priority**: Medium

---

## Test Suite 3: Session Management

### TC-3.1: Logout clears session
- **Steps**:
  1. Log in as admin
  2. Click the logout button/link
- **Expected**: User is redirected to `/login` or `/`. Session cookie is cleared. Navigating to `/admin` redirects to login.
- **Priority**: High

### TC-3.2: Session persists across page reloads
- **Steps**:
  1. Log in as admin
  2. Navigate to `/admin`
  3. Reload the page (F5)
- **Expected**: User remains on `/admin`, still authenticated.
- **Priority**: High

### TC-3.3: Session expires after timeout (if applicable)
- **Steps**:
  1. Log in as admin
  2. Wait for session timeout period
  3. Try to navigate to `/admin`
- **Expected**: User is redirected to `/login` with an appropriate message (e.g., "Session expired").
- **Priority**: Medium

### TC-3.4: Multiple tabs share session
- **Steps**:
  1. Log in as admin in Tab 1
  2. Open `/admin` in Tab 2
- **Expected**: Tab 2 also shows the admin dashboard (session is shared).
- **Priority**: Low

### TC-3.5: Logout in one tab affects other tabs
- **Steps**:
  1. Log in as admin, open `/admin` in two tabs
  2. Log out in Tab 1
  3. Try to interact with the admin page in Tab 2
- **Expected**: Tab 2 should redirect to login or show an unauthorized message on the next navigation/action.
- **Priority**: Low

---

## Test Suite 4: Role-Based Access (if applicable)

### TC-4.1: Non-admin authenticated user cannot access `/admin`
- **Steps**:
  1. Log in with a regular (non-admin) user account
  2. Navigate to `/admin`
- **Expected**: User sees a 403 Forbidden page or is redirected away from admin.
- **Priority**: High

### TC-4.2: Admin user sees admin navigation
- **Steps**:
  1. Log in as admin
  2. Check the navigation/sidebar
- **Expected**: Admin-specific menu items are visible (e.g., Users, Settings, Dashboard).
- **Priority**: Medium

---

## Test Suite 5: Admin Dashboard Content

### TC-5.1: Dashboard displays key metrics
- **Steps**:
  1. Log in as admin
  2. Navigate to `/admin`
- **Expected**: Dashboard shows summary cards or widgets (e.g., total users, recent activity).
- **Priority**: Medium

### TC-5.2: Admin navigation works correctly
- **Steps**:
  1. Log in as admin
  2. Click on "Users" in the admin navigation
  3. Click on "Settings" in the admin navigation
- **Expected**: Each click navigates to the correct admin sub-page.
- **Priority**: Medium

---

## Test Suite 6: Security

### TC-6.1: Direct API calls without auth token are rejected
- **Steps**:
  1. Make a fetch/API request to an admin-only API endpoint without authentication headers
- **Expected**: Server responds with 401 Unauthorized.
- **Priority**: High

### TC-6.2: Expired/invalid token is rejected
- **Steps**:
  1. Set an invalid or expired authentication token in cookies
  2. Navigate to `/admin`
- **Expected**: User is redirected to `/login`.
- **Priority**: High

### TC-6.3: XSS in login form is prevented
- **Steps**:
  1. Navigate to `/login`
  2. Enter `<script>alert('xss')</script>` in the email field
  3. Submit the form
- **Expected**: Script is not executed. Input is sanitized or escaped.
- **Priority**: Medium

### TC-6.4: SQL Injection in login form is prevented
- **Steps**:
  1. Navigate to `/login`
  2. Enter `' OR 1=1 --` in the email field
  3. Submit the form
- **Expected**: Login fails normally. No server error or data leak.
- **Priority**: Medium

---

## Playwright Test Implementation Notes

### Authentication Setup (storageState pattern)
For Playwright tests, use the `storageState` approach to avoid logging in before every test:

1. Create a `global-setup.ts` that logs in and saves the authentication state.
2. Use `storageState` in `playwright.config.ts` to reuse the authenticated session.
3. For unauthenticated tests, use a separate project without `storageState`.

### Suggested Playwright Config Structure
```
tests/
  auth/
    login.spec.ts          # TC-1.x tests
    auth-guard.spec.ts     # TC-2.x tests
    session.spec.ts        # TC-3.x tests
  admin/
    dashboard.spec.ts      # TC-5.x tests
    role-access.spec.ts    # TC-4.x tests
  security/
    security.spec.ts       # TC-6.x tests
  global-setup.ts          # Authentication setup
  auth.json                # Saved auth state (gitignored)
```

### Test Data
- Admin credentials: Use environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- Regular user credentials: Use environment variables (`USER_EMAIL`, `USER_PASSWORD`)
- Consider using a test database or mock API for consistent state

---

## Summary

| Suite | Test Count | High Priority | Medium Priority | Low Priority |
|---|---|---|---|---|
| Login Page | 6 | 3 | 2 | 1 |
| Auth Guard | 7 | 5 | 1 | 1 |
| Session Management | 5 | 2 | 1 | 2 |
| Role-Based Access | 2 | 1 | 1 | 0 |
| Admin Dashboard | 2 | 0 | 2 | 0 |
| Security | 4 | 2 | 2 | 0 |
| **Total** | **26** | **13** | **9** | **4** |

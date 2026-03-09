import { test, expect } from '@playwright/test';

test.describe('Signup Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test.describe('Form rendering', () => {
    test('should display all signup form fields', async ({ page }) => {
      await expect(page.getByLabel('Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByLabel('Confirm Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign up|register/i })).toBeVisible();
    });

    test('should have empty fields by default', async ({ page }) => {
      await expect(page.getByLabel('Name')).toHaveValue('');
      await expect(page.getByLabel('Email')).toHaveValue('');
      await expect(page.getByLabel('Password')).toHaveValue('');
      await expect(page.getByLabel('Confirm Password')).toHaveValue('');
    });
  });

  test.describe('Validation failure cases', () => {
    test('should show error when submitting empty form', async ({ page }) => {
      await page.getByRole('button', { name: /sign up|register/i }).click();

      await expect(page.getByText(/name is required/i)).toBeVisible();
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.getByLabel('Name').fill('John Doe');
      await page.getByLabel('Email').fill('invalid-email');
      await page.getByLabel('Password').fill('Password123!');
      await page.getByLabel('Confirm Password').fill('Password123!');

      await page.getByRole('button', { name: /sign up|register/i }).click();

      await expect(page.getByText(/valid email/i)).toBeVisible();
    });

    test('should show error for email without domain', async ({ page }) => {
      await page.getByLabel('Email').fill('user@');
      await page.getByLabel('Email').blur();

      await expect(page.getByText(/valid email/i)).toBeVisible();
    });

    test('should show error for password that is too short', async ({ page }) => {
      await page.getByLabel('Name').fill('John Doe');
      await page.getByLabel('Email').fill('john@example.com');
      await page.getByLabel('Password').fill('123');
      await page.getByLabel('Confirm Password').fill('123');

      await page.getByRole('button', { name: /sign up|register/i }).click();

      await expect(page.getByText(/password.*at least|minimum.*characters/i)).toBeVisible();
    });

    test('should show error when passwords do not match', async ({ page }) => {
      await page.getByLabel('Name').fill('John Doe');
      await page.getByLabel('Email').fill('john@example.com');
      await page.getByLabel('Password').fill('Password123!');
      await page.getByLabel('Confirm Password').fill('DifferentPassword!');

      await page.getByRole('button', { name: /sign up|register/i }).click();

      await expect(page.getByText(/passwords.*match|do not match/i)).toBeVisible();
    });

    test('should show error for name with only spaces', async ({ page }) => {
      await page.getByLabel('Name').fill('   ');
      await page.getByLabel('Email').fill('john@example.com');
      await page.getByLabel('Password').fill('Password123!');
      await page.getByLabel('Confirm Password').fill('Password123!');

      await page.getByRole('button', { name: /sign up|register/i }).click();

      await expect(page.getByText(/name is required|valid name/i)).toBeVisible();
    });

    test('should show error for duplicate email', async ({ page }) => {
      await page.getByLabel('Name').fill('John Doe');
      await page.getByLabel('Email').fill('existing@example.com');
      await page.getByLabel('Password').fill('Password123!');
      await page.getByLabel('Confirm Password').fill('Password123!');

      await page.getByRole('button', { name: /sign up|register/i }).click();

      await expect(page.getByText(/already.*registered|email.*exists|already.*use/i)).toBeVisible();
    });
  });

  test.describe('Successful signup', () => {
    test('should submit form with valid data', async ({ page }) => {
      await page.getByLabel('Name').fill('Jane Doe');
      await page.getByLabel('Email').fill('jane@example.com');
      await page.getByLabel('Password').fill('SecurePass123!');
      await page.getByLabel('Confirm Password').fill('SecurePass123!');

      await page.getByRole('button', { name: /sign up|register/i }).click();

      await expect(page.getByText(/success|welcome|account created/i)).toBeVisible();
    });

    test('should redirect to login or dashboard after successful signup', async ({ page }) => {
      await page.getByLabel('Name').fill('Jane Doe');
      await page.getByLabel('Email').fill('jane2@example.com');
      await page.getByLabel('Password').fill('SecurePass123!');
      await page.getByLabel('Confirm Password').fill('SecurePass123!');

      await page.getByRole('button', { name: /sign up|register/i }).click();

      await expect(page).toHaveURL(/\/(login|dashboard|welcome)/);
    });
  });

  test.describe('Form interaction behavior', () => {
    test('should mask password input', async ({ page }) => {
      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should mask confirm password input', async ({ page }) => {
      const confirmPasswordInput = page.getByLabel('Confirm Password');
      await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    test('should clear errors after correcting invalid field', async ({ page }) => {
      await page.getByLabel('Email').fill('invalid');
      await page.getByLabel('Email').blur();

      // Error should appear
      await expect(page.getByText(/valid email/i)).toBeVisible();

      // Fix the email
      await page.getByLabel('Email').fill('valid@example.com');
      await page.getByLabel('Email').blur();

      // Error should disappear
      await expect(page.getByText(/valid email/i)).not.toBeVisible();
    });
  });
});

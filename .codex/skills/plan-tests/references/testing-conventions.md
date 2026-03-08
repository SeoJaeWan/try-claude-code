# Testing Conventions Reference

Inline reference for plan-tests skill. Sourced from `testing.md` and `conventions.mjs`.

---

## Test Spec Rules

- **describe**: Subject under test (hook name, function name, service name)
- **it**: Korean behavioral spec + constraint ID when applicable (`[C-...]`)
- **AAA pattern**: Every test must include `// Arrange`, `// Act`, `// Assert` comments

```typescript
describe('useLogin', () => {
  it('[C-AUTH-001] 로그인 성공 시 토큰을 저장한다', async () => {
    // Arrange
    const mockCredentials = { email: 'test@example.com', password: '1234' };

    // Act
    const { result } = renderHook(() => useLogin());
    await act(() => result.current.login(mockCredentials));

    // Assert
    expect(localStorage.getItem('token')).toBeTruthy();
  });
});
```

---

## Test Types by Target

| Target | Test Method | Framework |
|--------|-----------|-----------|
| Custom hook | `renderHook` + `act` | Vitest + happy-dom |
| Component | `render` | Vitest + happy-dom |
| Utility function | Direct call | Vitest |
| API hook | `renderHook` + MSW | Vitest + happy-dom |
| NestJS service | Direct call | Jest + NestJS Testing |
| NestJS controller | Supertest | Jest + NestJS Testing |

---

## Frontend Runtime

- **Standard**: Vitest + happy-dom
- Use `jsdom` only when unavoidable due to environment-specific APIs

## Backend Runtime

- **Standard**: Jest + NestJS Testing utilities
- Supertest for HTTP endpoint integration tests

---

## Mocking

- **API mocking**: MSW (Mock Service Worker)
- **Function mocking**: `vi.fn()` (Vitest) or `jest.fn()` (Jest)
- Do not mock implementation internals; mock external boundaries only

---

## File Location Convention

```
{folder}/__tests__/index.test.ts
```

- Hook: `src/hooks/{hookName}/__tests__/index.test.ts`
- Service: `src/services/{serviceName}/__tests__/index.test.ts`
- Utility: `src/utils/{utilName}/__tests__/index.test.ts`
- Component: `src/components/{componentName}/__tests__/index.test.tsx`

---

## Independence

- Each test must be runnable in isolation
- Sharing state between tests is prohibited
- Use `beforeEach` for setup, not shared mutable variables

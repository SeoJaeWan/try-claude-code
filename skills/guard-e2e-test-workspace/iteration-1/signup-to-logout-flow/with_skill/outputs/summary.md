# signup-to-logout-flow with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 파일 미생성
- 계획 기반 평가

## 에이전트 실행 흐름
1. SKILL.md 읽기 → guard-e2e-test 스킬 규칙 파악
2. e2e-conventions.md 읽기 → [Guard] 프리픽스, journey_id, guard/ 디렉토리 규칙 확인
3. agent-browser로 localhost:3000 탐색 → 회원가입 폼, 대시보드, 로그아웃 버튼 위치 파악
4. guard/ 디렉토리에 .spec.ts 파일 생성 계획 수립

## 계획된 파일 구조
```
e2e/guard/signup-to-logout.guard.spec.ts
```

## 계획된 테스트 구조
```typescript
import { test, expect } from '@playwright/test';

const JOURNEY_ID = 'signup-to-logout';

test.describe('[Guard] 회원가입 → 대시보드 → 로그아웃', () => {
  test(`[${JOURNEY_ID}] 전체 플로우 해피 패스`, async ({ page }) => {
    // Step 1: 회원가입
    await page.goto('http://localhost:3000/signup');
    await page.getByTestId('signup-email').fill('test@example.com');
    await page.getByTestId('signup-password').fill('password123');
    await page.getByTestId('signup-submit').click();

    // Step 2: 대시보드 진입 확인
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('dashboard-greeting')).toBeVisible();

    // Step 3: 로그아웃
    await page.getByTestId('logout-btn').click();
    await expect(page).toHaveURL(/\/login|\/$/);
  });
});
```

## 주요 특징
- e2e-conventions.md 규칙 준수: [Guard] 프리픽스, journey_id, guard/ 디렉토리
- agent-browser 탐색으로 실제 DOM 구조 기반 data-testid 로케이터 도출
- 전체 플로우를 단일 테스트로 구성하여 상태 전이 검증
- 로그아웃 후 리다이렉트 검증 포함

# profile-update-flow with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 파일 미생성
- 계획 기반 평가

## 에이전트 실행 흐름
1. SKILL.md 읽기 → guard-e2e-test 스킬 규칙 파악
2. e2e-conventions.md 읽기 → [Guard] 프리픽스, journey_id, guard/ 디렉토리 규칙 확인
3. agent-browser로 localhost:3000/profile 탐색 → 이름 입력 필드, 스킬 멀티셀렉트, 저장 버튼 구조 확인
4. agent-browser로 localhost:3000/dashboard 탐색 → 인사말 위젯에 사용자 이름 표시 확인
5. guard/ 디렉토리에 .spec.ts 파일 생성 계획 수립

## 계획된 파일 구조
```
e2e/guard/profile-update.guard.spec.ts
```

## 계획된 테스트 구조
```typescript
import { test, expect } from '@playwright/test';

const JOURNEY_ID = 'profile-update';

test.describe('[Guard] 프로필 수정 → 저장 → 대시보드 반영 → 재진입 유지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.getByTestId('login-email').fill('user@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test(`[${JOURNEY_ID}] 프로필 수정 후 대시보드 반영 및 재진입 유지`, async ({ page }) => {
    const newName = 'Guard 테스트 사용자';

    // Step 1: 프로필 페이지 이동
    await page.goto('http://localhost:3000/profile');

    // Step 2: 이름 수정 및 스킬 선택
    await page.getByTestId('profile-name').clear();
    await page.getByTestId('profile-name').fill(newName);
    await page.getByTestId('skill-select').selectOption(['TypeScript', 'Playwright']);

    // Step 3: 저장
    await page.getByTestId('save-btn').click();
    await expect(page.getByTestId('save-success')).toBeVisible();

    // Step 4: 대시보드 인사말 반영 확인
    await page.goto('http://localhost:3000/dashboard');
    await expect(page.getByTestId('dashboard-greeting')).toContainText(newName);

    // Step 5: 프로필 재진입 시 데이터 유지 확인
    await page.goto('http://localhost:3000/profile');
    await expect(page.getByTestId('profile-name')).toHaveValue(newName);
    await expect(page.getByTestId('skill-select')).toHaveValues(['TypeScript', 'Playwright']);
  });
});
```

## 주요 특징
- e2e-conventions.md 규칙 완전 준수: [Guard] 프리픽스, journey_id, guard/ 디렉토리
- agent-browser 탐색으로 프로필 폼 필드 구조 및 data-testid 도출
- 크로스 라우트 데이터 일관성 검증 (프로필 → 대시보드 → 프로필)
- 저장 성공 피드백 UI 검증 포함
- 재진입 시 폼 필드 값 유지 검증으로 상태 영속성 커버

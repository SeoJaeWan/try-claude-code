# dashboard-to-todos-flow with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 파일 미생성
- 계획 기반 평가

## 에이전트 실행 흐름
1. SKILL.md 읽기 → guard-e2e-test 스킬 규칙 파악
2. e2e-conventions.md 읽기 → [Guard] 프리픽스, journey_id, guard/ 디렉토리 규칙 확인
3. agent-browser로 localhost:3000/dashboard 탐색 → 할 일 추가 폼, 통계 위젯 구조 확인
4. agent-browser로 localhost:3000/todos 탐색 → 할 일 목록, 완료 체크박스, 필터 UI 확인
5. guard/ 디렉토리에 .spec.ts 파일 생성 계획 수립

## 계획된 파일 구조
```
e2e/guard/dashboard-to-todos.guard.spec.ts
```

## 계획된 테스트 구조
```typescript
import { test, expect } from '@playwright/test';

const JOURNEY_ID = 'dashboard-to-todos';

test.describe('[Guard] 대시보드 → 할 일 추가 → 완료 → 통계 반영', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 처리
    await page.goto('http://localhost:3000/login');
    await page.getByTestId('login-email').fill('user@example.com');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test(`[${JOURNEY_ID}] 할 일 추가 → 완료 → 통계 반영`, async ({ page }) => {
    // Step 1: 대시보드에서 통계 초기값 기록
    const initialCount = await page.getByTestId('stats-completed').textContent();

    // Step 2: 할 일 추가
    await page.getByTestId('todo-input').fill('Guard 테스트 할 일');
    await page.getByTestId('todo-add-btn').click();
    await expect(page.getByTestId('todo-item').last()).toContainText('Guard 테스트 할 일');

    // Step 3: /todos에서 완료 처리
    await page.goto('http://localhost:3000/todos');
    await page.getByTestId('todo-checkbox').last().check();
    await expect(page.getByTestId('todo-item').last()).toHaveClass(/completed/);

    // Step 4: 대시보드 통계 반영 확인
    await page.goto('http://localhost:3000/dashboard');
    await expect(page.getByTestId('stats-completed')).not.toHaveText(initialCount!);
  });
});
```

## 주요 특징
- e2e-conventions.md 규칙 준수: [Guard] 프리픽스, journey_id, guard/ 디렉토리
- agent-browser 탐색으로 대시보드 통계 위젯, 할 일 폼 구조 파악
- 크로스 라우트 상태 전이 검증 (대시보드 → /todos → 대시보드)
- data-testid 기반 로케이터로 안정적 셀렉터 사용
- beforeEach에서 로그인 처리로 테스트 독립성 확보

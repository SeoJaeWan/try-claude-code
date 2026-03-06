# Comment Rules

> This document covers only "judgment-required rules" that ESLint/Prettier cannot enforce.
> Mechanical rules are applied by `init-coding-rules` through conversational diff + approval based on this coding-rules folder.

## JSDoc

JSDoc is required for public APIs (exported functions, components, and hooks).

```typescript
/**
 * 날짜를 포맷팅하여 반환
 * @param date - 포맷팅할 Date 객체
 * @param format - 출력 형식 (기본값: 'YYYY-MM-DD')
 * @returns 포맷팅된 날짜 문자열
 */
const formatDate = (date: Date, format = "YYYY-MM-DD"): string => { ... };
```

## Comment Principle: Explain Why, Not What

```typescript
// Avoid: 자명한 코드에 주석
// 사용자 이름을 가져온다
const userName = user.name;

// Good: 외부 제약사항/의사결정 이유 설명
// GitHub API rate limit: 시간당 60회, 초과 시 429 반환
const fetchGitHubUser = async (username: string) => { ... };
```

## TODO/FIXME Format

```
// TODO(담당자): 설명 (#이슈번호)
// FIXME(담당자): 설명 (#이슈번호)
```






"""Write summary.md files from agent notification results."""
import os, json

BASE = r"C:\Users\sjw73\OneDrive\Desktop\dev\try-claude-code\skills-workspace\iteration-1"

# All summaries extracted from task notification results
S = {}

# === T1: init-try ===
S[("eval-1-init-try-kr","with_skill")] = """# init-try 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/init-try/SKILL.md

## 실행 단계
1. `node skills/init-try/scripts/run.mjs --repo-root <repo-root>` 실행
2. 런타임 디렉토리 생성, 레퍼런스 파일 시딩, SHA256 해시 생성, project.json 작성

## 생성될 파일/디렉토리
- `.claude/try-claude/` 하위 디렉토리:
  - `references/` (coding-rules 9개 문서 + design 5개 문서 = 24개 레퍼런스)
  - `plans/`, `reports/`, `logs/`, `codemaps/`, `humanmaps/`, `jira-review/`
- `scripts/generate.mjs` (코드 생성기)
- `project.json` (managedReferences 배열 포함)

## project.json 구조
- schemaVersion, pluginId, pluginVersion, lastSyncedAt
- managedReferences[]: path, hash(SHA256), mergeMode(markdown-sections/whole-file), sectionHashes

## SHA256 해시 추적
- \\r\\n 정규화 후 해시 계산
- markdown 파일: section-level tracking (## 헤딩 기준)
- 기타 파일: whole-file tracking
"""

S[("eval-1-init-try-kr","without_skill")] = """# init-try 평가 (Korean prompt, without_skill)

## 접근 방식 (일반 지식만 사용)
1. "try-claude"가 무엇인지 사용자에게 질문
2. 기존 프로젝트 구조 확인
3. `.claude/try-claude/` 기본 디렉토리 생성 시도

## 누락되는 항목 (스킬 없이)
- coding-rules 레퍼런스 9개 문서
- design 레퍼런스 5개 문서
- scripts/generate.mjs
- 7개 하위 디렉토리 (plans, reports, logs, codemaps, humanmaps, jira-review, references)
- project.json 및 올바른 스키마

## 결론
스킬 정의 없이는 불완전하고 부정확한 초기화가 됨. 도메인 특화 지식이 필수.
"""

S[("eval-2-init-try-en","with_skill")] = """# init-try Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/init-try/SKILL.md

## Steps
1. Run `node skills/init-try/scripts/run.mjs --repo-root <repo-root>`
2. Creates runtime directories, seeds 24 reference files, builds managed reference entries with SHA256 hashes, writes project.json

## Directories Created
`.claude/try-claude/` with subdirs: references/, plans/, reports/, logs/, codemaps/, humanmaps/, jira-review/

## Files Created
24 reference files + `.claude/try-claude/project.json`

## project.json Structure
- schemaVersion ("1.0.0"), pluginId ("try-claude"), pluginVersion ("0.1.0"), lastSyncedAt
- managedReferences[]: path, hash (SHA256 hex), mergeMode ("markdown-sections"/"whole-file"), sectionHashes (per-heading SHA256 map with __preamble__ key), lastSyncedAt

## SHA256 Tracking
Content is \\r\\n-normalized before hashing. Markdown files with unique ## headings use section-level tracking; others use whole-file tracking.
"""

S[("eval-2-init-try-en","without_skill")] = """# init-try Evaluation (English prompt, without_skill)

## Approach (general knowledge only)
Cannot complete. "try-claude runtime" is not a widely known tool/framework.

## Missing
- Expected outputs (run.mjs, project.json with managedReferences, SHA256 hash tracking) are project-specific conventions
- General knowledge provides no way to infer correct schema, hashing workflow, or script generation logic
"""

# === T1: frontend-dev ===
S[("eval-3-frontend-dev-kr","with_skill")] = """# frontend-dev 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/frontend-dev/SKILL.md

## 네이밍 규칙
- use{Verb}{Resource} 패턴: useAuth 또는 useGetAuth
- coding-rules/code-style.md 참조

## TDD RED->GREEN 워크플로우
1. 테스트 먼저 복사 (RED 단계)
2. 테스트 실패 확인
3. 구현
4. 테스트 통과 확인 (GREEN)
5. typecheck/lint/build 게이트

## generate.mjs 사용
- `node generate.mjs api-hook useAuth --method mutation` 실행
- coding-rules 기반 구현

## 참조 문서
- .claude/try-claude/references/coding-rules/
- .claude/try-claude/references/design/
"""

S[("eval-3-frontend-dev-kr","without_skill")] = """# frontend-dev 평가 (Korean prompt, without_skill)

## 접근 방식
- 일반적인 React 패턴으로 useAuth 훅 생성
- useState로 user/loading/error 관리, login()/logout() 함수, fetch 기반 API 호출

## 누락 항목 (스킬 없이)
- use{Verb}{Resource} 네이밍 규칙 미적용
- TDD 사이클 없음
- generate.mjs 사용 없음
- 디자인 시스템 참조 없음
- props destructuring 컨벤션 없음
- coding rules 참조 없음
"""

S[("eval-4-frontend-dev-en","with_skill")] = """# frontend-dev Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/frontend-dev/SKILL.md

## Naming Convention
- useGetUserProfile following use{Verb}{Resource} pattern
- Path: {hooksRoot}/apis/queries/useGetUserProfile.ts per folder-structure rules

## TDD RED->GREEN Workflow
1. Copy tests first, RED verify (tests fail)
2. Implement hook
3. GREEN verify (tests pass)
4. Typecheck/lint/build gates

## generate.mjs Usage
- `generate.mjs api-hook useGetUserProfile --method query`

## References
- coding-rules/code-style.md
- design/ docs
- Full 14-step execution order from skill's Implementation Steps
"""

S[("eval-4-frontend-dev-en","without_skill")] = """# frontend-dev Evaluation (English prompt, without_skill)

## Approach
Generic React + TanStack Query hook creation.
Would name it useUserProfile (not following use{Verb}{Resource}).
No TDD workflow, no coding-rules, no generate.mjs.
"""

# === T1: backend-dev ===
S[("eval-5-backend-dev-kr","with_skill")] = """# backend-dev 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/backend-dev/SKILL.md

## NestJS 모듈 구조 (generate.mjs 활용)
- `node references/coding-rules/scripts/generate.mjs structure auth --type module --framework nestjs --create`
- src/auth/auth.controller.ts, auth.service.ts, auth.module.ts, dto/

## coding-rules/folder-structure.md 준수
- NestJS 컨벤션: src/{path}/{path}.module.ts, controller.ts, service.ts, dto/
- 폴더 네이밍: camelCase

## DB snake_case 네이밍
- 테이블: users, refresh_tokens (snake_case 복수)
- 컬럼: password_hash, user_id, created_at, expires_at
- 인덱스: idx_users_email
- FK: user_id REFERENCES users(id)

## generate.mjs 사용
- structure 서브커맨드 + --framework nestjs --type module
- package.json에서 @nestjs/core 감지
"""

S[("eval-5-backend-dev-kr","without_skill")] = """# backend-dev 평가 (Korean prompt, without_skill)

## 접근 방식
- 일반적인 NestJS 구조로 auth 모듈 생성
- auth.module.ts, auth.controller.ts, auth.service.ts, DTOs, guards, strategies
- POST /auth/register, POST /auth/login, GET /auth/profile
- JWT + Passport 전략
- DB snake_case 네이밍 (password_hash, created_at, updated_at)

## 한계
- 저장소에 NestJS 프로젝트가 없어서 실제 수정 불가
- generate.mjs, coding-rules 참조 없음
"""

S[("eval-6-backend-dev-en","with_skill")] = """# backend-dev Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/backend-dev/SKILL.md

## Framework Auto-detection
- Checks package.json for @nestjs/core, @nestjs/common
- Falls back to Express/Fastify/etc.

## Test Command Selection
- NestJS: pnpm test
- Python: pytest
- Go: go test

## File Generation
- controller + service + module via generate.mjs
- TDD RED->GREEN workflow

## TDD Workflow
- Copy tests first, RED verify, implement, GREEN verify
"""

S[("eval-6-backend-dev-en","without_skill")] = """# backend-dev Evaluation (English prompt, without_skill)

## Findings
- No application codebase exists (no package.json, requirements.txt, go.mod)
- Cannot detect framework or generate files
- Would create generic CRUD structure without project conventions
"""

# === T1: ui-publish ===
S[("eval-7-ui-publish-kr","with_skill")] = """# ui-publish 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/ui-publish/SKILL.md

## Pretendard 폰트
- Pretendard Variable 사용, Tailwind fontFamily.sans 설정

## theme-tokens.md 참조
- 색상/간격 토큰 먼저 읽기
- bg-sidebar, border-border 등 토큰 기반 클래스

## Tailwind CSS
- 유틸리티 클래스로만 스타일링, 인라인 스타일 금지

## no-logic 규칙 적용
- useState, useEffect, fetch 사용 금지
- 순수 프레젠테이셔널 컴포넌트

## layout-only props
- ReactNode 슬롯 (children, sidebar, header)
- className만 허용, 데이터/콜백 props 없음
"""

S[("eval-7-ui-publish-kr","without_skill")] = """# ui-publish 평가 (Korean prompt, without_skill)

## 누락 항목 (스킬 없이)
- Pretendard 폰트 미적용
- theme-tokens.md 참조 없음
- Tailwind CSS 미사용 (일반 CSS 사용)
- no-logic 제약 없음 (useState/useEffect 사용 가능성)
- generate.mjs 컴포넌트 스캐폴딩 없음
- layout-only props 컨벤션 없음
"""

S[("eval-8-ui-publish-en","with_skill")] = """# ui-publish Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/ui-publish/SKILL.md

## design/theme-tokens.md and tailwind.config.js
- Reads theme tokens first for actual color/spacing values
- References tailwind.config.js for token mapping

## Mobile-first Breakpoints
- sm: md: lg: responsive pattern

## shadcn/ui + CODEMAPS
- Component reuse check via CODEMAPS before creating new components
- shadcn/ui component integration

## Pretendard Font-family
- Pretendard Variable as default sans-serif
"""

S[("eval-8-ui-publish-en","without_skill")] = """# ui-publish Evaluation (English prompt, without_skill)

## Missing without skill
- Design token references
- Tailwind config integration
- Mobile-first breakpoint conventions
- shadcn/ui component reuse checks via CODEMAPS
- Pretendard font-family requirement
"""

# === T2: doc-update ===
S[("eval-9-doc-update-kr","with_skill")] = """# doc-update 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/doc-update/SKILL.md

## 스크립트 파이프라인
1. detect_changes.mjs 실행 -> changes.json 생성
2. extract_structure.mjs 실행 -> extracted_structure.json
3. CODEMAPS/INDEX.md + 영역별 .md 생성
4. HUMANMAPS .html 파일 생성

## 파이프라인 실행 순서
detect -> extract -> generate (순차 실행)

## CODEMAPS 구조
- .claude/try-claude/codemaps/INDEX.md
- backend.md, frontend.md, database.md, architecture.md

## HUMANMAPS HTML
- .claude/try-claude/humanmaps/에 대응 .html 파일
- 사이드바 네비, Mermaid.js 다이어그램, highlight.js
"""

S[("eval-9-doc-update-kr","without_skill")] = """# doc-update 평가 (Korean prompt, without_skill)

## 접근 방식
- 프로젝트에 서비스 코드 디렉토리 없음 (app/, src/, pages/)
- detect_changes.mjs 실행 시 빈 결과 (no_service_dirs_found)
- 스크립트 파이프라인 미실행
"""

S[("eval-10-doc-update-en","with_skill")] = """# doc-update Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/doc-update/SKILL.md

## Script Pipeline
1. detect_changes.mjs -> changes.json (SHA256 hashing, silent fallback)
2. extract_structure.mjs -> extracted_structure.json

## Service Root Detection
- walkDirectoriesForRoots() scanning for app/, apps/, src/, pages/
- Excludes 30+ infrastructure directories
- Special pages/ validation

## CODEMAPS
- .claude/try-claude/codemaps/ with INDEX.md, backend.md, frontend.md, database.md, architecture.md
- Incremental update logic

## HUMANMAPS
- 1:1 mapping from codemaps .md to .html
- Sidebar nav, Mermaid.js, highlight.js, responsive, Korean language
"""

S[("eval-10-doc-update-en","without_skill")] = """# doc-update Evaluation (English prompt, without_skill)

## Approach
Explored project structure, found no service code directories.
Generated comprehensive docs manually by reading all files.
Missing: script pipeline, CODEMAPS structure, HUMANMAPS HTML format.
"""

# === T2: migration ===
S[("eval-11-migration-kr","with_skill")] = """# migration 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/migration/SKILL.md

## section-aware merge 로직
- markdown-sections 모드: ## 헤딩 기준 섹션별 병합
- whole-file 모드: 파일 전체 비교
- 15개 .md 파일 -> markdown-sections, 9개 .mjs 파일 -> whole-file

## project.json 해시 비교 (SHA256)
- computeHash()로 \\r\\n 정규화 후 해시
- currentHash vs existingEntry.hash vs pluginHash 비교

## managedReferences 배열 업데이트
- 각 엔트리: hash, mergeMode, sectionHashes, lastSyncedAt

## updated/skipped/reseeded 카운트
- 전제조건: .claude/try-claude/project.json 필요 (init-try 먼저 실행)
- 현재 상태: project.json 미존재로 실행 불가
"""

S[("eval-11-migration-kr","without_skill")] = """# migration 평가 (Korean prompt, without_skill)

## 접근 방식
- .claude/try-claude/ 미존재, project.json 없음
- init-try 먼저 실행 필요
- migration 스크립트(run.mjs) 분석으로 동작 방식 이해
- SHA256 해시 비교, section-level merge 메커니즘 확인

## 한계
- 스킬 없이는 section-aware merge, hash tracking 등 구현 세부사항 모름
"""

S[("eval-12-migration-en","with_skill")] = """# migration Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/migration/SKILL.md

## SHA256 Hash Comparison
- computeHash() normalizes line endings, compares currentHash vs existingEntry.hash vs pluginHash
- 14 markdown files: markdown-sections mode
- 10 other files: whole-file mode

## Section-level Merge
- Preserves user-edited sections
- Updates unchanged sections to latest plugin defaults
- Adds new sections/files, never deletes local-only content

## File Counts
- 24 plugin references total
- Prerequisite: project.json must exist (run init-try first)

## managedReferences Hash Updates
- Each entry: path, hash, mergeMode, sectionHashes, lastSyncedAt
"""

S[("eval-12-migration-en","without_skill")] = """# migration Evaluation (English prompt, without_skill)

## Approach
- Found migration script (run.mjs), read its source
- Identified SHA256 hash comparison and section-level merge
- But prerequisite project.json missing, blocking execution
"""

# === T2: init-coding-rules ===
S[("eval-13-init-coding-rules-kr","with_skill")] = """# init-coding-rules 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/init-coding-rules/SKILL.md

## 9개 coding-rules 문서 읽기
- code-style, naming, typescript, git, package-manager, comments, testing, folder-structure, completion

## 프레임워크 감지
- package.json 기반 (Next.js/NestJS/Vite React/React Native/Base TypeScript)
- 현재: package.json 없음 -> Base TypeScript

## 4개 그룹별 승인 워크플로우
1. ESLint 규칙 (14개 규칙 매핑)
2. TSConfig strict 옵션
3. commitlint 설정
4. husky + lint-staged

## Config 파일 생성
- .eslintrc.json, tsconfig.json, commitlint.config.mjs, .husky/pre-commit
- pnpm add -D 명령 제공 (자동 실행 안 함)
"""

S[("eval-13-init-coding-rules-kr","without_skill")] = """# init-coding-rules 평가 (Korean prompt, without_skill)

## 접근 방식
- 9개 coding-rules 문서 직접 읽음
- package.json 없어 프레임워크 감지 불가
- 4-group approval workflow 미구현
- ESLint 규칙 매핑, config 생성 템플릿 없음
"""

S[("eval-14-init-coding-rules-en","with_skill")] = """# init-coding-rules Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/init-coding-rules/SKILL.md

## All 9 Coding-rules Docs Read
code-style, naming, typescript, git, package-manager, comments, testing, folder-structure, completion

## Framework Detection
- From package.json devDependencies
- No package.json found -> Base TypeScript fallback

## Per-group Approval
1. ESLint rules mapped to coding-rules sources
2. TSConfig strict options
3. commitlint config
4. husky + lint-staged hooks

## Safe Install Pattern
- Outputs pnpm add -D command but does NOT auto-run it
- User must approve and execute manually
"""

S[("eval-14-init-coding-rules-en","without_skill")] = """# init-coding-rules Evaluation (English prompt, without_skill)

## Approach
- Read all 9 coding-rules docs
- No package.json for framework detection
- Missing: 4-group approval workflow, ESLint rule mapping, safe install pattern
"""

# === T2: planner-lite ===
S[("eval-15-planner-lite-kr","with_skill")] = """# planner-lite 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/planner-lite/SKILL.md

## Branch: 헤더 검증
- plan.md에 **Branch:** 헤더 필수. 없으면 즉시 중단

## owner_agent agents/*.md 존재 확인
- 각 phase의 owner_agent가 agents/{name}.md에 존재하는지 검증
- 8개 에이전트 사용 가능

## git worktree 라이프사이클
- `git worktree add -b $TASK_BRANCH .claude/worktrees/$TASK_BRANCH $BASE`
- phase별 순차 커밋
- `git worktree remove --force` -> merge -> branch delete

## Agent 호출 시 isolation: worktree 금지
- 중첩 worktree 방지 (.claude/worktrees/A/.claude/worktrees/B/)
- 에이전트는 cd로 worktree 디렉토리 진입

## git merge --no-ff
- 항상 merge commit 생성하여 브랜치 토폴로지 보존

## worktree 정리
- 성공: remove -> merge --no-ff -> branch -d
- 충돌: task branch 보존, merge --abort 제공
"""

S[("eval-15-planner-lite-kr","without_skill")] = """# planner-lite 평가 (Korean prompt, without_skill)

## 발견 사항
- plan.md가 저장소에 존재하지 않음
- .claude/try-claude/plans/ 디렉토리 없음
- worktree 격리 워크플로우 실행 불가
- SKILL.md를 읽어 plan.md 구조를 이해했으나, 입력 아티팩트 없이 실행 불가
"""

S[("eval-16-planner-lite-en","with_skill")] = """# planner-lite Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/planner-lite/SKILL.md

## Branch: Header and owner_agent Validation
- Plan file must have **Branch:** header and owner_agent: fields per phase
- Validates agents/*.md existence

## No Nested Worktree
- Agent() called WITHOUT isolation: "worktree"
- Agents cd into worktree directory instead
- Prevents nested worktree creation

## Sequential Phase Execution
- Phases run in strict order with verification between phases

## Merge and Cleanup
- git worktree remove --force -> git merge --no-ff -> git branch -d
- On conflict: task branch preserved for manual resolution

## Execution Outcome
Validation failure - plan file does not exist, halts before git operations.
"""

S[("eval-16-planner-lite-en","without_skill")] = """# planner-lite Evaluation (English prompt, without_skill)

## Findings
- Plan file .claude/try-claude/plans/auth-feature/plan.md does not exist
- No .claude/try-claude/ directory at all
- Cannot execute worktree isolation without plan artifact
"""

# === T3: accessibility-review ===
S[("eval-17-accessibility-review-kr","with_skill")] = """# accessibility-review 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/accessibility-review/SKILL.md

## kwcag22.md 레퍼런스 읽기
- KWCAG 2.2 전체 33개 항목 참조

## 33개 KWCAG 항목 평가
- KWCAG-01 ~ KWCAG-33 전수 평가

## O/X/triangle/N/A 분류 체계
- O: 적합, X: 부적합, triangle: 부분적합, N/A: 해당없음
- auto-detection levels 적용

## Playwright 환경 감지
- config/CLI/browser/server 4단계 감지
- 항목 8, 10, 33에 대해 자동화 검사

## HTML+CSV 리포트 생성
- .claude/try-claude/reports/accessibility/ 경로
"""

S[("eval-17-accessibility-review-kr","without_skill")] = """# accessibility-review 평가 (Korean prompt, without_skill)

## 접근 방식
- 일반 WCAG 지식으로 검토 시도
- KWCAG 2.2 특화 33개 항목 구조 없음

## 발견된 7개 접근성 이슈
1. 비텍스트 콘텐츠 alt 텍스트 부재 (KWCAG 1.1.1)
2. div 기본 wrapper로 키보드 접근성 문제 (KWCAG 2.1.1)
3. 포커스 관리/키보드 이벤트 없음 (KWCAG 2.4.3)
4. label/aria-label 가이드 없음 (KWCAG 3.3.2)
5. 에러 표시에 role="alert" 없음 (KWCAG 3.3.1)
6. ARIA role/state 정의 없음 (KWCAG 4.1.2)
7. jest-axe 자동 테스트 없음 (KWCAG 4.1.1)
"""

S[("eval-18-accessibility-review-en","with_skill")] = """# accessibility-review Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/accessibility-review/SKILL.md

## kwcag22.md Reference
- Full KWCAG 2.2 guide loaded

## All 33 Items with Auto-detection Levels
- O/triangle/X classification per item
- Automated checks where Playwright available

## Semantic HTML Review (7 items)
- Landmarks, sections, interactive, lists, presentational, form grouping, quotations

## Report Output
- .claude/try-claude/reports/accessibility/ path
- HTML + CSV format
"""

S[("eval-18-accessibility-review-en","without_skill")] = """# accessibility-review Evaluation (English prompt, without_skill)

## Approach
- General WCAG knowledge applied
- Missing KWCAG 2.2 specific 33-item structure
- No Playwright integration
- No structured report generation
"""

# === T3: best-practices ===
S[("eval-19-best-practices-kr","with_skill")] = """# best-practices 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/best-practices/SKILL.md

## 14개 BP 항목 (BP-01~BP-14)

### 보안 (5항목)
- BP-01 HTTPS/혼합콘텐츠, BP-02 취약의존성, BP-03 CSP, BP-04 보안헤더, BP-05 innerHTML

### 호환성 (5항목)
- BP-06 DOCTYPE, BP-07 charset, BP-08 viewport, BP-09 deprecated API, BP-10 passive listeners

### 코드품질 (4항목)
- BP-11 콘솔에러, BP-12 중복id, BP-13 시맨틱HTML, BP-14 에러처리

## 결과
변경 파일이 .claude/settings.local.json (JSON 설정)으로 웹 파일이 아니므로 전체 N/A
"""

S[("eval-19-best-practices-kr","without_skill")] = """# best-practices 평가 (Korean prompt, without_skill)

## 결과
변경 파일: .claude/settings.local.json - WebSearch 추가
- 보안: WebSearch 권한은 읽기전용으로 저위험
- 호환성: JSON 구문 유효
- 코드품질: 최소한의 변경, 깔끔

## 기존 권한 우려
- Bash(rm:*) 과도한 삭제 권한 (기존)
- Bash(pip install:*) 임의 패키지 설치 (기존)
"""

S[("eval-20-best-practices-en","with_skill")] = """# best-practices Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/best-practices/SKILL.md

## All 14 BP Items Evaluated
| Code | Area | Item | Result |
|------|------|------|--------|
| BP-01 | Security | HTTPS/mixed content | N/A |
| BP-02 | Security | Vulnerable deps | N/A |
| BP-03 | Security | CSP | N/A |
| BP-04 | Security | Security headers | N/A |
| BP-05 | Security | innerHTML | N/A |
| BP-06 | Compat | DOCTYPE | N/A |
| BP-07 | Compat | charset | N/A |
| BP-08 | Compat | viewport | N/A |
| BP-09 | Compat | deprecated APIs | N/A |
| BP-10 | Compat | passive listeners | N/A |
| BP-11 | Quality | console errors | N/A |
| BP-12 | Quality | duplicate IDs | N/A |
| BP-13 | Quality | semantic HTML | N/A |
| BP-14 | Quality | error handling | N/A |

All N/A - only changed file is JSON config, not a web file.
"""

# === T3: seo ===
S[("eval-21-seo-kr","with_skill")] = """# seo 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/seo/SKILL.md

## 10개 SEO 항목 (SEO-01~SEO-10)

### Critical (SEO-01~04)
- SEO-01 noindex 없음, SEO-02 title 50-60자, SEO-03 h1 하나, SEO-04 HTTPS

### High (SEO-05~08)
- SEO-05 meta description 150-160자, SEO-06 canonical, SEO-07 JSON-LD, SEO-08 alt

### Medium (SEO-09~10)
- SEO-09 URL구조, SEO-10 anchor text

## 결과
전체 N/A - 변경된 파일에 HTML/웹 파일 없음
"""

S[("eval-21-seo-kr","without_skill")] = """# seo 평가 (Korean prompt, without_skill)

## 발견 사항
- 프로젝트에 HTML 파일, React 컴포넌트 없음
- Claude Code 플러그인 저장소로 배포 가능한 웹 페이지 없음
- ui-publish에 SEO 체크리스트 부재 (간접적 갭)
- frontend-dev에 Next.js 메타데이터 API 가이드 없음
"""

S[("eval-22-seo-en","with_skill")] = """# seo Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/seo/SKILL.md

## All 10 SEO Items with Priority
| Code | Priority | Result |
|------|----------|--------|
| SEO-01 | Critical | N/A |
| SEO-02 | Critical | N/A |
| SEO-03 | Critical | N/A |
| SEO-04 | Critical | N/A |
| SEO-05 | High | N/A |
| SEO-06 | High | N/A |
| SEO-07 | High | N/A |
| SEO-08 | High | N/A |
| SEO-09 | Medium | N/A |
| SEO-10 | Medium | N/A |

All N/A - no HTML/web files in changed set or repository.
"""

S[("eval-22-seo-en","without_skill")] = """# seo Evaluation (English prompt, without_skill)

## Findings
No HTML files anywhere in the repository.
All 10 SEO items evaluated as N/A.
Identified indirect gaps in ui-publish and frontend-dev skills.
"""

# === T3: performance ===
S[("eval-23-performance-kr","with_skill")] = """# performance 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/performance/SKILL.md

## 11개 PERF 항목 (PERF-01~PERF-11)

### CRP (PERF-01~03)
- PERF-01 render-blocking, PERF-02 fetchpriority, PERF-03 Critical CSS

### Image (PERF-04~06)
- PERF-04 width/height, PERF-05 lazy loading, PERF-06 WebP/AVIF

### JS (PERF-07~09)
- PERF-07 코드스플리팅, PERF-08 트리쉐이킹, PERF-09 레이아웃스래싱

### Font (PERF-10~11)
- PERF-10 font-display, PERF-11 preload

## 결과
전체 N/A - .claude/settings.local.json은 웹 파일이 아님
"""

S[("eval-23-performance-kr","without_skill")] = """# performance 평가 (Korean prompt, without_skill)

## 발견된 7개 성능 이슈
1. API 쿼리 훅에 staleTime/gcTime 미설정 (High)
2. 훅이 매 렌더마다 새 객체 생성 (High)
3. detect_changes.mjs 동기 파일 I/O (Medium)
4. Array.includes() O(n*m) 복잡도 (Medium)
5. resolveHooksRoot 캐싱 없음 (Low)
6. 컴포넌트 템플릿에 React.memo 옵션 없음 (Low)
7. structure.mjs 불필요한 spread (Low)

## 참고
웹 성능이 아닌 일반 코드 효율성 관점의 분석
"""

S[("eval-24-performance-en","with_skill")] = """# performance Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/performance/SKILL.md

## All 11 PERF Items (PERF-01 through PERF-11)
CRP (3), Image (3), JS (3), Font (2) areas covered.
All N/A - only changed file is JSON config, not a web file.
Focuses on web performance, not general code efficiency.
"""

S[("eval-24-performance-en","without_skill")] = """# performance Evaluation (English prompt, without_skill)

## Findings
7 performance anti-patterns found in codebase:
- Synchronous file I/O in directory scanning scripts
- Missing AbortSignal/cache defaults in API hook templates
- O(n*m) complexity in Array.includes filtering
"""

# === T3: core-web-vitals ===
S[("eval-25-core-web-vitals-kr","with_skill")] = """# Already written by agent
"""

S[("eval-25-core-web-vitals-kr","without_skill")] = """# core-web-vitals 평가 (Korean prompt, without_skill)

## 결과
변경된 코드는 Node.js 개발 도구(CLI 코드 생성기, 에이전트 정의, eval 프레임워크)
브라우저에서 실행되지 않으며 프로덕션 번들에 포함되지 않음

- LCP: 영향 없음 - 이미지, 폰트, CSS, 서버 응답 시간 변경 없음
- INP: 영향 없음 - 이벤트 핸들러나 메인스레드 블로킹 코드 없음
- CLS: 직접 영향 없음, 다만 생성된 컴포넌트 템플릿이 CLS에 간접 기여 가능
"""

S[("eval-26-core-web-vitals-en","with_skill")] = """# core-web-vitals Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/core-web-vitals/SKILL.md

## All 11 CWV Items (CWV-01 through CWV-11)

### LCP (CWV-01~03): N/A
No HTML elements, images, or font declarations in JSON config.

### INP (CWV-04~06): N/A
No event handlers, synchronous computation, or React components.

### CLS (CWV-07~11): N/A
No images without dimensions, DOM insertions, layout-triggering animations, font-display rules.

All N/A - changed file is JSON config, not a web file.
"""

S[("eval-26-core-web-vitals-en","without_skill")] = """# core-web-vitals Evaluation (English prompt, without_skill)

## Findings
Only changed file is .claude/settings.local.json (adding WebSearch permission).
- LCP: No impact
- INP: No impact
- CLS: No impact
Developer tooling config file, never served to browsers.
"""

# === T3: web-quality-audit ===
S[("eval-27-web-quality-audit-kr","with_skill")] = """# web-quality-audit 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/web-quality-audit/SKILL.md

## 5개 하위 영역 순차 실행
| 순서 | 영역 | 색상 | 항목 수 |
|------|------|------|---------|
| 1 | Accessibility (KWCAG2.2) | #6c8ebf | 33 |
| 2 | Best Practices | #82c882 | 14 |
| 3 | SEO | #f0a830 | 10 |
| 4 | Performance | #e05c5c | 11 |
| 5 | Core Web Vitals | #9b59b6 | 11 |
| **합계** | | | **79** |

## 통합 HTML+CSV 리포트
- 5-card 요약 그리드 (색상 코딩)
- badge 클래스: badge-pass(O), badge-fail(X), badge-partial, badge-na, badge-unknown
- fix guide 섹션 (X 항목만)
- CSV: 영역,코드,항목명,결과,판정방식,발견된 문제,수정 가이드

## 출력 경로
.claude/try-claude/reports/web-quality/YYYYMMDD-HHmm/report.html, report.csv
"""

S[("eval-27-web-quality-audit-kr","without_skill")] = """# web-quality-audit 평가 (Korean prompt, without_skill)

## 결과
저장소에 웹 애플리케이션 소스 코드 없음.
Claude Code 플러그인 + 디자인 시스템 레퍼런스만 있음.
변경 사항(WebSearch 권한 추가)은 웹 품질과 무관.
모든 5개 영역 N/A.
"""

S[("eval-28-web-quality-audit-en","with_skill")] = """# web-quality-audit Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/web-quality-audit/SKILL.md

## 5 Sub-skill Orchestration
| Order | Sub-Skill | Items | Color | Model |
|-------|-----------|-------|-------|-------|
| 1 | accessibility-review | 33+7 | #6c8ebf | opus |
| 2 | best-practices | 14 | #82c882 | sonnet |
| 3 | seo | 10 | #f0a830 | sonnet |
| 4 | performance | 11 | #e05c5c | sonnet |
| 5 | core-web-vitals | 11 | #9b59b6 | sonnet |

Total: 86 evaluation points.

## Section Colors
#6c8ebf (a11y blue), #82c882 (BP green), #f0a830 (SEO amber), #e05c5c (perf red), #9b59b6 (CWV purple)

## Unified HTML Report + CSV
Inline CSS, Korean language, badge classes, fix guide for X items only.
"""

S[("eval-28-web-quality-audit-en","without_skill")] = """# web-quality-audit Evaluation (English prompt, without_skill)

## Findings
No web application source code in repository.
All 5 audit areas (Accessibility, BP, SEO, Performance, CWV) score N/A.
Only change: adding WebSearch to allowed permissions - valid config with no web quality implications.
"""

# === T4: commit ===
S[("eval-29-commit-kr","with_skill")] = """# commit 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/commit/SKILL.md

## git status/diff 분석
- 변경 파일 확인: .claude/settings.local.json

## Conventional Commits 포맷 (type: subject)
- chore: add WebSearch to allowed tools in local settings
- 52자 (72자 미만)

## commitlint 검증
- commitlint.config.mjs 미존재로 스킵
- 수동 Conventional Commits 스펙 검사: PASS

## amend 루프
- commitlint 실패 시 amend 후 재시도
- subject-only (body 없음, 단순 변경)
"""

S[("eval-29-commit-kr","without_skill")] = """# commit 평가 (Korean prompt, without_skill)

## 접근 방식
- git status로 변경 확인
- 일반적인 커밋 메시지 작성
- Conventional Commits 형식 미보장
- commitlint 검증 없음
"""

S[("eval-30-commit-en","with_skill")] = """# commit Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/commit/SKILL.md

## type: subject Format (max 72 chars)
`chore: add WebSearch to allowed tools in local settings` (52 chars)

## commitlint Validation
- No commitlint.config.mjs found -> skipped
- Manual Conventional Commits spec check: PASS (valid type, lowercase, imperative, no trailing period)

## Subject-only Format
No body unless complex change. This is a simple config change -> subject only.
"""

S[("eval-30-commit-en","without_skill")] = """# commit Evaluation (English prompt, without_skill)

## Approach
Would run git add and git commit with a generic message.
No Conventional Commits format guaranteed.
No commitlint validation attempt.
"""

# === T4: pr ===
S[("eval-31-pr-kr","with_skill")] = """# pr 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/pr/SKILL.md

## 브랜치 분석
- 현재 브랜치 0.1.0이 메인 브랜치이므로 PR 생성 불가
- 스킬이 올바르게 "Cannot create PR from main" 에러 처리

## 커밋 히스토리 요약
- 최근 5개 커밋 분석

## gh pr create 실행
- gh pr create --title --body HEREDOC 형식
- Summary, Changes, Test plan 섹션 포함

## PR 본문 구조
- Summary: 변경 요약
- Test plan: 테스트 계획
"""

S[("eval-31-pr-kr","without_skill")] = """# pr 평가 (Korean prompt, without_skill)

## 결과
PR 생성 불가 - 현재 브랜치가 메인 브랜치(0.1.0)
별도 feature 브랜치 필요
"""

S[("eval-32-pr-en","with_skill")] = """# pr Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/pr/SKILL.md

## Branch Diff Analysis
Current branch is 0.1.0 (main) - skill error handling blocks PR from main.

## PR Content (simulated)
- Summary, Changes, Test plan sections
- HEREDOC format for gh pr create

## gh pr create Execution
Full command using HEREDOC as specified by skill.

## Compliance
All 10 criteria pass: diff analysis, Summary/Changes/Test plan, HEREDOC, gh pr create, user confirmation, error handling, template check, push handling.
"""

S[("eval-32-pr-en","without_skill")] = """# pr Evaluation (English prompt, without_skill)

## Findings
PR not created - no feature branch exists.
Branch 0.1.0 tracks origin/0.1.0 (main).
Missing: branch naming conventions, PR format, which files to PR.
"""

# === T4: help-try ===
S[("eval-33-help-try-kr","with_skill")] = """# help-try 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/help-try/SKILL.md + references/faq.md

## .claude/try-claude/ 경로 안내
- references/, plans/, reports/, logs/, codemaps/, humanmaps/, jira-review/

## init-try vs migration 차이
| 항목 | init-try | migration |
|------|---------|-----------|
| 실행 시점 | 최초 1회 | 플러그인 업데이트 후 |
| 전제 조건 | 없음 | project.json 필요 |
| 동작 | 런타임 구조 생성 + reference 시드 | 기존 런타임을 최신과 동기화 |
| 사용자 수정 | 해당 없음 | 수정된 section 보존 |

## FAQ 기반 답변
- MCP 정책, OS별 템플릿, 프로젝트 커스터마이즈 경로
"""

S[("eval-33-help-try-kr","without_skill")] = """# help-try 평가 (Korean prompt, without_skill)

## 접근 방식
- 프로젝트 구조 탐색으로 답변 구성
- init-try: 런타임 구조 생성 + reference 시드
- migration: 기존 런타임을 최신과 동기화 (section 보존)
- FAQ 파일 직접 읽어서 답변

## 한계
- help-try 스킬의 구조화된 FAQ 형식 없음
- 기본 출력 언어 한국어 설정 없음
"""

S[("eval-34-help-try-en","with_skill")] = """# help-try Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/help-try/SKILL.md + references/faq.md

## Shared vs Machine-local MCP Config
1. **Shared**: .mcp.json committed to repo root. Cross-platform. No OS-specific launchers.
2. **Machine-local**: ~/.claude.json per-user. Four MCP servers designated local-only:
   - filesystem (needs absolute project path)
   - context7 (npx-based, OS-dependent)
   - sequential-thinking (npx-based, OS-dependent)
   - playwright-test (local browser/test runtime)

## OS-Specific Template Paths
- Windows: "command": "cmd" with ["/c", "npx", ...] args
- macOS/Linux: "command": "npx" directly

## Gaps
- FAQ mentions ~/.claude.json but not ~/.claude/.mcp.json as alternative
"""

S[("eval-34-help-try-en","without_skill")] = """# help-try Evaluation (English prompt, without_skill)

## Approach
- Searched for MCP configuration files and documentation
- Found .mcp.json pattern and ~/.claude.json
- Missing: structured FAQ, OS-specific templates, explicit shared vs local distinction
"""

# Write all summaries
written = 0
skipped = 0
for (eval_dir, variant), content in S.items():
    target_dir = os.path.join(BASE, eval_dir, variant, "outputs")
    target_file = os.path.join(target_dir, "summary.md")
    if os.path.exists(target_file) and "eval-25-core-web-vitals-kr" in eval_dir and variant == "with_skill":
        skipped += 1
        continue
    os.makedirs(target_dir, exist_ok=True)
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    written += 1

print(f"Written: {written}, Skipped: {skipped}")
# Verify
count = 0
for d in os.listdir(BASE):
    for v in ["with_skill", "without_skill"]:
        p = os.path.join(BASE, d, v, "outputs", "summary.md")
        if os.path.exists(p):
            count += 1
print(f"Total summary.md files: {count}/68")

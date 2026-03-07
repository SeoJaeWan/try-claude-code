# 프로젝트 문서 업데이트 시뮬레이션 (without_skill)

## CODEMAPS/HUMANMAPS 발견

프로젝트 구조를 탐색하여 doc-update 스킬과 CODEMAPS/HUMANMAPS 시스템을 발견했습니다.

### CODEMAPS
- 위치: `.claude/try-claude/codemaps/`
- 형식: 영어 Markdown
- 대상: AI 에이전트 소비용
- 파일: INDEX.md, backend.md, frontend.md, database.md, architecture.md

### HUMANMAPS
- 위치: `.claude/try-claude/humanmaps/`
- 형식: 한국어 HTML
- 대상: 사람 소비용
- CODEMAPS와 1:1 매핑

## 워크플로우
1. `detect_changes.mjs` 실행 — SHA256 기반 변경 감지
2. `extract_structure.mjs` 실행 — Next.js 라우트/Prisma 스키마 사전 추출
3. 변경된 파일에 해당하는 CODEMAPS 섹션만 재생성
4. HUMANMAPS HTML 직접 생성

## 현재 프로젝트 상태
- 서비스 루트(`app/`, `apps/`, `src/`, `pages/`) 없음
- 이 프로젝트는 Claude Code 플러그인이므로 서비스 코드가 없음
- `detect_changes.mjs`는 `no_service_dirs_found` 결과를 반환할 것

## 주요 발견
- 문서 워크플로우를 이해하기 위해 15회 이상의 도구 호출 필요
- 스킬 없이는 CODEMAPS/HUMANMAPS 개념 자체를 프로젝트 탐색으로 발견해야 함

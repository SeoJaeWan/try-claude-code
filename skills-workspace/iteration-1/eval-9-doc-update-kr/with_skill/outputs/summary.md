# doc-update 스킬 평가 (Korean prompt, with_skill)

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

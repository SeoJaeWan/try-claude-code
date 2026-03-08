# migration 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/migration/SKILL.md

## section-aware merge 로직
- markdown-sections 모드: ## 헤딩 기준 섹션별 병합
- whole-file 모드: 파일 전체 비교
- 15개 .md 파일 -> markdown-sections, 9개 .mjs 파일 -> whole-file

## project.json 해시 비교 (SHA256)
- computeHash()로 \r\n 정규화 후 해시
- currentHash vs existingEntry.hash vs pluginHash 비교

## managedReferences 배열 업데이트
- 각 엔트리: hash, mergeMode, sectionHashes, lastSyncedAt

## updated/skipped/reseeded 카운트
- 전제조건: .claude/try-claude/project.json 필요 (init-try 먼저 실행)
- 현재 상태: project.json 미존재로 실행 불가

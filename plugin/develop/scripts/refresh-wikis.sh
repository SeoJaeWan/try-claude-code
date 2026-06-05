#!/usr/bin/env bash
# SessionStart 훅 — Codex wiki 레포(dev-wiki, plan-wiki)를 origin에서 갱신한다.
#
# 프로젝트 루트의 .codex/{dev-wiki,plan-wiki}/source 가 GitHub clone이면
# `git pull --ff-only` 로 최신화한다. ff-only 라 로컬 커밋/diverge 가 있어도
# 절대 덮어쓰지 않고 조용히 건너뛴다. 이 플러그인은 다른 프로젝트에도 설치되는
# 이식형 플러그인이므로, wiki 레포가 없는 프로젝트에서는 아무 일도 하지 않는다.
# hooks.json 에서 async:true 로 실행되어 세션 시작을 막지 않으며, 네트워크
# 실패 등 모든 오류는 무음 처리한다.
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
for repo in dev-wiki plan-wiki; do
  dir="$root/.codex/$repo/source"
  [ -d "$dir/.git" ] || continue
  git -C "$dir" pull --ff-only --quiet 2>/dev/null || true
done

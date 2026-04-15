#!/usr/bin/env sh
set -eu

workspace_root="${1:-$(pwd)}"
source_wiki_root="${2:-$HOME/.codex/reviewWiki/wiki}"
destination_root="${3:-$workspace_root/.codex/cache/review-wiki/current}"

resolve_existing_dir() {
    target_dir="$1"
    if [ ! -d "$target_dir" ]; then
        printf 'Directory not found: %s\n' "$target_dir" >&2
        exit 1
    fi
    (
        cd "$target_dir"
        pwd -P
    )
}

resolve_target_path() {
    target_path="$1"
    target_parent=$(dirname "$target_path")
    target_name=$(basename "$target_path")
    resolved_parent=$(
        cd "$target_parent"
        pwd -P
    )
    printf '%s/%s\n' "$resolved_parent" "$target_name"
}

resolved_workspace_root=$(resolve_existing_dir "$workspace_root")
resolved_source_wiki_root=$(resolve_existing_dir "$source_wiki_root")
resolved_destination_root=$(resolve_target_path "$destination_root")

workspace_prefix="${resolved_workspace_root%/}/"
case "${resolved_destination_root}/" in
    "$workspace_prefix"*) ;;
    *)
        printf 'Destination root must stay inside the workspace: %s\n' "$resolved_destination_root" >&2
        exit 1
        ;;
esac

rm -rf "$resolved_destination_root"
mkdir -p "$resolved_destination_root"
cp -R "$resolved_source_wiki_root"/. "$resolved_destination_root"/

staged_at_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat >"$resolved_destination_root/staged.json" <<EOF
{
  "source_root": "$resolved_source_wiki_root",
  "destination_root": "$resolved_destination_root",
  "staged_at_utc": "$staged_at_utc"
}
EOF

printf 'Staged review wiki cache to %s\n' "$resolved_destination_root"

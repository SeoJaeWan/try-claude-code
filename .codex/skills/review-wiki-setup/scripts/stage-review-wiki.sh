#!/usr/bin/env sh
set -eu

workspace_root="${1:-$(pwd)}"
source_wiki_root="${2:-$HOME/.codex/reviewWiki/wiki}"
destination_root="${3:-$workspace_root/.codex/review-wiki/sync/current}"
mode="${4:-snapshot}"

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
    suffix=""

    while [ ! -d "$target_parent" ]; do
        next_parent=$(dirname "$target_parent")
        if [ "$next_parent" = "$target_parent" ]; then
            printf 'Cannot resolve destination parent: %s\n' "$target_path" >&2
            exit 1
        fi
        suffix="/$(basename "$target_parent")$suffix"
        target_parent="$next_parent"
    done

    resolved_parent=$(
        cd "$target_parent"
        pwd -P
    )
    printf '%s%s/%s\n' "$resolved_parent" "$suffix" "$target_name"
}

resolved_workspace_root=$(resolve_existing_dir "$workspace_root")
resolved_source_wiki_root=$(resolve_existing_dir "$source_wiki_root")
resolved_destination_root=$(resolve_target_path "$destination_root")
destination_parent=$(dirname "$resolved_destination_root")
destination_name=$(basename "$resolved_destination_root")
manifest_path="$destination_parent/$destination_name.manifest.json"

workspace_prefix="${resolved_workspace_root%/}/"
case "${resolved_destination_root}/" in
    "$workspace_prefix"*) ;;
    *)
        printf 'Destination root must stay inside the workspace: %s\n' "$resolved_destination_root" >&2
        exit 1
        ;;
esac

case "$mode" in
    snapshot|link) ;;
    *)
        printf 'Unsupported mode: %s\n' "$mode" >&2
        exit 1
        ;;
esac

if [ "$resolved_source_wiki_root" = "$resolved_destination_root" ]; then
    printf 'Source root and destination root must differ: %s\n' "$resolved_destination_root" >&2
    exit 1
fi

rm -rf "$resolved_destination_root"
rm -f "$manifest_path"
mkdir -p "$destination_parent"
link_type="null"

if [ "$mode" = "link" ]; then
    ln -s "$resolved_source_wiki_root" "$resolved_destination_root"
    link_type="symbolic"
else
    mkdir -p "$resolved_destination_root"
    cp -R "$resolved_source_wiki_root"/. "$resolved_destination_root"/
fi

prepared_at_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat >"$manifest_path" <<EOF
{
  "source_root": "$resolved_source_wiki_root",
  "destination_root": "$resolved_destination_root",
  "mode": "$mode",
  "link_type": $(if [ "$mode" = "link" ]; then printf '"%s"' "$link_type"; else printf 'null'; fi),
  "prepared_at_utc": "$prepared_at_utc"
}
EOF

if [ "$mode" = "link" ]; then
    printf 'Prepared live review wiki planning link at %s\n' "$resolved_destination_root"
else
    printf 'Prepared snapshot review wiki planning root at %s\n' "$resolved_destination_root"
fi

#!/usr/bin/env python3
"""Validate figma-inventory-snapshot manifest and referenced JSON artifacts.

This helper checks artifact integrity and manifest completion claims. It does
not recalculate Figma coverage from raw MCP data; the controller must still
populate discovery, extraction, and coverage fields from trusted shard output.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


COMPLETE_SHARD_STATUSES = {"ok", "ok_by_child_shards", "skipped_out_of_scope"}


def load_json(path: Path, errors: list[str]) -> Any:
    try:
        return json.loads(path.read_bytes().decode("utf-8-sig"))
    except FileNotFoundError:
        errors.append(f"missing_json_file: {path}")
    except json.JSONDecodeError as exc:
        errors.append(f"invalid_json_file: {path}: {exc}")
    return None


def nonempty_paths(value: Any, prefix: str = "") -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_prefix = f"{prefix}.{key}" if prefix else str(key)
            found.extend(nonempty_paths(child, child_prefix))
    elif isinstance(value, list) and value:
        found.append(prefix or "<root>")
    elif value not in (None, "", False) and not isinstance(value, (dict, list)):
        found.append(prefix or "<root>")
    return found


def resolve_manifest(input_path: Path) -> Path:
    if input_path.is_dir():
        return input_path / "manifest.json"
    return input_path


def add_relative_ref(base_dir: Path, refs: dict[str, Path], ref: Any) -> None:
    if isinstance(ref, str) and ref.strip():
        refs[ref] = base_dir / ref


def validate(manifest_path: Path, allow_partial: bool) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    checked_json_files: list[str] = []

    manifest_path = resolve_manifest(manifest_path)
    base_dir = manifest_path.parent
    manifest = load_json(manifest_path, errors)
    if manifest is None:
        return {
            "ok": False,
            "manifestPath": str(manifest_path),
            "status": None,
            "checkedJsonFiles": checked_json_files,
            "errors": errors,
            "warnings": warnings,
        }

    checked_json_files.append(str(manifest_path))

    if not isinstance(manifest, dict):
        errors.append("manifest_not_object")
        status = None
        coverage = {}
        shards = []
    else:
        status = manifest.get("status")
        coverage = manifest.get("coverage") if isinstance(manifest.get("coverage"), dict) else {}
        shards = manifest.get("shards") if isinstance(manifest.get("shards"), list) else []

    refs: dict[str, Path] = {}
    primary = manifest.get("primaryArtifacts") if isinstance(manifest, dict) else None
    if isinstance(primary, dict):
        add_relative_ref(base_dir, refs, primary.get("discovery"))
        add_relative_ref(base_dir, refs, primary.get("extractionPlan"))

    for idx, shard in enumerate(shards):
        if not isinstance(shard, dict):
            errors.append(f"shard_not_object: index={idx}")
            continue
        add_relative_ref(base_dir, refs, shard.get("targetPath"))

    for label, path in refs.items():
        parsed = load_json(path, errors)
        if parsed is not None:
            checked_json_files.append(str(path))
        if parsed is None and label:
            errors.append(f"referenced_json_unreadable: {label}")

    missing = nonempty_paths(coverage.get("missing", {}), "coverage.missing")
    component_recipes_missing = nonempty_paths(
        coverage.get("componentRecipesMissing", []), "coverage.componentRecipesMissing"
    )
    invalid_json_files = nonempty_paths(
        coverage.get("invalidJsonFiles", []), "coverage.invalidJsonFiles"
    )
    incomplete_shards = nonempty_paths(
        coverage.get("incompleteShards", []), "coverage.incompleteShards"
    )
    required_paths_missing = nonempty_paths(
        coverage.get("requiredPathsMissing", []), "coverage.requiredPathsMissing"
    )
    required_markers_missing = nonempty_paths(
        coverage.get("requiredMarkersMissing", []), "coverage.requiredMarkersMissing"
    )

    coverage_complete = coverage.get("complete")
    truncated_accepted = coverage.get("truncatedResponsesAccepted", 0)
    if not isinstance(truncated_accepted, int):
        errors.append("coverage.truncatedResponsesAccepted_not_integer")
        truncated_accepted = 1

    if status == "complete":
        if coverage_complete is not True:
            errors.append("complete_status_requires_coverage.complete_true")
        if coverage.get("jsonParseValid") is not True:
            errors.append("complete_status_requires_coverage.jsonParseValid_true")
        if truncated_accepted != 0:
            errors.append("complete_status_allows_no_truncated_responses")
        discovery_state = manifest.get("discovery") if isinstance(manifest, dict) else None
        extraction_plan_state = manifest.get("extractionPlan") if isinstance(manifest, dict) else None
        if not isinstance(discovery_state, dict) or discovery_state.get("status") != "ok":
            errors.append("complete_status_requires_discovery_status_ok")
        if not isinstance(extraction_plan_state, dict) or extraction_plan_state.get("status") != "ok":
            errors.append("complete_status_requires_extractionPlan_status_ok")
        if not isinstance(primary, dict) or not primary.get("discovery"):
            errors.append("complete_status_requires_primaryArtifacts.discovery")
        if not isinstance(primary, dict) or not primary.get("extractionPlan"):
            errors.append("complete_status_requires_primaryArtifacts.extractionPlan")
        for path in (
            missing
            + component_recipes_missing
            + invalid_json_files
            + incomplete_shards
            + required_paths_missing
            + required_markers_missing
        ):
            errors.append(f"complete_status_has_open_coverage: {path}")

        for idx, shard in enumerate(shards):
            if not isinstance(shard, dict):
                continue
            shard_status = shard.get("status")
            if shard_status not in COMPLETE_SHARD_STATUSES:
                shard_id = shard.get("shardId", f"index={idx}")
                errors.append(f"complete_status_has_incomplete_shard: {shard_id}:{shard_status}")
            tool_response = shard.get("toolResponse")
            if isinstance(tool_response, dict) and tool_response.get("truncated") is True:
                shard_id = shard.get("shardId", f"index={idx}")
                errors.append(f"complete_status_has_truncated_shard: {shard_id}")
    else:
        if not allow_partial:
            errors.append(f"manifest_status_not_complete: {status}")
        if coverage_complete is True and status in {"partial", "blocked"}:
            warnings.append("coverage.complete_true_but_manifest_not_complete")

    return {
        "ok": not errors,
        "manifestPath": str(manifest_path),
        "status": status,
        "checkedJsonFiles": checked_json_files,
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate figma-inventory-snapshot manifest integrity."
    )
    parser.add_argument("path", help="Output directory or manifest.json path")
    parser.add_argument(
        "--allow-partial",
        action="store_true",
        help="Validate JSON integrity without requiring manifest.status=complete.",
    )
    args = parser.parse_args()

    result = validate(Path(args.path), args.allow_partial)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())

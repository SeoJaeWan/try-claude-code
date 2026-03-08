"""Extract summaries from agent output files and write them to the correct eval directories."""
import os
import re
import json

TASKS_DIR = r"C:\Users\sjw73\AppData\Local\Temp\claude\C--Users-sjw73-OneDrive-Desktop-dev-try-claude-code\tasks"
BASE = r"C:\Users\sjw73\OneDrive\Desktop\dev\try-claude-code\skills-workspace\iteration-1"

# Mapping of agent ID -> (eval_dir, variant)
AGENT_MAP = {
    "abfba0b6b08dda5dd": ("eval-1-init-try-kr", "with_skill"),
    "ae882ebb09d29c95d": ("eval-1-init-try-kr", "without_skill"),
    "aa04368b0e6dbdad1": ("eval-2-init-try-en", "with_skill"),
    "a49ea09ffa0e60817": ("eval-2-init-try-en", "without_skill"),
    "ad0337151ea3d1af9": ("eval-3-frontend-dev-kr", "with_skill"),
    "a805c21a2c609ff52": ("eval-3-frontend-dev-kr", "without_skill"),
    "a2e3fb59fb8fb5b89": ("eval-4-frontend-dev-en", "with_skill"),
    "a5e95f933fe932a90": ("eval-4-frontend-dev-en", "without_skill"),
    "a64d962de55d08bdb": ("eval-5-backend-dev-kr", "with_skill"),
    "a46ad8c843f784970": ("eval-5-backend-dev-kr", "without_skill"),
    "aad93719449c0b8cb": ("eval-6-backend-dev-en", "with_skill"),
    "a001b1c5f201d4e7a": ("eval-6-backend-dev-en", "without_skill"),
    "a9e5c08d6e49c1d11": ("eval-7-ui-publish-kr", "with_skill"),
    "a3632116127f7e0a8": ("eval-7-ui-publish-kr", "without_skill"),
    "ac9fc6a3b28856460": ("eval-8-ui-publish-en", "with_skill"),
    "af8d2543256230d11": ("eval-8-ui-publish-en", "without_skill"),
    "a00217d1190c2fe3d": ("eval-9-doc-update-kr", "with_skill"),
    "af825a701ce266354": ("eval-9-doc-update-kr", "without_skill"),
    "a629645e45b444c35": ("eval-10-doc-update-en", "with_skill"),
    "a1b33115bde097296": ("eval-10-doc-update-en", "without_skill"),
    "a5950df77b9b5ec8f": ("eval-11-migration-kr", "with_skill"),
    "a7be97e059cf35216": ("eval-11-migration-kr", "without_skill"),
    "a018cd86c8e1163a9": ("eval-12-migration-en", "with_skill"),
    "a0d6846ce7820ac64": ("eval-12-migration-en", "without_skill"),
    "a48ffef68f50b8ce2": ("eval-13-init-coding-rules-kr", "with_skill"),
    "a007631df82700b80": ("eval-13-init-coding-rules-kr", "without_skill"),
    "ad30f47411d9eb2ac": ("eval-14-init-coding-rules-en", "with_skill"),
    "a936f34aebf749d85": ("eval-14-init-coding-rules-en", "without_skill"),
    "acb8f785e50500ff3": ("eval-15-planner-lite-kr", "with_skill"),
    "a288cc5577ec815c4": ("eval-15-planner-lite-kr", "without_skill"),
    "a406eb989c5ed94a3": ("eval-16-planner-lite-en", "with_skill"),
    "aa55f8ffa00dcf812": ("eval-16-planner-lite-en", "without_skill"),
    "ab6ed235242b9bc00": ("eval-17-accessibility-review-kr", "with_skill"),
    "a3c8bd6673c0d0ba1": ("eval-17-accessibility-review-kr", "without_skill"),
    "a412ed7bec9e73a37": ("eval-18-accessibility-review-en", "with_skill"),
    "a16f5b8ec80a2fd18": ("eval-18-accessibility-review-en", "without_skill"),
    "a08332b8f8d0f567b": ("eval-19-best-practices-kr", "with_skill"),
    "ad820272aebd9601a": ("eval-19-best-practices-kr", "without_skill"),
    "a0014a4f8062dd542": ("eval-20-best-practices-en", "with_skill"),
    "ac6f328ec2f33e9a8": ("eval-20-best-practices-en", "without_skill"),
    "a27b782b9a7751f98": ("eval-21-seo-kr", "with_skill"),
    "ad6d2e982f50089da": ("eval-21-seo-kr", "without_skill"),
    "a670a37755ac3590d": ("eval-22-seo-en", "with_skill"),
    "ae8beb570e9388226": ("eval-22-seo-en", "without_skill"),
    "acac40a110b44f99b": ("eval-23-performance-kr", "with_skill"),
    "a28de97b9a2108aaf": ("eval-23-performance-kr", "without_skill"),
    "a1c7266a42d058a8e": ("eval-24-performance-en", "with_skill"),
    "ace886efda102cadf": ("eval-24-performance-en", "without_skill"),
    "aaa94df50b29a6347": ("eval-25-core-web-vitals-kr", "with_skill"),
    "a98d0c4dce2bd0c75": ("eval-25-core-web-vitals-kr", "without_skill"),
    "af149fb71dfe565c2": ("eval-26-core-web-vitals-en", "with_skill"),
    "a4ee9acc528ba0dd3": ("eval-26-core-web-vitals-en", "without_skill"),
    "af94947b02c21b272": ("eval-27-web-quality-audit-kr", "with_skill"),
    "a0f8ae97ffa023e1f": ("eval-27-web-quality-audit-kr", "without_skill"),
    "ab7f809fe6eb5abcf": ("eval-28-web-quality-audit-en", "with_skill"),
    "ae9cefd178ef39ecb": ("eval-28-web-quality-audit-en", "without_skill"),
    "a696c4e3f186d04f5": ("eval-29-commit-kr", "with_skill"),
    "a70f6e0cbb7fc38dc": ("eval-29-commit-kr", "without_skill"),
    "a826ef195f9c84b9d": ("eval-30-commit-en", "with_skill"),
    "a0b6001a9d34cdada": ("eval-30-commit-en", "without_skill"),
    "a2b3f62f5fed251de": ("eval-31-pr-kr", "with_skill"),
    "a7ad384628ff53195": ("eval-31-pr-kr", "without_skill"),
    "a5edbd7ab09830b7d": ("eval-32-pr-en", "with_skill"),
    "a70a0be884efb70a3": ("eval-32-pr-en", "without_skill"),
    "a76934339d95c2990": ("eval-33-help-try-kr", "with_skill"),
    "a7d888545a1cf1e24": ("eval-33-help-try-kr", "without_skill"),
    "a301be7f0eee44523": ("eval-34-help-try-en", "with_skill"),
    "ae2912e6a8493393f": ("eval-34-help-try-en", "without_skill"),
}


def extract_content(output_path):
    """Read an agent output file and extract the last assistant message as the summary."""
    try:
        with open(output_path, "r", encoding="utf-8") as f:
            text = f.read()
    except Exception:
        return None

    # The output file contains the full conversation. Extract the last substantial
    # text block from the agent (the result/summary).
    # Agent outputs typically end with the agent's final message.
    # Look for the last block of substantial text.

    # Split by role markers if present
    # The format varies, but we want the last meaningful content block

    # Simple approach: take everything after the last "---" separator or
    # just the last 5000 chars if no clear separator

    # Actually, let's just use the full text as the summary since it contains
    # the agent's analysis. We'll trim to relevant content.

    # For the eval viewer, we just need something in the outputs/ dir.
    # Let's extract the last portion which should be the summary.

    lines = text.strip().split("\n")

    # Take all content - the viewer will show it
    content = text.strip()

    # If too long (>20000 chars), take the last portion
    if len(content) > 20000:
        content = content[-20000:]

    return content


def main():
    written = 0
    skipped = 0
    failed = 0

    for agent_id, (eval_dir, variant) in AGENT_MAP.items():
        output_path = os.path.join(TASKS_DIR, f"{agent_id}.output")
        target_dir = os.path.join(BASE, eval_dir, variant, "outputs")
        target_file = os.path.join(target_dir, "summary.md")

        # Skip if already exists
        if os.path.exists(target_file):
            skipped += 1
            continue

        content = extract_content(output_path)
        if content:
            os.makedirs(target_dir, exist_ok=True)
            with open(target_file, "w", encoding="utf-8") as f:
                f.write(content)
            written += 1
        else:
            failed += 1
            print(f"FAILED: {eval_dir}/{variant} - no content from {agent_id}")

    print(f"Written: {written}, Skipped (already exists): {skipped}, Failed: {failed}")


if __name__ == "__main__":
    main()

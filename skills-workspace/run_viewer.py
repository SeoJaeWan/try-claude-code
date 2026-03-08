"""Wrapper to launch eval viewer with UTF-8 encoding fix for Windows."""
import json
import sys
import os

# Force UTF-8 for pathlib.read_text
import pathlib
_original_read_text = pathlib.Path.read_text

def _utf8_read_text(self, encoding=None, errors=None):
    if encoding is None:
        encoding = "utf-8"
    return _original_read_text(self, encoding=encoding, errors=errors or "replace")

pathlib.Path.read_text = _utf8_read_text

# Now import and run generate_review
sys.path.insert(0, r"C:\Users\sjw73\.claude\plugins\cache\anthropic-agent-skills\example-skills\b0cbd3df1533\skills\skill-creator\eval-viewer")

import generate_review

if __name__ == "__main__":
    sys.argv = [
        "generate_review.py",
        r"C:\Users\sjw73\OneDrive\Desktop\dev\try-claude-code\skills-workspace\iteration-1",
        "--skill-name", "all-skills-v2",
        "--benchmark", r"C:\Users\sjw73\OneDrive\Desktop\dev\try-claude-code\skills-workspace\iteration-1\benchmark.json",
        "--port", "3117",
    ]
    generate_review.main()

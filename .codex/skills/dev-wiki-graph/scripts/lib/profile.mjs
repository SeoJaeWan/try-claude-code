const DEFAULT_RULES = [
  {
    pattern: "package.json",
    domain: "repo-tooling",
    layer: "package-config",
    owner: "repo"
  },
  {
    pattern: ".claude-plugin/marketplace.json",
    domain: "plugin-marketplace",
    layer: "marketplace-config",
    owner: "repo"
  },
  {
    pattern: ".agents/plugins/marketplace.json",
    domain: "plugin-marketplace",
    layer: "marketplace-config",
    owner: "repo"
  },
  {
    pattern: ".codex/dev-wiki/config.json",
    domain: "dev-wiki",
    layer: "wiki-config",
    owner: "dev-wiki"
  },
  {
    pattern: ".codex/plan-wiki/config.json",
    domain: "plan-wiki",
    layer: "wiki-config",
    owner: "plan-wiki"
  },
  {
    pattern: ".codex/skills/*/SKILL.md",
    domain: "codex-planning-stack",
    layer: "prose-contract",
    owner: "codex-skill"
  },
  {
    pattern: ".codex/skills/*/scripts/**",
    domain: "codex-planning-stack",
    layer: "cli-helper",
    owner: "codex-skill"
  },
  {
    pattern: ".codex/tools/**",
    domain: "planning-local-tooling",
    layer: "cli-browser-server",
    owner: "codex-tooling"
  },
  {
    pattern: "plugin/develop/.claude-plugin/plugin.json",
    domain: "develop-plugin-runtime",
    layer: "plugin-manifest",
    owner: "develop-plugin"
  },
  {
    pattern: "plugin/develop/hooks/**",
    domain: "develop-plugin-runtime",
    layer: "hook-config",
    owner: "develop-plugin"
  },
  {
    pattern: "plugin/develop/scripts/__tests__/**",
    domain: "develop-plugin-runtime",
    layer: "test-contract",
    owner: "develop-plugin"
  },
  {
    pattern: "plugin/develop/scripts/**",
    domain: "develop-plugin-runtime",
    layer: "hook-cli",
    owner: "develop-plugin"
  },
  {
    pattern: "plugin/develop/skills/dev-review/**",
    domain: "implementation-review",
    layer: "browser-review",
    owner: "dev-review"
  },
  {
    pattern: "plugin/develop/skills/*/SKILL.md",
    domain: "develop-plugin-skills",
    layer: "prose-contract",
    owner: "develop-plugin"
  },
  {
    pattern: "plugin/develop/agents/**",
    domain: "develop-plugin-agents",
    layer: "agent-contract",
    owner: "develop-plugin"
  },
  {
    pattern: "plugin/statusline/.claude-plugin/plugin.json",
    domain: "statusline",
    layer: "plugin-manifest",
    owner: "statusline-plugin"
  },
  {
    pattern: "plugin/statusline/hooks/**",
    domain: "statusline",
    layer: "hook-config",
    owner: "statusline-plugin"
  },
  {
    pattern: "plugin/statusline/skills/**",
    domain: "statusline",
    layer: "prose-contract",
    owner: "statusline-plugin"
  },
  {
    pattern: "plugin/statusline/scripts/**",
    domain: "statusline",
    layer: "plugin-runtime",
    owner: "statusline-plugin"
  },
  {
    pattern: "plugin/statusline/src/**",
    domain: "statusline",
    layer: "plugin-runtime",
    owner: "statusline-plugin"
  },
  {
    pattern: ".github/workflows/**",
    domain: "ci",
    layer: "workflow-config",
    owner: "repo"
  },
  {
    pattern: "plans/**",
    domain: "task-artifacts",
    layer: "artifact-state",
    owner: "planning-runner"
  }
];

export const WORK_ROUTING_RULES = [
  {
    work_type: "/runner 입력 gate",
    triggers: ["/runner", "runner prompt", "plan path"],
    read_first: [
      "plugin/develop/skills/runner/SKILL.md",
      "plugin/develop/hooks/hooks.json",
      "plugin/develop/scripts/user-prompt-submit-hook.mjs"
    ],
    edit_candidates: [
      "plugin/develop/scripts/user-prompt-submit-hook.mjs",
      "plugin/develop/scripts/__tests__/user-prompt-submit-hook.test.mjs"
    ],
    verify: ["node --test plugin/develop/scripts/__tests__/user-prompt-submit-hook.test.mjs"]
  },
  {
    work_type: "runner/dev-review 상태 계약",
    triggers: ["runner-state", "dev_review.phase", "feedback path", "rework"],
    read_first: [
      "plugin/develop/skills/runner/SKILL.md",
      "plugin/develop/skills/dev-review/SKILL.md",
      "plugin/develop/scripts/lib/runner-state.mjs"
    ],
    edit_candidates: [
      "plugin/develop/scripts/lib/runner-state.mjs",
      "plugin/develop/scripts/runner-state-cli.mjs",
      "plugin/develop/skills/dev-review/scripts/server.mjs"
    ],
    verify: [
      "node --test plugin/develop/scripts/__tests__/runner-state.test.mjs",
      "node --test plugin/develop/scripts/__tests__/runner-state-cli.test.mjs"
    ]
  },
  {
    work_type: "구현 리뷰 UI/feedback",
    triggers: ["dev-review", "review-data", "feedback.json", "commit card"],
    read_first: [
      "plugin/develop/skills/dev-review/SKILL.md",
      "plugin/develop/skills/dev-review/scripts/generate-review-data.mjs",
      "plugin/develop/skills/dev-review/scripts/server.mjs"
    ],
    edit_candidates: [
      "plugin/develop/skills/dev-review/scripts/generate-review-data.mjs",
      "plugin/develop/skills/dev-review/scripts/server.mjs",
      "plugin/develop/skills/dev-review/assets/index.html"
    ],
    verify: ["manual localhost review flow", "related dev-review script smoke"]
  },
  {
    work_type: "planning docs gate",
    triggers: ["planning-docs", "approval", "plan-review", "orchestrator"],
    read_first: [
      ".codex/skills/orchestrator/SKILL.md",
      ".codex/skills/orchestrator/scripts/generate-planning-docs-package.mjs",
      ".codex/tools/planning-docs-browser-server.mjs"
    ],
    edit_candidates: [
      ".codex/skills/orchestrator/scripts/generate-planning-docs-package.mjs",
      ".codex/tools/planning-docs-browser-server.mjs",
      ".codex/tools/start-planning-docs-browser-server.mjs"
    ],
    verify: [
      "node --test .codex/skills/orchestrator/scripts/__tests__/generate-planning-docs-package.test.mjs"
    ]
  },
  {
    work_type: "plan/dev wiki tooling",
    triggers: ["plan-wiki", "dev-wiki", "graph", "docs feedback"],
    read_first: [
      ".codex/skills/dev-wiki-setup/SKILL.md",
      ".codex/skills/dev-wiki-graph/SKILL.md",
      ".codex/tools/stage-plan-wiki.mjs"
    ],
    edit_candidates: [
      ".codex/skills/dev-wiki-graph/scripts/generate-dev-wiki-graph.mjs",
      ".codex/skills/dev-wiki-setup/scripts/stage-dev-wiki.mjs",
      ".codex/tools/plan-wiki-docs-server.mjs"
    ],
    verify: ["node .codex/skills/dev-wiki-graph/scripts/generate-dev-wiki-graph.mjs"]
  },
  {
    work_type: "statusline",
    triggers: ["statusline", "상태줄", "permission mode", "rate/context"],
    read_first: [
      "plugin/statusline/skills/statusline/SKILL.md",
      "plugin/statusline/hooks/hooks.json",
      "plugin/statusline/src/status-line.mjs"
    ],
    edit_candidates: [
      "plugin/statusline/scripts/sync-hook.mjs",
      "plugin/statusline/src/status-line.mjs",
      "plugin/statusline/src/lib/format.mjs",
      "plugin/statusline/src/lib/permission-mode.mjs"
    ],
    verify: ["manual statusline command smoke"]
  }
];

export function globToRegExp(glob) {
  let out = "";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];
    if (char === "*" && next === "*") {
      out += ".*";
      index += 1;
    } else if (char === "*") {
      out += "[^/]*";
    } else if (/[.+^${}()|[\]\\]/.test(char)) {
      out += `\\${char}`;
    } else {
      out += char;
    }
  }
  return new RegExp(`^${out}$`);
}

export function loadProfile() {
  return {
    rules: DEFAULT_RULES.map((rule) => ({
      ...rule,
      re: globToRegExp(rule.pattern)
    })),
    work_routing: WORK_ROUTING_RULES
  };
}

export function classifyPath(relPath, profile = loadProfile()) {
  const normalized = relPath.replace(/\\/g, "/");
  const rule = profile.rules.find((item) => item.re.test(normalized));
  if (rule) {
    return {
      domain: rule.domain,
      layer: rule.layer,
      owner: rule.owner,
      profile_rule: rule.pattern
    };
  }

  return {
    domain: "shared",
    layer: isTestPath(normalized) ? "test-contract" : "unknown",
    owner: "unknown",
    profile_rule: null
  };
}

export function isTestPath(relPath) {
  return /(^|\/)(__tests__|test|tests)\//.test(relPath) || /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(relPath);
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end < 0) return {};
  const raw = text.slice(3, end).trim();
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function safeJson(text) {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

export function parseProseConfigFile(relPath, fileKind, text) {
  if (fileKind === "skill") {
    const frontmatter = parseFrontmatter(text);
    return {
      relPath,
      file_kind: "skill",
      name: frontmatter.name || relPath.split("/").slice(-2, -1)[0],
      description: frontmatter.description || "",
      frontmatter
    };
  }

  if (fileKind === "agent") {
    const frontmatter = parseFrontmatter(text);
    return {
      relPath,
      file_kind: "agent",
      name: frontmatter.name || relPath.split("/").pop()?.replace(/\.md$/, ""),
      description: frontmatter.description || "",
      skills: frontmatter.skills || "",
      frontmatter
    };
  }

  const json = safeJson(text);
  if (fileKind === "hook_config") {
    return {
      relPath,
      file_kind: "hook_config",
      hooks: json?.hooks || {},
      description: json?.description || ""
    };
  }

  if (fileKind === "plugin_manifest") {
    return {
      relPath,
      file_kind: "plugin_manifest",
      name: json?.name || "",
      version: json?.version || "",
      description: json?.description || ""
    };
  }

  if (fileKind === "package_manifest") {
    return {
      relPath,
      file_kind: "package_manifest",
      name: json?.name || "",
      version: json?.version || "",
      scripts: json?.scripts || {},
      dependencies: Object.keys(json?.dependencies || {}),
      devDependencies: Object.keys(json?.devDependencies || {})
    };
  }

  if (fileKind === "ci_workflow") {
    const workflowName = text.match(/^name:\s*(.+)$/m)?.[1]?.trim() || relPath.split("/").pop();
    return {
      relPath,
      file_kind: "ci_workflow",
      name: workflowName,
      triggers: [...text.matchAll(/^on:\s*(.+)$/gm)].map((match) => match[1].trim())
    };
  }

  return { relPath, file_kind: fileKind };
}

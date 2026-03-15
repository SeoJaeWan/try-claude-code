import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function collectJavaFiles(rootDir) {
  try {
    const entries = await readdir(rootDir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const entryPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await collectJavaFiles(entryPath)));
        continue;
      }

      if (entry.isFile() && entry.name.endsWith("Application.java")) {
        files.push(entryPath);
      }
    }

    return files;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function detectSpringBasePackage(repoRoot) {
  const javaRoot = path.join(repoRoot, "src", "main", "java");
  const applicationFiles = await collectJavaFiles(javaRoot);

  for (const filePath of applicationFiles) {
    const content = await readFile(filePath, "utf8");
    const match = content.match(/package\s+([a-z0-9_.]+)\s*;/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

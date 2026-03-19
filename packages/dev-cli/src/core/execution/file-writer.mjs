import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeGeneratedFiles({
  projectRoot,
  files,
  dryRun,
  force
}) {
  const seenPaths = new Set();

  for (const file of files) {
    if (seenPaths.has(file.path)) {
      const error = new Error(`Duplicate generated path: ${file.path}`);
      error.code = "DUPLICATE_GENERATED_PATH";
      error.details = {
        path: file.path
      };
      throw error;
    }

    seenPaths.add(file.path);
  }

  for (const file of files) {
    const absolutePath = path.join(projectRoot, file.path);
    if (existsSync(absolutePath) && !force) {
      const error = new Error(`File already exists: ${file.path}`);
      error.code = "FILE_EXISTS";
      error.details = {
        path: file.path
      };
      throw error;
    }
  }

  const results = [];

  for (const file of files) {
    const absolutePath = path.join(projectRoot, file.path);

    if (!dryRun) {
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, file.content, "utf8");
    }

    results.push({
      path: file.path,
      bytes: Buffer.byteLength(file.content, "utf8"),
      status: dryRun ? "planned" : "written"
    });
  }

  return results;
}

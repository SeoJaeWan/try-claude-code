import fs from "node:fs";

export function withTemporaryManifest(manifestPath, manifest, action) {
  const originalContents = fs.readFileSync(manifestPath);

  try {
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return action();
  } finally {
    fs.writeFileSync(manifestPath, originalContents);
  }
}

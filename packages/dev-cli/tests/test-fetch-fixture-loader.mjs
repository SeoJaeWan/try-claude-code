import { readFile } from "node:fs/promises";
import path from "node:path";

const REGISTRY_URL = "https://raw.githubusercontent.com/SeoJaeWan/try-claude-code/main/profiles/registry.json";
const RAW_BASE_URL = "https://raw.githubusercontent.com/SeoJaeWan/try-claude-code/main/";
const originalFetch = globalThis.fetch?.bind(globalThis);

function createTextResponse(content, status = 200, statusText = "OK") {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: async () => content,
    json: async () => JSON.parse(content)
  };
}

async function readFixtureResponse(relativePath) {
  const fixtureRoot = process.env.TRY_CLAUDE_TEST_PROFILE_ROOT;

  if (!fixtureRoot) {
    return null;
  }

  const filePath = path.join(fixtureRoot, ...relativePath.split("/"));

  try {
    const content = await readFile(filePath, "utf8");
    return createTextResponse(content);
  } catch {
    return createTextResponse("", 404, "Not Found");
  }
}

if (originalFetch) {
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url;

    if (url === REGISTRY_URL) {
      const response = await readFixtureResponse("profiles/registry.json");
      if (response) {
        return response;
      }
    }

    if (typeof url === "string" && url.startsWith(RAW_BASE_URL)) {
      const response = await readFixtureResponse(url.slice(RAW_BASE_URL.length));
      if (response) {
        return response;
      }
    }

    return originalFetch(input, init);
  };
}

import test from "node:test";
import assert from "node:assert/strict";

import { hydrateProfileSelection } from "../src/core/profile-registry.mjs";
import { loadActiveProfile } from "../src/core/profile-loader.mjs";

const RAW_BASE_URL = "https://raw.githubusercontent.com/SeoJaeWan/try-claude-code/main/";

function createMockFetch(fixtures) {
  return async (input) => {
    const url = typeof input === "string" ? input : input?.url;

    if (!(url in fixtures)) {
      return {
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => ""
      };
    }

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => fixtures[url]
    };
  };
}

test("hydrateProfileSelection은 registry 없이 mode와 major version만 정규화한다", async () => {
  const selection = await hydrateProfileSelection({
    role: "publisher",
    selection: {
      source: "explicit",
      mode: "personal",
      version: "v1"
    }
  });

  assert.deepEqual(selection, {
    source: "explicit",
    mode: "personal",
    version: "v1",
    majorVersion: "v1"
  });
});

test("hydrateProfileSelection은 inline mode syntax를 거부한다", async () => {
  await assert.rejects(
    () => hydrateProfileSelection({
      role: "publisher",
      selection: {
        source: "explicit",
        mode: "personal@v1",
        version: "v1"
      }
    }),
    (error) => error.code === "INVALID_PROFILE_MODE"
  );
});

test("loadActiveProfile은 registry 없이 main/profiles 경로에서 profile과 template content를 직접 읽는다", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch({
    [`${RAW_BASE_URL}profiles/publisher/personal/v1/profile.json`]: JSON.stringify({
      id: "publisher/personal/v1",
      extends: ["shared/personal/v1"],
      commands: {
        component: {
          description: "component",
          render: {
            templateFile: "templates/component.default.tsx"
          }
        }
      }
    }),
    [`${RAW_BASE_URL}profiles/shared/personal/v1/profile.json`]: JSON.stringify({
      id: "shared/personal/v1",
      commands: {
        function: {
          namingPolicy: {
            prefixes: {
              internalHandler: "handle"
            }
          }
        }
      }
    }),
    [`${RAW_BASE_URL}profiles/publisher/personal/v1/templates/component.default.tsx`]: "export default {{componentName}};"
  });

  const { profile, activeProfile } = await loadActiveProfile({
    role: "publisher",
    mode: "personal",
    version: "v1"
  });

  assert.equal(activeProfile.version, "v1");
  assert.equal(profile.commands.component.render.templateContent, "export default {{componentName}};");
  assert.equal(
    profile.commands.function.namingPolicy.prefixes.internalHandler,
    "handle"
  );

  globalThis.fetch = originalFetch;
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { normalizeSpec, renderSnippet } from "../src/core/execution/spec-normalizer.mjs";
import { validateRequest } from "../src/core/validation/profile-validator.mjs";
import { loadActiveProfile } from "../src/core/profiles/profile-loader.mjs";
import { loadProfile, projectRoot } from "./test-utils.mjs";

function cloneCommand(command) {
  return JSON.parse(JSON.stringify(command));
}

test("internalHandlerPrefix를 바꾸면 function 정규화 결과가 바뀐다", async () => {
  const profile = await loadProfile("tcf");
  const command = cloneCommand(profile.commands.function);

  command.name = "function";
  command.namingPolicy.prefixes.internalHandler = "perform";

  const result = normalizeSpec({
    command,
    spec: {
      kind: "internalHandler",
      name: "onClick"
    }
  });

  assert.equal(result.normalizedSpec.name, "performClick");
});

test("propCallbackPrefix를 바꾸면 props callback 이름이 바뀐다", async () => {
  const profile = await loadProfile("tcp");
  const command = cloneCommand(profile.commands.props);

  command.name = "props";
  command.namingPolicy.prefixes.propCallback = "emit";

  const result = normalizeSpec({
    command,
    spec: {
      members: [
        {
          kind: "callback",
          name: "handleClick",
          params: []
        }
      ]
    }
  });

  assert.equal(result.normalizedSpec.members[0].name, "emitClick");
});

test("hookPrefix를 바꾸면 hook 정규화 결과가 바뀐다", async () => {
  const profile = await loadProfile("tcf");
  const command = cloneCommand(profile.commands.hook);

  command.name = "hook";
  command.namingPolicy.prefixes.hook = "load";

  const result = normalizeSpec({
    command,
    spec: {
      name: "product",
      path: "hooks/utils"
    }
  });

  assert.equal(result.normalizedSpec.name, "loadProduct");
});

test("queryKey recipe를 바꾸면 snippet output이 바뀐다", async () => {
  const profile = await loadProfile("tcf");
  const command = cloneCommand(profile.commands.queryKey);

  command.name = "queryKey";
  command.namingPolicy.suffixes.queryKeyFunction = "CacheKey";

  const { normalizedSpec } = normalizeSpec({
    command,
    spec: {
      domain: "product",
      scope: "detail",
      params: ["productId"]
    }
  });
  const snippet = await renderSnippet({
    command,
    normalizedSpec
  });

  assert.match(snippet.code, /productDetailCacheKey/);
});

test("endpoint recipe를 바꾸면 snippet output이 바뀐다", async () => {
  const profile = await loadProfile("tcf");
  const command = cloneCommand(profile.commands.endpoint);

  command.name = "endpoint";
  command.namingPolicy = {
    ...(command.namingPolicy ?? {}),
    prefixes: {
      endpointConstant: "API_"
    }
  };

  const { normalizedSpec } = normalizeSpec({
    command,
    spec: {
      method: "get",
      resource: "product",
      path: "/products/:productId"
    }
  });
  const snippet = await renderSnippet({
    command,
    normalizedSpec
  });

  assert.match(snippet.code, /API_GET_PRODUCT/);
});

test("mapper recipe를 바꾸면 snippet output이 바뀐다", async () => {
  const profile = await loadProfile("tcf");
  const command = cloneCommand(profile.commands.mapper);

  command.name = "mapper";
  command.namingPolicy.prefixes.mapper = "build";
  command.namingPolicy.joiners.mapper = "Into";

  const { normalizedSpec } = normalizeSpec({
    command,
    spec: {
      sourceType: "ProductResponse",
      targetType: "ProductViewModel"
    }
  });
  const snippet = await renderSnippet({
    command,
    normalizedSpec
  });

  assert.match(snippet.code, /buildProductResponseIntoProductViewModel/);
});

test("shared 기본 recipe는 역할 profile에서 command 단위로 override할 수 있다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-profile-override-"));

  await mkdir(path.join(tempRoot, "profiles", "shared", "personal", "v1"), {
    recursive: true
  });
  await mkdir(path.join(tempRoot, "profiles", "tcf", "personal", "v1"), {
    recursive: true
  });
  await writeFile(
    path.join(tempRoot, "profiles", "registry.json"),
    `${JSON.stringify({
      tcf: {
        personal: ["v1"]
      }
    }, null, 2)}\n`,
    "utf8"
  );

  await writeFile(
    path.join(tempRoot, "profiles", "shared", "personal", "v1", "profile.json"),
    `${JSON.stringify({
      id: "shared/personal/v1",
      extends: [],
      commands: {
        function: {
          namingPolicy: {
            prefixes: {
              internalHandler: "handle"
            }
          }
        }
      }
    }, null, 2)}\n`,
    "utf8"
  );

  await writeFile(
    path.join(tempRoot, "profiles", "tcf", "personal", "v1", "profile.json"),
    `${JSON.stringify({
      id: "tcf/personal/v1",
      extends: ["shared/personal/v1"],
      commands: {
        function: {
          namingPolicy: {
            prefixes: {
              internalHandler: "commit"
            }
          }
        }
      }
    }, null, 2)}\n`,
    "utf8"
  );

  const { profile } = await loadActiveProfile({
    alias: "tcf",
    mode: "personal",
    version: "v1",
    localProfileRoot: tempRoot
  });

  assert.equal(
    profile.commands.function.namingPolicy.prefixes.internalHandler,
    "commit"
  );
});

test("validator는 alias hardcode가 아니라 profile data를 읽는다", async () => {
  const profile = await loadProfile("tcp");
  const componentCommand = cloneCommand(profile.commands.component);

  componentCommand.name = "component";
  componentCommand.validatorRules = [
    {
      kind: "pathRoots",
      field: "path",
      allowedRoots: ["custom"]
    },
    {
      kind: "pathSegmentCase",
      field: "path",
      style: "camel",
      message: "Path segments must use camelCase"
    },
    {
      kind: "forbiddenContentPatterns",
      patterns: ["danger("]
    }
  ];

  const customProfile = {
    ...profile,
    commands: {
      ...profile.commands,
      component: componentCommand
    }
  };

  const checks = await validateRequest({
    profile: customProfile,
    commandName: "component",
    args: {
      name: "HomePage",
      path: "custom/homePage"
    },
    files: [
      {
        path: "custom/homePage/index.tsx",
        content: "const HomePage = () => { return <div />; };"
      }
    ],
    projectRoot
  });

  assert.equal(checks.ok, true);

  await assert.rejects(
    () =>
      validateRequest({
        profile: customProfile,
        commandName: "component",
        args: {
          name: "HomePage",
          path: "page/homePage"
        },
        files: [
          {
            path: "page/homePage/index.tsx",
            content: "danger(() => {});"
          }
        ],
        projectRoot
      }),
    (error) => error.code === "INVALID_PATH_ROOT"
  );
});

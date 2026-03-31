import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSpec, renderSnippet } from "../src/core/execution/spec-normalizer.mjs";
import { validateRequest } from "../src/core/validation/command-validator.mjs";
import { loadManifest, projectRoot } from "./test-utils.mjs";

function cloneCommand(command) {
  return JSON.parse(JSON.stringify(command));
}

test("internalHandlerPrefix를 바꾸면 function 정규화 결과가 바뀐다", () => {
  const manifest = loadManifest("frontend");
  const command = cloneCommand(manifest.commands.function);

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

test("propCallbackPrefix를 바꾸면 props callback 이름이 바뀐다", () => {
  const manifest = loadManifest("frontend");
  const command = cloneCommand(manifest.commands.props);

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

test("hookPrefix를 바꾸면 hook 정규화 결과가 바뀐다", () => {
  const manifest = loadManifest("frontend");
  const command = cloneCommand(manifest.commands.hook);

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
  const manifest = loadManifest("frontend");
  const command = cloneCommand(manifest.commands.queryKey);

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
  const manifest = loadManifest("frontend");
  const command = cloneCommand(manifest.commands.endpoint);

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
  const manifest = loadManifest("frontend");
  const command = cloneCommand(manifest.commands.mapper);

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

test("validator는 alias hardcode가 아니라 manifest data를 읽는다", async () => {
  const manifest = loadManifest("frontend");
  const componentCommand = cloneCommand(manifest.commands.component);

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

  const customManifest = {
    ...manifest,
    commands: {
      ...manifest.commands,
      component: componentCommand
    }
  };

  const checks = await validateRequest({
    profile: customManifest,
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
        profile: customManifest,
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

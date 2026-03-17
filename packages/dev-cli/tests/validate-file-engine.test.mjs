import test from "node:test";
import assert from "node:assert/strict";

import { validateFiles } from "../src/core/validate-file.mjs";
import { createTempRepo } from "./test-utils.mjs";

test("validateFiles는 targetRules argMapping과 fieldResolver를 함께 적용한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: [],
    files: {
      "hooks/apis/auth/mutations/usePostLogin/index.ts": `const usePostLogin = () => {
  return {};
};

export default usePostLogin;
`
    }
  });

  const profile = {
    commands: {
      apiHook: {
        fieldResolvers: [
          {
            field: "method",
            source: "namePrefixMap",
            sourceField: "name",
            prefixMap: {
              usePost: "POST",
              useGet: "GET"
            }
          }
        ],
        validatorRules: [
          {
            kind: "pathPatterns",
            field: "path",
            patterns: ["hooks/apis/{domain}/mutations"],
            code: "INVALID_API_PATH",
            message: "API hook path must be hooks/apis/{domain}/mutations"
          },
          {
            kind: "conditionalAllowedValues",
            field: "method",
            selectorFields: ["kind"],
            cases: {
              mutation: ["POST"]
            },
            code: "INVALID_API_METHOD",
            message: "Mutation API hooks must use POST"
          }
        ]
      },
      validateFile: {
        targetRules: [
          {
            commandName: "apiHook",
            match: {
              pathPatterns: ["hooks/apis/{domain}/{kindSegment=mutations}/{name}/index.ts"]
            },
            argMappings: [
              {
                field: "path",
                source: "template",
                template: "hooks/apis/{domain}/{kindSegment}",
                normalizePath: true
              },
              {
                field: "kind",
                source: "literal",
                value: "mutation"
              },
              {
                field: "name",
                source: "capture",
                capture: "name"
              }
            ],
            expectedEntryFileName: "index.ts",
            exportPolicy: {
              expectedNameField: "name"
            }
          }
        ]
      }
    }
  };

  const result = await validateFiles({
    profile,
    filePaths: ["hooks/apis/auth/mutations/usePostLogin/index.ts"],
    repoRoot: tempRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.results[0].command, "apiHook");
  assert.deepEqual(result.results[0].violations, []);
});

test("validateFiles는 discoveryRoot 스캔에서 unsupported 파일을 skip한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: [],
    files: {
      "src/widget/index.ts": `const widget = () => {
  return {};
};

export default widget;
`,
      "src/readme.ts": "export const readme = true;\n"
    }
  });

  const profile = {
    commands: {
      hook: {
        validatorRules: []
      },
      validateFile: {
        targetRules: [
          {
            commandName: "hook",
            match: {
              pathPatterns: ["src/{name}/index.ts"]
            },
            argMappings: [
              {
                field: "name",
                source: "capture",
                capture: "name"
              }
            ],
            expectedEntryFileName: "index.ts",
            exportPolicy: {
              expectedNameField: "name"
            },
            runPlacementValidation: false
          }
        ]
      }
    }
  };

  const result = await validateFiles({
    profile,
    discoveryRoot: "src",
    repoRoot: tempRoot
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.discovery, {
    root: "src",
    scanned: 2,
    matched: 1,
    skipped: 1
  });
  assert.deepEqual(result.summary, {
    total: 1,
    passed: 1,
    failed: 0
  });
  assert.equal(result.results.some((item) => item.file.endsWith("readme.ts")), false);
});

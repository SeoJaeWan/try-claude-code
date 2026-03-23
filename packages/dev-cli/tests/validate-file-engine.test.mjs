import test from "node:test";
import assert from "node:assert/strict";

import { validateFiles } from "../src/core/validation/validate-file.mjs";
import { createTempRepo } from "./test-utils.mjs";

test("validateFiles는 directory scan에서도 targetRules argMapping과 fieldResolver를 함께 적용한다", async () => {
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
    id: "frontend/personal/v1",
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
    directoryPath: "hooks",
    projectRoot: tempRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.results[0].command, "apiHook");
  assert.deepEqual(result.results[0].violations, []);
});

test("validateFiles는 supported root 아래 unsupported 파일도 결과에 포함한다", async () => {
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
    id: "frontend/personal/v1",
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
    directoryPath: "src",
    projectRoot: tempRoot
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.discovery, {
    root: "src",
    scanned: 2,
    matched: 1,
    skipped: 1
  });
  assert.deepEqual(result.summary, {
    total: 2,
    passed: 1,
    failed: 1
  });
  const unsupportedResult = result.results.find((item) => item.file === "src/readme.ts");
  assert.ok(unsupportedResult);
  assert.equal(unsupportedResult.ok, false);
  assert.equal(unsupportedResult.violations[0].code, "UNSUPPORTED_VALIDATION_TARGET");
});

test("validateFiles는 zero-match directory에 hint-rich unsupported error를 반환한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: [],
    files: {
      "docs/readme.ts": "export const readme = true;\n"
    }
  });

  const profile = {
    id: "frontend/personal/v1",
    commands: {
      validateFile: {
        unsupportedTargetMessage: "Publisher validate-file only supports declared component/page entry files.",
        contracts: {
          pathPolicy: {
            requiredPatterns: ["app/{pagePath*}/page.tsx", "components/common/{component}/index.tsx"]
          }
        },
        examples: [
          "frontend validate-file app",
          "frontend validate-file components/common"
        ],
        targetRules: [
          {
            commandName: "component",
            match: {
              pathPatterns: ["app/{pagePath*}/page.tsx"]
            },
            runPlacementValidation: false
          }
        ]
      }
    }
  };

  await assert.rejects(
    () => validateFiles({
      profile,
      directoryPath: "docs",
      projectRoot: tempRoot
    }),
    (error) =>
      error.code === "UNSUPPORTED_VALIDATION_TARGET" &&
      error.details.directory === "docs" &&
      Array.isArray(error.details.supportedPatterns) &&
      Array.isArray(error.details.exampleDirectories)
  );
});

test("validateFiles는 targetRules misconfig를 config error로 분리한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: [],
    files: {
      "app/showcase/page.tsx": `const Page = () => <section />;
export default Page;
`
    }
  });

  await assert.rejects(
    () => validateFiles({
      profile: {
        id: "frontend/personal/v1",
        commands: {
          validateFile: {
            targetRules: []
          }
        }
      },
      directoryPath: "app",
      projectRoot: tempRoot
    }),
    (error) => error.code === "VALIDATION_PROFILE_CONFIG_ERROR"
  );
});

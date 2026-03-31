/**
 * validate-file.mjs
 *
 * Frontend-local validate-file configuration.
 *
 * This module exports the validateFile command definition used in the
 * frontend manifest.  It is the authoritative source for frontend
 * validate-file target rules and validation coverage — not the legacy
 * profiles/frontend/ directory.
 */

export const validateFileCommand = {
  description: "Validate frontend UI and hook files against placement and AST rules",
  summary: {
    whenToUse: [
      "When you want to verify that generated or edited frontend files follow path and AST rules across components and hooks"
    ],
    relatedCommands: [
      { id: "component", reason: "Validate right after component generation" },
      { id: "uiState", reason: "Validate UI interaction state changes" },
      { id: "hook", reason: "Validate right after custom hook generation" },
      { id: "apiHook", reason: "Validate right after API hook generation" }
    ],
    flowRefs: ["create-component", "create-custom-hook", "create-api-hook"]
  },
  contracts: {
    inputShape: {
      directoryField: "<path>",
      directoryModes: ["positional"]
    },
    pathPolicy: {
      requiredPatterns: [
        "*/components/common/{component}/index.tsx",
        "*/components/{domain}/{component}/index.tsx",
        "*/components/{domain}/{parentComponent}/{childComponent}/index.tsx",
        "hooks/utils/{domain}/{hookName}/index.ts",
        "hooks/utils/common/{hookName}/index.ts",
        "hooks/apis/{domain}/queries/{hookName}/index.ts",
        "hooks/apis/{domain}/mutations/{hookName}/index.ts"
      ]
    },
    outputPolicy: {
      entryFilePattern: "page.tsx/index.tsx for React page/components, index.ts for hooks",
      functionStyle: "arrow",
      defaultExport: true,
      propsInterfaceSuffix: "Props"
    },
    validationCoverage: [
      "file/folder segment camelCase",
      "component path policy",
      "default export name/path match",
      "same-file JSX helper forbidden",
      "same-file subcomponent forbidden",
      "parent-only child reuse forbidden",
      "page.tsx keeps the page filename",
      "non-page React TSX files use index.tsx",
      "non-components TSX files skip components path placement validation",
      "components segment prefixes are preserved in validation and suggestions",
      "folder segment camelCase",
      "hook/apiHook path policy",
      "pure helper allowed",
      "JSX helper forbidden",
      "React component forbidden",
      "additional hook forbidden"
    ],
    logicBoundary: {
      allowedState: "UI interaction state only inside component files; business/data logic belongs in hooks",
      forbiddenPatterns: [
        "useEffect(",
        "fetch(",
        "axios.",
        "useQuery(",
        "useMutation("
      ]
    }
  },
  inputMode: "positional",
  execution: {
    kind: "analysis"
  },
  unsupportedTargetMessage:
    "Frontend validate-file only supports React page/component entries and hooks declared in the frontend manifest.",
  targetRules: [
    {
      commandName: "component",
      match: {
        pathPatterns: ["app/{pagePath*}/page.tsx"]
      },
      expectedEntryFileName: "page.tsx",
      runPlacementValidation: false,
      exportPolicy: {
        enforceExportNameMatch: false
      },
      pathRules: [
        {
          kind: "pathSegmentCase",
          style: "camel",
          skipFrameworkSpecialSegments: true,
          allowedFileBaseNames: ["page", "index"],
          fileNameStyle: "camel",
          code: "INVALID_PATH_SEGMENT",
          directoryMessage: "Frontend folder names must use camelCase",
          fileMessage:
            "Frontend file names must use camelCase, except reserved entry files like page.tsx and index.tsx"
        }
      ],
      structureRules: [
        {
          kind: "forbidJsxHelpers",
          code: "SAME_FILE_JSX_HELPER",
          message: "Frontend component file must not define JSX helpers in the same file",
          suggestionTemplate: "Move {name} into its own component folder under {entryName}"
        },
        {
          kind: "forbidSubcomponents",
          code: "SAME_FILE_SUBCOMPONENT",
          message: "Frontend component file must not define subcomponents in the same file",
          suggestionTemplate: "Move {name} into its own component folder under {entryName}"
        }
      ]
    },
    {
      commandName: "component",
      match: {
        pathPatterns: ["{prefix*}/components/{scope}/{parentComponent}/{name}/index.tsx"]
      },
      argMappings: [
        {
          field: "path",
          source: "template",
          template: "{prefix}/components/{scope}/{parentComponent}/{name}",
          normalizePath: true
        },
        {
          field: "name",
          source: "capture",
          capture: "name",
          transform: "pascal"
        }
      ],
      expectedEntryFileName: "index.tsx",
      exportPolicy: {
        expectedNameField: "name"
      },
      pathRules: [
        {
          kind: "pathSegmentCase",
          style: "camel",
          skipAfterLastSegment: "components",
          skipFrameworkSpecialSegments: true,
          allowedFileBaseNames: ["page", "index"],
          fileNameStyle: "camel",
          code: "INVALID_PATH_SEGMENT",
          directoryMessage: "Frontend folder names must use camelCase",
          fileMessage:
            "Frontend file names must use camelCase, except reserved entry files like page.tsx and index.tsx"
        }
      ],
      structureRules: [
        {
          kind: "propsTypeSuffix",
          suffix: "Props",
          code: "MISSING_PROPS_TYPE",
          message: "Component file must define the expected Props interface."
        },
        {
          kind: "forbidJsxHelpers",
          code: "SAME_FILE_JSX_HELPER",
          message: "Frontend component file must not define JSX helpers in the same file",
          suggestionTemplate: "Move {name} into its own component folder under {entryName}"
        },
        {
          kind: "forbidSubcomponents",
          code: "SAME_FILE_SUBCOMPONENT",
          message: "Frontend component file must not define subcomponents in the same file",
          suggestionTemplate: "Move {name} into its own component folder under {entryName}"
        }
      ],
      ownershipRule: {
        kind: "parentOnlyChildReuse",
        componentsRoot: "components",
        sharedSegment: "common",
        entryFileNames: ["index.tsx"],
        entryFileName: "index.tsx",
        code: "PARENT_ONLY_CHILD_REUSED",
        message: "Parent-only child component is imported outside the parent component tree"
      }
    },
    {
      commandName: "component",
      match: {
        pathPatterns: ["{prefix*}/components/{scope}/{name}/index.tsx"]
      },
      argMappings: [
        {
          field: "path",
          source: "template",
          template: "{prefix}/components/{scope}/{name}",
          normalizePath: true
        },
        {
          field: "name",
          source: "capture",
          capture: "name",
          transform: "pascal"
        }
      ],
      expectedEntryFileName: "index.tsx",
      exportPolicy: {
        expectedNameField: "name"
      },
      pathRules: [
        {
          kind: "pathSegmentCase",
          style: "camel",
          skipAfterLastSegment: "components",
          skipFrameworkSpecialSegments: true,
          allowedFileBaseNames: ["page", "index"],
          fileNameStyle: "camel",
          code: "INVALID_PATH_SEGMENT",
          directoryMessage: "Frontend folder names must use camelCase",
          fileMessage:
            "Frontend file names must use camelCase, except reserved entry files like page.tsx and index.tsx"
        }
      ],
      structureRules: [
        {
          kind: "propsTypeSuffix",
          suffix: "Props",
          code: "MISSING_PROPS_TYPE",
          message: "Component file must define the expected Props interface."
        },
        {
          kind: "forbidJsxHelpers",
          code: "SAME_FILE_JSX_HELPER",
          message: "Frontend component file must not define JSX helpers in the same file",
          suggestionTemplate: "Move {name} into its own component folder under {entryName}"
        },
        {
          kind: "forbidSubcomponents",
          code: "SAME_FILE_SUBCOMPONENT",
          message: "Frontend component file must not define subcomponents in the same file",
          suggestionTemplate: "Move {name} into its own component folder under {entryName}"
        }
      ],
      ownershipRule: {
        kind: "parentOnlyChildReuse",
        componentsRoot: "components",
        sharedSegment: "common",
        entryFileNames: ["index.tsx"],
        entryFileName: "index.tsx",
        code: "PARENT_ONLY_CHILD_REUSED",
        message: "Parent-only child component is imported outside the parent component tree"
      }
    },
    {
      commandName: "component",
      match: {
        pathPatterns: ["{path*}/{name}/index.tsx"]
      },
      argMappings: [
        {
          field: "name",
          source: "capture",
          capture: "name",
          transform: "pascal"
        }
      ],
      expectedEntryFileName: "index.tsx",
      runPlacementValidation: false,
      exportPolicy: {
        expectedNameField: "name"
      },
      pathRules: [
        {
          kind: "pathSegmentCase",
          style: "camel",
          skipFrameworkSpecialSegments: true,
          allowedFileBaseNames: ["page", "index"],
          fileNameStyle: "camel",
          code: "INVALID_PATH_SEGMENT",
          directoryMessage: "Frontend folder names must use camelCase",
          fileMessage:
            "Frontend file names must use camelCase, except reserved entry files like page.tsx and index.tsx"
        }
      ],
      structureRules: [
        {
          kind: "propsTypeSuffix",
          suffix: "Props",
          code: "MISSING_PROPS_TYPE",
          message: "Component file must define the expected Props interface."
        },
        {
          kind: "forbidJsxHelpers",
          code: "SAME_FILE_JSX_HELPER",
          message: "Frontend component file must not define JSX helpers in the same file",
          suggestionTemplate: "Move {name} into its own component folder under {entryName}"
        },
        {
          kind: "forbidSubcomponents",
          code: "SAME_FILE_SUBCOMPONENT",
          message: "Frontend component file must not define subcomponents in the same file",
          suggestionTemplate: "Move {name} into its own component folder under {entryName}"
        }
      ]
    },
    {
      commandName: "component",
      match: {
        extensions: [".tsx"],
        excludeFileNames: ["page.tsx", "index.tsx"]
      },
      argMappings: [
        {
          field: "name",
          source: "fileName",
          withoutExtension: true,
          transform: "pascal"
        }
      ],
      expectedEntryFileName: "index.tsx",
      runPlacementValidation: false,
      exportPolicy: {
        expectedNameField: "name"
      },
      pathRules: [
        {
          kind: "pathSegmentCase",
          style: "camel",
          skipFrameworkSpecialSegments: true,
          allowedFileBaseNames: ["page", "index"],
          fileNameStyle: "camel",
          code: "INVALID_PATH_SEGMENT",
          directoryMessage: "Frontend folder names must use camelCase",
          fileMessage:
            "Frontend file names must use camelCase, except reserved entry files like page.tsx and index.tsx"
        }
      ],
      structureRules: [
        {
          kind: "propsTypeSuffix",
          suffix: "Props",
          code: "MISSING_PROPS_TYPE",
          message: "Component file must define the expected Props interface."
        },
        {
          kind: "forbidJsxHelpers",
          code: "SAME_FILE_JSX_HELPER",
          message: "Frontend component file must not define JSX helpers in the same file",
          suggestionTemplate: "Move {name} into its own component folder under {entryName}"
        },
        {
          kind: "forbidSubcomponents",
          code: "SAME_FILE_SUBCOMPONENT",
          message: "Frontend component file must not define subcomponents in the same file",
          suggestionTemplate: "Move {name} into its own component folder under {entryName}"
        }
      ]
    },
    {
      commandName: "hook",
      match: {
        pathPatterns: ["hooks/utils/{domain}/{name}/index.ts"]
      },
      argMappings: [
        {
          field: "path",
          source: "template",
          template: "hooks/utils/{domain}",
          normalizePath: true
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
      },
      structureRules: [
        {
          kind: "forbidAdditionalHooks",
          code: "ADDITIONAL_HOOK_DECLARATION",
          message: "Hook entry file must not define additional hooks"
        },
        {
          kind: "forbidJsxHelpers",
          code: "JSX_HELPER_IN_HOOK_FILE",
          message: "Hook entry file must not define JSX-returning helpers"
        },
        {
          kind: "forbidReactComponents",
          code: "REACT_COMPONENT_IN_HOOK_FILE",
          message: "Hook entry file must not define React components"
        }
      ]
    },
    {
      commandName: "apiHook",
      match: {
        pathPatterns: ["hooks/apis/{domain}/{kindSegment=queries|mutations}/{name}/index.ts"]
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
          source: "capture",
          capture: "kindSegment",
          map: { queries: "query", mutations: "mutation" }
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
      },
      structureRules: [
        {
          kind: "forbidAdditionalHooks",
          code: "ADDITIONAL_HOOK_DECLARATION",
          message: "Hook entry file must not define additional hooks"
        },
        {
          kind: "forbidJsxHelpers",
          code: "JSX_HELPER_IN_HOOK_FILE",
          message: "Hook entry file must not define JSX-returning helpers"
        },
        {
          kind: "forbidReactComponents",
          code: "REACT_COMPONENT_IN_HOOK_FILE",
          message: "Hook entry file must not define React components"
        }
      ]
    }
  ],
  examples: [
    "frontend validate-file components/common",
    "frontend validate-file hooks",
    "frontend validate-file app"
  ]
};

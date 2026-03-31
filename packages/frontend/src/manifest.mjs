/**
 * manifest.mjs
 *
 * Frontend package-owned CliManifest.
 *
 * This is the single source of truth for the frontend command catalog.
 * It replaces the legacy profiles/frontend/personal/v1/profile.json path.
 *
 * Template paths are resolved relative to this file using import.meta.url
 * so that the published package works correctly regardless of where it is
 * installed.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateFileCommand } from "./validators/validate-file.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function t(relativePath) {
  return path.join(__dirname, relativePath);
}

/** @type {import("@seojaewan/dev-cli-core").CliManifest} */
export const manifest = {
  id: "frontend/personal/v1",
  alias: "frontend",

  helpSummary: {
    summary:
      "Frontend personal v1 rules for UI components, interaction state, hooks, API hooks, and frontend snippets.",
    flows: {
      "create-component": {
        title: "Create a new UI component",
        summary:
          "Create the component file, optionally add UI interaction state, then validate the result.",
        steps: [
          { command: "component", purpose: "Generate the component file" },
          { command: "uiState", purpose: "Generate toggle/open/close state shells when needed" },
          { command: "validateFile", purpose: "Validate placement and AST rules" }
        ]
      },
      "create-custom-hook": {
        title: "Create a custom hook",
        summary: "Create the hook file, then validate path and AST rules with validate-file.",
        steps: [
          { command: "hook", purpose: "Generate the custom hook file" },
          { command: "validateFile", purpose: "Validate path and AST rules" }
        ]
      },
      "create-api-hook": {
        title: "Create a TanStack Query hook",
        summary:
          "Combine query-key, endpoint, api-hook, mapper, and hook-return to shape an API hook, then finish with validate-file.",
        steps: [
          { command: "queryKey", purpose: "Generate the query key shell" },
          { command: "endpoint", purpose: "Generate the endpoint constant shell" },
          { command: "apiHook", purpose: "Generate the TanStack Query hook file" },
          { command: "mapper", purpose: "Generate the response mapping shell" },
          { command: "hookReturn", purpose: "Define the return object shape" },
          { command: "validateFile", purpose: "Validate the final hook structure" }
        ]
      }
    }
  },

  rules: {
    guidance: {
      placementRules: [
        "Use */components/common/{component} when reused in 2 or more page domains.",
        "Use */components/{domain}/{component} for domain-specific components.",
        "Nested UI parts may live under the parent component folder."
      ],
      pathPolicy: {
        requiredPatterns: [
          "*/components/common/{component}",
          "*/components/{domain}/{component}"
        ],
        componentsSegmentPolicy:
          "the final components segment is the root for placement rules; prefixes like src/ or features/{feature}/ are allowed",
        domainPolicy:
          "domain is the root page segment from app/{domain}; use common only for components shared across multiple page domains",
        domainExamples: {
          "app/login/page.tsx": "login",
          "app/signup/page.tsx": "signup",
          "app/profile/page.tsx": "profile"
        }
      }
    },
    frontendGuidance: {
      hookPathRoots: ["hooks/utils/{domain}", "hooks/utils/common"],
      apiHookPathRoots: [
        "hooks/apis/{domain}/queries",
        "hooks/apis/{domain}/mutations"
      ]
    },
    enforced: {
      folderCase: "camelCase",
      functionStyle: "arrow",
      handlerNaming: {
        internal: "^handle[A-Z].*$",
        propCallback: "^on[A-Z].*$"
      },
      arrayNaming: {
        pluralRequired: true,
        forbiddenSuffixes: ["List", "Array"]
      },
      typeNaming: {
        interface: "PascalCase",
        typeAlias: "PascalCase"
      },
      typePlacement: {
        localSingleUse: "same-file-or-local-folder",
        globalSharedRoots: ["types/common", "types/{domain}"]
      }
    }
  },

  commands: {
    validateFile: validateFileCommand,

    component: {
      description: "Generate a frontend UI component file",
      summary: {
        whenToUse: [
          "When you need a new UI component shell",
          "When you need to move a legacy component to the current path convention"
        ],
        relatedCommands: [
          { id: "validateFile", reason: "Validate after generation" },
          { id: "uiState", reason: "Add a UI interaction state shell" }
        ],
        flowRefs: ["create-component"]
      },
      contracts: {
        componentKind: "ui",
        pathPolicy: {
          requiredPatterns: [
            "*/components/common/{component}",
            "*/components/{domain}/{component}"
          ],
          sharedPattern: "*/components/common/{component}",
          domainPattern: "*/components/{domain}/{component}",
          nestedPattern: "*/components/{domain}/{parentComponent}/{childComponent}",
          componentsSegmentPolicy:
            "the final components segment is the root for placement rules; prefixes like src/ or features/{feature}/ are allowed",
          domainPolicy:
            "domain is the root page segment from app/{domain}; use common only for components shared across multiple page domains",
          placementDecision:
            "common is only for components reused in 2 or more root page domains; otherwise choose the single matching domain path",
          legacyPolicy:
            "if a legacy component path differs from the current convention, migrate the path first; if it already matches, keep the path and only update internals",
          domainExamples: {
            "app/login/page.tsx": "login",
            "app/signup/page.tsx": "signup",
            "app/profile/page.tsx": "profile"
          }
        },
        outputPolicy: {
          filePattern: "{path}/index.tsx",
          functionStyle: "arrow",
          defaultExport: true,
          propsInterfaceSuffix: "Props"
        },
        logicBoundary: {
          allowedState: "UI interaction state only",
          forbiddenPatterns: [
            "useEffect(",
            "fetch(",
            "axios.",
            "useQuery(",
            "useMutation("
          ]
        }
      },
      inputMode: "json",
      execution: { kind: "file" },
      inputSchema: {
        required: ["name", "path"],
        arrays: ["props"]
      },
      defaults: {
        role: "component",
        props: []
      },
      namingPolicy: {
        suffixes: { interfaceName: "Props" }
      },
      generator: { kind: "singleFile" },
      normalizationRules: [
        { kind: "case", field: "name", style: "pascal", reason: "components use PascalCase" },
        { kind: "path", field: "path" },
        {
          kind: "members",
          field: "props",
          callbackPrefixKey: "propCallback",
          callbackCase: "pascal",
          valueCase: "camel",
          callbackReason: "props callbacks use on*",
          valueReason: "prop members use camelCase"
        }
      ],
      validatorRules: [
        {
          kind: "pathRoots",
          field: "path",
          allowedRoots: ["components"],
          matchAnySegment: true
        },
        {
          kind: "pathSegmentCase",
          field: "path",
          style: "camel",
          message: "Path segments must use camelCase"
        },
        {
          kind: "pathPatterns",
          field: "path",
          patterns: [
            "{prefix*}/components/common/{component}",
            "{prefix*}/components/{domain}/{component}",
            "{prefix*}/components/{scope}/{parentComponent}/{component}"
          ],
          code: "INVALID_COMPONENT_PATH",
          message:
            "Frontend component path must live under a components segment using */components/common/{component}, */components/{domain}/{component}, or a direct child under the component folder"
        },
        {
          kind: "nameCase",
          field: "name",
          style: "pascal",
          message: "Component name must use PascalCase"
        },
        {
          kind: "forbiddenContentPatterns",
          patterns: [
            "useEffect(",
            "fetch(",
            "axios.",
            "useQuery(",
            "useMutation("
          ]
        }
      ],
      render: {
        templatePath: t("templates/component.default.tsx"),
        output: { filePattern: "{path}/index.tsx" },
        contextTokens: ["interfaceName", "componentName", "propsMembers"]
      },
      examples: [
        "frontend component --json '{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\"}'",
        "frontend component --json '{\"name\":\"ReviewCard\",\"path\":\"src/components/common/reviewCard\"}'",
        "frontend component --json '{\"name\":\"ProfileHeader\",\"path\":\"features/account/components/profile/profileHeader\"}'"
      ]
    },

    uiState: {
      description: "Render UI interaction state and handlers snippet",
      summary: {
        whenToUse: [
          "When you need interaction state shells for UI like a modal, drawer, or dropdown"
        ],
        relatedCommands: [
          { id: "component", reason: "Apply the generated state to the component" },
          { id: "validateFile", reason: "Validate the structure after the interaction change" }
        ],
        flowRefs: ["create-component"]
      },
      contracts: {
        stateKind: "uiInteraction",
        allowedPatterns: ["toggle", "default"],
        namingPolicy: {
          state: "is{Name}Open",
          setter: "setIs{Name}Open",
          toggleHandler: "handleToggle{Name}",
          openHandler: "handleOpen{Name}",
          closeHandler: "handleClose{Name}"
        }
      },
      inputMode: "json",
      execution: { kind: "snippet", language: "ts" },
      inputSchema: { required: ["name"] },
      defaults: {
        category: "uiInteraction",
        pattern: "toggle",
        initial: false
      },
      namingPolicy: {
        prefixes: {
          uiStateBoolean: "is",
          uiStateSetter: "setIs",
          uiStateToggleHandler: "handleToggle",
          uiStateOpenHandler: "handleOpen",
          uiStateCloseHandler: "handleClose"
        },
        suffixes: { uiState: "Open" }
      },
      normalizationRules: [
        { kind: "case", field: "name", style: "camel", reason: "ui state names use camelCase" }
      ],
      render: {
        templatePaths: {
          toggle: t("templates/ui-state.toggle.ts"),
          default: t("templates/ui-state.default.ts")
        },
        templateVariantField: "pattern",
        templateVariantMap: { toggle: "toggle" },
        defaultVariant: "default",
        contextTokens: [
          "uiStateName",
          "uiStateSetterName",
          "uiStateToggleHandlerName",
          "uiStateOpenHandlerName",
          "uiStateCloseHandlerName",
          "initial"
        ]
      },
      examples: [
        "frontend uiState --json '{\"category\":\"uiInteraction\",\"pattern\":\"toggle\",\"name\":\"menu\"}'"
      ]
    },

    hook: {
      description: "Generate a non-API hook file",
      summary: {
        whenToUse: [
          "When you want to extract reusable non-API frontend logic into a hook"
        ],
        relatedCommands: [
          { id: "validateFile", reason: "Validate path and AST rules after generation" },
          { id: "function", reason: "Define internal handlers or utility shells" }
        ],
        flowRefs: ["create-custom-hook"]
      },
      contracts: {
        hookKind: "custom",
        pathPolicy: {
          allowedPatterns: ["hooks/utils/{domain}", "hooks/utils/common"],
          forbiddenExamples: ["hooks/login", "app/login/hooks", "components/toggle/hooks"],
          domainPolicy:
            "domain is the root page segment from app/{domain}; use common only for hooks shared across multiple page domains",
          domainExamples: {
            "app/login/page.tsx": "login",
            "app/signup/page.tsx": "signup",
            "app/profile/page.tsx": "profile"
          }
        },
        namingPolicy: {
          requiredPrefix: "use",
          requiredPattern: "^use[A-Z][A-Za-z0-9]*$"
        }
      },
      inputMode: "json",
      execution: { kind: "file" },
      inputSchema: { required: ["name", "path"] },
      namingPolicy: { prefixes: { hook: "use" } },
      fieldResolvers: [],
      generator: { kind: "singleFile" },
      normalizationRules: [
        {
          kind: "prefixedName",
          field: "name",
          prefixKey: "hook",
          style: "pascal",
          reason: "hooks use use*"
        },
        { kind: "path", field: "path" }
      ],
      validatorRules: [
        { kind: "pathRoots", field: "path", allowedRoots: ["hooks"] },
        {
          kind: "pathSegmentCase",
          field: "path",
          style: "camel",
          message: "Path segments must use camelCase"
        },
        {
          kind: "namePrefix",
          field: "name",
          prefixKey: "hook",
          message: "Hook name must start with use"
        },
        {
          kind: "pathPatterns",
          field: "path",
          patterns: ["hooks/utils/{domain}"],
          code: "INVALID_HOOK_PATH",
          message: "Custom hook path must be hooks/utils/{domain} or hooks/utils/common"
        }
      ],
      render: {
        templatePath: t("templates/hook.default.ts"),
        output: { filePattern: "{path}/{name}/index.ts" },
        contextTokens: ["hookName"]
      },
      examples: [
        "frontend hook --json '{\"name\":\"useScroll\",\"path\":\"hooks/utils/common\"}'"
      ]
    },

    apiHook: {
      description: "Generate a TanStack Query API hook file",
      summary: {
        whenToUse: ["When you need a TanStack Query-based server request hook"],
        relatedCommands: [
          { id: "queryKey", reason: "Define the query key shell" },
          { id: "endpoint", reason: "Define the resource and path constants" },
          { id: "mapper", reason: "Map the response into a view model" },
          { id: "hookReturn", reason: "Define the hook return shape" },
          { id: "validateFile", reason: "Validate path and AST rules after generation" }
        ],
        flowRefs: ["create-api-hook"]
      },
      contracts: {
        hookKind: "api",
        pathPolicy: {
          requiredPattern: "hooks/apis/{domain}/{queries|mutations}",
          domainPolicy: "domain is the root page segment from app/{domain}",
          domainExamples: {
            "app/login/page.tsx": "login",
            "app/signup/page.tsx": "signup",
            "app/profile/page.tsx": "profile"
          },
          kindSegments: { query: "queries", mutation: "mutations" }
        },
        methodPolicy: {
          query: { requiredMethod: "GET" },
          mutation: { allowedMethods: ["POST", "PUT", "PATCH", "DELETE"] }
        },
        namingPolicy: {
          queryPattern: "^useGet[A-Z][A-Za-z0-9]*$",
          mutationPatterns: {
            POST: "^usePost[A-Z][A-Za-z0-9]*$",
            PUT: "^usePut[A-Z][A-Za-z0-9]*$",
            PATCH: "^usePatch[A-Z][A-Za-z0-9]*$",
            DELETE: "^useDelete[A-Z][A-Za-z0-9]*$"
          },
          forbiddenPrefixes: ["useFetch", "useSave", "useSubmit"]
        }
      },
      inputMode: "json",
      execution: { kind: "file" },
      inputSchema: {
        required: ["name", "path", "kind"],
        enums: { kind: ["query", "mutation"] }
      },
      namingPolicy: { prefixes: { hook: "use" } },
      fieldResolvers: [
        {
          field: "method",
          source: "namePrefixMap",
          sourceField: "name",
          prefixMap: {
            usePost: "POST",
            usePut: "PUT",
            usePatch: "PATCH",
            useDelete: "DELETE",
            useGet: "GET"
          }
        }
      ],
      generator: { kind: "singleFile" },
      normalizationRules: [
        {
          kind: "prefixedName",
          field: "name",
          prefixKey: "hook",
          style: "pascal",
          reason: "hooks use use*"
        },
        { kind: "uppercase", field: "method", reason: "HTTP method uses uppercase" },
        { kind: "path", field: "path" }
      ],
      validatorRules: [
        { kind: "pathRoots", field: "path", allowedRoots: ["hooks"] },
        {
          kind: "pathSegmentCase",
          field: "path",
          style: "camel",
          message: "Path segments must use camelCase"
        },
        {
          kind: "namePrefix",
          field: "name",
          prefixKey: "hook",
          message: "Hook name must start with use"
        },
        {
          kind: "conditionalAllowedValues",
          field: "method",
          selectorFields: ["kind"],
          cases: { query: ["GET"], mutation: ["POST", "PUT", "PATCH", "DELETE"] },
          code: "INVALID_API_METHOD",
          message: "API hook method does not match the selected hook kind.",
          unsupportedMessage: "Unsupported API hook kind"
        },
        {
          kind: "pathPatterns",
          field: "path",
          patterns: [
            "hooks/apis/{domain}/queries",
            "hooks/apis/{domain}/mutations"
          ],
          code: "INVALID_API_PATH",
          message:
            "API hook path must be hooks/apis/{domain}/queries or hooks/apis/{domain}/mutations"
        },
        {
          kind: "forbiddenPrefixes",
          field: "name",
          prefixes: ["useFetch", "useSave", "useSubmit"],
          code: "INVALID_HOOK_NAME",
          message: "API hook name must not use a forbidden prefix."
        },
        {
          kind: "fieldPattern",
          field: "name",
          selectorFields: ["kind", "method"],
          cases: {
            "query:GET": "^useGet[A-Z][A-Za-z0-9]*$",
            "mutation:POST": "^usePost[A-Z][A-Za-z0-9]*$",
            "mutation:PUT": "^usePut[A-Z][A-Za-z0-9]*$",
            "mutation:PATCH": "^usePatch[A-Z][A-Za-z0-9]*$",
            "mutation:DELETE": "^useDelete[A-Z][A-Za-z0-9]*$"
          },
          code: "INVALID_HOOK_NAME",
          message: "API hook name does not match the required REST naming policy.",
          unsupportedMessage: "Unsupported API hook naming policy"
        }
      ],
      render: {
        templatePaths: {
          query: t("templates/api-hook.query.ts"),
          mutation: t("templates/api-hook.mutation.ts")
        },
        templateVariantField: "kind",
        output: { filePattern: "{path}/{name}/index.ts" },
        contextTokens: ["hookName", "domainName"]
      },
      examples: [
        "frontend apiHook --json '{\"name\":\"useGetProduct\",\"path\":\"hooks/apis/product/queries\",\"kind\":\"query\",\"method\":\"GET\"}'"
      ]
    },

    queryKey: {
      description: "Render a TanStack Query key snippet",
      summary: {
        whenToUse: ["When you need a query key shell for a query hook"],
        relatedCommands: [
          { id: "apiHook", reason: "Generate the query hook file" },
          { id: "endpoint", reason: "Define the endpoint constant for the same request" }
        ],
        flowRefs: ["create-api-hook"]
      },
      inputMode: "json",
      execution: { kind: "snippet", language: "ts" },
      inputSchema: { required: ["domain"], arrays: ["params"] },
      defaults: { scope: "detail", params: [] },
      namingPolicy: { suffixes: { queryKeyFunction: "QueryKey" } },
      normalizationRules: [
        { kind: "case", field: "domain", style: "camel", reason: "query key domain uses camelCase" },
        { kind: "case", field: "scope", style: "camel", reason: "query key scope uses camelCase" },
        {
          kind: "stringList",
          field: "params",
          style: "camel",
          reason: "query key params use camelCase"
        }
      ],
      render: {
        snippetTemplatePath: t("templates/query-key.ts"),
        contextTokens: ["queryKeyFunctionName", "queryKeyParamsSignature", "queryKeyMembers"]
      },
      examples: [
        "frontend queryKey --json '{\"domain\":\"product\",\"scope\":\"detail\",\"params\":[\"productId\"]}'"
      ]
    },

    endpoint: {
      description: "Render an API endpoint constant snippet",
      summary: {
        whenToUse: ["When you want to define API resource, method, and path constants first"],
        relatedCommands: [
          { id: "apiHook", reason: "Generate the hook that uses the endpoint" },
          { id: "queryKey", reason: "Define the query key for the same request" }
        ],
        flowRefs: ["create-api-hook"]
      },
      inputMode: "json",
      execution: { kind: "snippet", language: "ts" },
      inputSchema: { required: ["method", "resource", "path"] },
      normalizationRules: [
        { kind: "uppercase", field: "method", reason: "HTTP method uses uppercase" },
        { kind: "case", field: "resource", style: "camel", reason: "endpoint resource uses camelCase" },
        { kind: "derive", field: "constantName", kindName: "httpConstant" }
      ],
      render: {
        snippetTemplatePath: t("templates/endpoint.ts"),
        contextTokens: ["endpointConstantName", "path"]
      },
      examples: [
        "frontend endpoint --json '{\"method\":\"GET\",\"resource\":\"product\",\"path\":\"/products/:productId\"}'"
      ]
    },

    mapper: {
      description: "Render a mapper function snippet",
      summary: {
        whenToUse: [
          "When you need a helper shell that maps an API response into a view model"
        ],
        relatedCommands: [
          { id: "apiHook", reason: "Generate a hook that needs response mapping" },
          { id: "hookReturn", reason: "Define the final return shape" }
        ],
        flowRefs: ["create-api-hook"]
      },
      inputMode: "json",
      execution: { kind: "snippet", language: "ts" },
      inputSchema: { required: ["sourceType", "targetType"] },
      namingPolicy: {
        prefixes: { mapper: "map" },
        joiners: { mapper: "To" }
      },
      normalizationRules: [
        {
          kind: "derive",
          field: "name",
          kindName: "mapperName",
          reason: "mapper names use camelCase"
        }
      ],
      render: {
        snippetTemplatePath: t("templates/mapper.ts"),
        contextTokens: ["mapperName", "sourceType", "targetType"]
      },
      examples: [
        "frontend mapper --json '{\"sourceType\":\"ProductResponse\",\"targetType\":\"ProductViewModel\"}'"
      ]
    },

    hookReturn: {
      description: "Render a hook return snippet",
      summary: {
        whenToUse: ["When you want to define the values and actions returned by a hook"],
        relatedCommands: [
          { id: "apiHook", reason: "Generate the hook file to implement" },
          { id: "mapper", reason: "Define response mapping before returning" }
        ],
        flowRefs: ["create-api-hook"]
      },
      inputMode: "json",
      execution: { kind: "snippet", language: "ts" },
      inputSchema: { arrays: ["values", "actions"] },
      defaults: { values: [], actions: [] },
      normalizationRules: [
        {
          kind: "listItemNames",
          field: "values",
          style: "camel",
          reason: "hook return values use camelCase"
        },
        {
          kind: "listItemNames",
          field: "actions",
          style: "camel",
          reason: "hook return actions use camelCase"
        }
      ],
      render: {
        snippetTemplatePath: t("templates/hook-return.ts"),
        contextTokens: ["hookReturnMembers"]
      },
      examples: [
        "frontend hookReturn --json '{\"values\":[{\"name\":\"product\",\"type\":\"ProductViewModel | null\"}],\"actions\":[{\"name\":\"refetch\",\"type\":\"() => Promise<void>\"}]}'"
      ]
    },

    // ---- shared commands (from shared/personal/v1) ----

    type: {
      description: "Render a shared type snippet",
      summary: {
        whenToUse: [
          "When you need a new interface or type alias shell",
          "When you want to lock the type shape before implementation"
        ],
        relatedCommands: [
          { id: "props", reason: "Continue with the props member shell" },
          { id: "function", reason: "Continue with the function signature shell" }
        ]
      },
      inputMode: "json",
      execution: { kind: "snippet", language: "ts" },
      inputSchema: {
        required: ["name"],
        enums: { kind: ["interface", "type"] }
      },
      defaults: { kind: "interface" },
      namingPolicy: { cases: { typeName: "pascal" } },
      normalizationRules: [
        { kind: "case", field: "name", style: "pascal", reason: "types use PascalCase" }
      ],
      validatorRules: [
        {
          kind: "nameCase",
          field: "name",
          style: "pascal",
          message: "Type name must use PascalCase"
        }
      ],
      render: {
        templatePaths: {
          interface: t("templates/type.interface.ts"),
          type: t("templates/type.alias.ts")
        },
        templateVariantField: "kind",
        contextTokens: ["typeName"]
      },
      examples: [
        "frontend type --json {\"name\":\"TableColumn\",\"kind\":\"interface\"}",
        "frontend type --json {\"name\":\"ProductSummary\",\"kind\":\"type\"}"
      ]
    },

    props: {
      description: "Render props members only snippet",
      summary: {
        whenToUse: [
          "When you want to define only the props members for a component or hook first"
        ],
        relatedCommands: [
          { id: "type", reason: "Define the type shell referenced by props" },
          { id: "function", reason: "Define the callback signature shell" }
        ]
      },
      inputMode: "json",
      execution: { kind: "snippet", language: "ts" },
      inputSchema: { arrays: ["members"] },
      defaults: { members: [] },
      namingPolicy: {
        prefixes: { propCallback: "on" },
        cases: { propValue: "camel", propCallback: "pascal" }
      },
      normalizationRules: [
        {
          kind: "members",
          field: "members",
          callbackPrefixKey: "propCallback",
          callbackCase: "pascal",
          valueCase: "camel",
          callbackReason: "props callbacks use on*",
          valueReason: "prop members use camelCase"
        }
      ],
      render: {
        snippetTemplatePath: t("templates/props.members.ts"),
        contextTokens: ["membersOnly"]
      },
      examples: [
        "frontend props --json {\"members\":[{\"kind\":\"value\",\"name\":\"title\",\"type\":\"string\",\"required\":true}]}"
      ]
    },

    function: {
      description: "Render a shared function snippet",
      summary: {
        whenToUse: ["When you need an internal handler or utility function shell"],
        relatedCommands: [
          { id: "type", reason: "Define parameter and return type shells" }
        ]
      },
      inputMode: "json",
      execution: { kind: "snippet", language: "ts" },
      inputSchema: {
        requiredAny: [["name", "action"]],
        arrays: ["params"],
        enums: { kind: ["internalHandler", "utility"] }
      },
      defaults: {
        kind: "utility",
        returns: "void",
        async: false,
        params: []
      },
      namingPolicy: {
        prefixes: { internalHandler: "handle", propCallback: "on" },
        cases: { utility: "camel", internalHandler: "pascal" }
      },
      normalizationRules: [
        {
          kind: "intentName",
          field: "name",
          intentField: "kind",
          actionField: "action",
          intents: {
            internalHandler: {
              prefixKey: "internalHandler",
              stripPrefixKeys: ["propCallback"],
              style: "pascal",
              reason: "internal handlers use handle*"
            },
            utility: {
              style: "camel",
              reason: "utility functions use camelCase"
            }
          }
        }
      ],
      render: {
        snippetTemplatePath: t("templates/function.default.ts"),
        contextTokens: [
          "functionName",
          "asyncToken",
          "functionSignature",
          "functionReturnType"
        ]
      },
      examples: [
        "frontend function --json {\"kind\":\"internalHandler\",\"name\":\"onClick\"}"
      ]
    }
  }
};

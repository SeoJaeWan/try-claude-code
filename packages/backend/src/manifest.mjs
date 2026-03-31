/**
 * manifest.mjs
 *
 * Backend package-owned CliManifest.
 *
 * This is the single source of truth for the backend command catalog.
 * It replaces the legacy profiles/backend/personal/v1/profile.json path.
 *
 * Template paths are resolved relative to this file using import.meta.url
 * so that the published package works correctly regardless of where it is
 * installed.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function t(relativePath) {
  return path.join(__dirname, relativePath);
}

/** @type {import("@seojaewan/dev-cli-core").CliManifest} */
export const manifest = {
  id: "backend/personal/v1",
  alias: "backend",

  helpSummary: {
    summary: "Backend personal v1 rules for Spring Boot file generation.",
    flows: {
      "create-spring-feature": {
        title: "Create a Spring feature package",
        summary: "Create the module skeleton, then add request-dto, response-dto, and entity files.",
        steps: [
          { command: "module", purpose: "Generate controller, service, and repository skeletons" },
          { command: "requestDto", purpose: "Generate the request DTO" },
          { command: "responseDto", purpose: "Generate the response DTO" },
          { command: "entity", purpose: "Generate the entity shell" }
        ]
      }
    }
  },

  metadata: {
    sourceBackedDefaults: [
      "Avoid the default package and keep the application class at the root package.",
      "Use @Valid for request validation.",
      "Use @ControllerAdvice and ResponseEntityExceptionHandler for REST errors."
    ],
    inferredChoices: [
      "Use package-by-feature.",
      "Split feature packages into controller, service, dto, entity, repository."
    ]
  },

  commands: {
    module: {
      description: "Generate a Spring feature module skeleton",
      summary: {
        whenToUse: [
          "When you need a new Spring feature package skeleton"
        ],
        relatedCommands: [
          { id: "requestDto", reason: "Generate the request DTO" },
          { id: "responseDto", reason: "Generate the response DTO" },
          { id: "entity", reason: "Generate the entity shell" }
        ],
        flowRefs: ["create-spring-feature"]
      },
      inputMode: "json",
      execution: { kind: "file" },
      inputSchema: {
        required: ["name", "path"]
      },
      fieldResolvers: [
        {
          field: "basePackage",
          source: "detector",
          detector: "springBasePackage",
          code: "ROOT_PACKAGE_NOT_FOUND",
          message: "Spring root package could not be detected. Provide basePackage in the JSON spec.",
          details: { command: "module" }
        }
      ],
      generator: {
        kind: "multiFile",
        requiresBasePackage: true
      },
      normalizationRules: [
        { kind: "case", field: "name", style: "pascal", reason: "classes use PascalCase" },
        { kind: "path", field: "path" }
      ],
      validatorRules: [
        {
          kind: "nameCase",
          field: "name",
          style: "pascal",
          message: "Class name must use PascalCase"
        },
        {
          kind: "pathSegmentCase",
          field: "path",
          style: "lower",
          code: "INVALID_PACKAGE_SEGMENT",
          message: "Backend package segments must use lower-case"
        }
      ],
      render: {
        templatePaths: {
          controller: t("templates/module.controller.java"),
          service: t("templates/module.service.java"),
          repository: t("templates/module.repository.java"),
          globalExceptionHandler: t("templates/module.global-exception-handler.java")
        },
        fileEntries: [
          {
            templateKey: "controller",
            filePattern: "src/main/java/{basePackagePath}/{path}/controller/{name}Controller.java"
          },
          {
            templateKey: "service",
            filePattern: "src/main/java/{basePackagePath}/{path}/service/{name}Service.java"
          },
          {
            templateKey: "repository",
            filePattern: "src/main/java/{basePackagePath}/{path}/repository/{name}Repository.java"
          },
          {
            templateKey: "globalExceptionHandler",
            filePattern: "src/main/java/{basePackagePath}/global/exception/GlobalExceptionHandler.java"
          }
        ],
        contextTokens: [
          "className",
          "featurePackage",
          "featurePath",
          "basePackage",
          "packagePathDot",
          "basePackagePath"
        ]
      },
      examples: [
        "backend module --json '{\"name\":\"Product\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}'"
      ]
    },

    requestDto: {
      description: "Generate a Spring request DTO",
      summary: {
        whenToUse: [
          "When you need a request DTO for controller input"
        ],
        relatedCommands: [
          { id: "module", reason: "Generate the skeleton for the same feature" },
          { id: "responseDto", reason: "Define the response DTO together" },
          { id: "entity", reason: "Generate the domain entity shell" }
        ],
        flowRefs: ["create-spring-feature"]
      },
      inputMode: "json",
      execution: { kind: "file" },
      inputSchema: {
        required: ["name", "path"],
        arrays: ["fields"]
      },
      defaults: { fields: [] },
      fieldResolvers: [
        {
          field: "basePackage",
          source: "detector",
          detector: "springBasePackage",
          code: "ROOT_PACKAGE_NOT_FOUND",
          message: "Spring root package could not be detected. Provide basePackage in the JSON spec.",
          details: { command: "requestDto" }
        }
      ],
      generator: {
        kind: "singleFile",
        requiresBasePackage: true
      },
      normalizationRules: [
        { kind: "case", field: "name", style: "pascal", reason: "classes use PascalCase" },
        { kind: "path", field: "path" },
        { kind: "listItemNames", field: "fields", style: "camel", reason: "field names use camelCase" }
      ],
      validatorRules: [
        {
          kind: "nameCase",
          field: "name",
          style: "pascal",
          message: "Class name must use PascalCase"
        },
        {
          kind: "pathSegmentCase",
          field: "path",
          style: "lower",
          code: "INVALID_PACKAGE_SEGMENT",
          message: "Backend package segments must use lower-case"
        }
      ],
      render: {
        templatePath: t("templates/request-dto.java"),
        output: {
          filePattern: "src/main/java/{basePackagePath}/{path}/dto/{name}.java"
        },
        contextTokens: [
          "className",
          "basePackage",
          "packagePathDot",
          "basePackagePath",
          "recordFields"
        ]
      },
      examples: [
        "backend requestDto --json '{\"name\":\"CreateProductRequest\",\"path\":\"product\",\"basePackage\":\"com.example.app\",\"fields\":[{\"name\":\"name\",\"type\":\"String\",\"validations\":[\"NotBlank\"]}]}'"
      ]
    },

    responseDto: {
      description: "Generate a Spring response DTO",
      summary: {
        whenToUse: [
          "When you need a response DTO for an API response"
        ],
        relatedCommands: [
          { id: "module", reason: "Generate the skeleton for the same feature" },
          { id: "requestDto", reason: "Define the request DTO together" },
          { id: "entity", reason: "Generate the entity shell referenced by the response" }
        ],
        flowRefs: ["create-spring-feature"]
      },
      inputMode: "json",
      execution: { kind: "file" },
      inputSchema: {
        required: ["name", "path"],
        arrays: ["fields"]
      },
      defaults: { fields: [] },
      fieldResolvers: [
        {
          field: "basePackage",
          source: "detector",
          detector: "springBasePackage",
          code: "ROOT_PACKAGE_NOT_FOUND",
          message: "Spring root package could not be detected. Provide basePackage in the JSON spec.",
          details: { command: "responseDto" }
        }
      ],
      generator: {
        kind: "singleFile",
        requiresBasePackage: true
      },
      normalizationRules: [
        { kind: "case", field: "name", style: "pascal", reason: "classes use PascalCase" },
        { kind: "path", field: "path" },
        { kind: "listItemNames", field: "fields", style: "camel", reason: "field names use camelCase" }
      ],
      validatorRules: [
        {
          kind: "nameCase",
          field: "name",
          style: "pascal",
          message: "Class name must use PascalCase"
        },
        {
          kind: "pathSegmentCase",
          field: "path",
          style: "lower",
          code: "INVALID_PACKAGE_SEGMENT",
          message: "Backend package segments must use lower-case"
        }
      ],
      render: {
        templatePath: t("templates/response-dto.java"),
        output: {
          filePattern: "src/main/java/{basePackagePath}/{path}/dto/{name}.java"
        },
        contextTokens: [
          "className",
          "basePackage",
          "packagePathDot",
          "basePackagePath",
          "recordFields"
        ]
      },
      examples: [
        "backend responseDto --json '{\"name\":\"ProductResponse\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}'"
      ]
    },

    entity: {
      description: "Generate a Spring entity",
      summary: {
        whenToUse: [
          "When you need a JPA entity shell"
        ],
        relatedCommands: [
          { id: "module", reason: "Generate the skeleton for the same feature" },
          { id: "requestDto", reason: "Align request DTO fields with domain fields" },
          { id: "responseDto", reason: "Align response DTO fields with domain fields" }
        ],
        flowRefs: ["create-spring-feature"]
      },
      inputMode: "json",
      execution: { kind: "file" },
      inputSchema: {
        required: ["name", "path"],
        arrays: ["fields"]
      },
      defaults: { fields: [] },
      fieldResolvers: [
        {
          field: "basePackage",
          source: "detector",
          detector: "springBasePackage",
          code: "ROOT_PACKAGE_NOT_FOUND",
          message: "Spring root package could not be detected. Provide basePackage in the JSON spec.",
          details: { command: "entity" }
        }
      ],
      generator: {
        kind: "singleFile",
        requiresBasePackage: true
      },
      normalizationRules: [
        { kind: "case", field: "name", style: "pascal", reason: "classes use PascalCase" },
        { kind: "path", field: "path" },
        { kind: "listItemNames", field: "fields", style: "camel", reason: "field names use camelCase" }
      ],
      validatorRules: [
        {
          kind: "nameCase",
          field: "name",
          style: "pascal",
          message: "Class name must use PascalCase"
        },
        {
          kind: "pathSegmentCase",
          field: "path",
          style: "lower",
          code: "INVALID_PACKAGE_SEGMENT",
          message: "Backend package segments must use lower-case"
        }
      ],
      render: {
        templatePath: t("templates/entity.java"),
        output: {
          filePattern: "src/main/java/{basePackagePath}/{path}/entity/{name}.java"
        },
        contextTokens: [
          "className",
          "basePackage",
          "packagePathDot",
          "basePackagePath",
          "entityFields"
        ]
      },
      examples: [
        "backend entity --json '{\"name\":\"Product\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}'"
      ]
    }
  }
};

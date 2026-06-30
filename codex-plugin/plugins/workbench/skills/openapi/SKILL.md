---
name: openapi
description: Register, list, refresh, and search user-provided Swagger/OpenAPI services through the local openapi MCP server. Use when the user says "openapi", "swagger 등록", "스웨거 등록", "API 문서 등록", asks to add/remove/list OpenAPI services, find candidate APIs, inspect endpoint request/response fields, locate endpoints by schema field, or get Swagger/spec/endpoint URLs. This skill reads API documentation only and does not call business API endpoints.
---

# OpenAPI

Use this skill to manage the local OpenAPI service registry and search registered Swagger/OpenAPI documents.

The service registry is user-owned. Do not hardcode company Swagger URLs in this plugin or in skill instructions.

## Rules

- Do NOT call business API endpoints.
- Do NOT send request bodies to service APIs.
- Do NOT add private Swagger URLs to plugin source files.
- Register Swagger/OpenAPI services through the local registry before searching.
- Refresh the relevant service cache before searching when freshness matters.
- If refresh fails but stale cache exists, continue with stale cache and mark the result as stale.
- If no services are registered, tell the user to register a service with this skill instead of guessing service IDs.

## Registry

Default registry path:

```text
${CODEX_HOME:-~/.codex}/workbench/openapi-services.json
```

The MCP server also respects:

- `OPENAPI_MCP_CONFIG_DIR`: directory containing `openapi-services.json`
- `OPENAPI_MCP_SERVICES_FILE`: explicit service registry file path

Registry shape:

```json
{
  "services": [
    {
      "id": "manager-api",
      "name": "Manager API",
      "swaggerUrl": "https://example.com/swagger-ui/",
      "apiBaseUrl": "https://example.com"
    }
  ]
}
```

## Workflow

1. Use `tool_search` for `openapi` tools if they are not already available.
2. If OpenAPI MCP tools are exposed, call them directly:
   - `list_services`
   - `register_service`
   - `unregister_service`
   - `refresh_service`
   - `search_endpoints`
   - `get_endpoint`
   - `find_schema_field`
3. If OpenAPI MCP tools are not exposed in the current session, use the bundled CLI fallback:
   - Resolve the plugin root from this `SKILL.md` path, then run `ruby <plugin-root>/tools/openapi-mcp.rb <command>`.
   - `ruby <plugin-root>/tools/openapi-mcp.rb list-services`
   - `ruby <plugin-root>/tools/openapi-mcp.rb register-service --id <id> --name "<name>" --swagger-url "<url>" --api-base-url "<base-url>"`
   - `ruby <plugin-root>/tools/openapi-mcp.rb unregister-service --service <id>`
   - `ruby <plugin-root>/tools/openapi-mcp.rb refresh-service --service <id>`
   - `ruby <plugin-root>/tools/openapi-mcp.rb search-endpoints --service <id> --query "<terms>" --limit 5`
   - `ruby <plugin-root>/tools/openapi-mcp.rb get-endpoint --service <id> --method GET --path /path`
   - `ruby <plugin-root>/tools/openapi-mcp.rb find-schema-field --service <id> --field fieldName`
4. For registration requests, require:
   - `id`: stable lowercase id such as `manager-api`
   - `name`: human-readable name
   - `swaggerUrl`: Swagger UI URL or OpenAPI discovery URL
   - `apiBaseUrl`: optional but recommended for endpoint candidate URLs
5. After registering, run `list-services` and optionally `refresh-service --service <id>` to verify the service is usable.
6. For search requests, call or run endpoint search with Korean product terms, English identifiers, screen names, path fragments, and schema fields.
7. Inspect endpoint details only for strong candidates.

## Output

Use Korean for explanations unless the user asks otherwise. Keep service IDs, methods, paths, field names, and URLs exact.

For registration:

```markdown
**OpenAPI Service Registered**

- Service: `<id>` - <name>
- Registry: <servicesFile>
- Swagger: <swaggerUrl>
- API Base: <apiBaseUrl or "not set">
- Refresh: <pass/fail/not run>
```

For search:

```markdown
**API Candidates**

- `<service>` `<METHOD> <path>` - <summary>
  - Confidence: <candidate / likely / confirmed>
  - Swagger: <swaggerDocumentUrl, or swaggerUrl if the document URL is unavailable>
  - Operation: <swaggerOperationUrl when useful>
  - Spec: <specUrl>
  - Endpoint candidate: <endpointUrl>
  - Request/Response: <core fields only>
  - Why: <why this matches the user's query>
```

When there are many matches, show the best 5-10 and say what query terms were used.

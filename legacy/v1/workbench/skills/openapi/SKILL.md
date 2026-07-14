---
name: openapi
description: Register, list, refresh, search, inspect, and test user-provided Swagger/OpenAPI services through the local openapi MCP server. Use when the user says "openapi", "swagger 등록", "스웨거 등록", "API 문서 등록", asks to add/remove/list OpenAPI services, find candidate APIs, inspect endpoint request/response fields, locate endpoints by schema field, get Swagger/spec/endpoint URLs, or test registered API endpoints. This skill may call API endpoints only when the user explicitly requests an API test or grants permission.
---

# OpenAPI

Use this skill to manage the local OpenAPI service registry, search registered Swagger/OpenAPI documents, inspect endpoint details, and test registered API endpoints.

The service registry is user-owned. Do not hardcode company Swagger URLs in this plugin or in skill instructions.

## Rules

- Do NOT call `POST`, `PUT`, `PATCH`, or `DELETE` unless the user explicitly requested that API call/test or granted permission.
- Do NOT infer mutation permission from a documentation search, endpoint inspection, schema lookup, or issue briefing request.
- If an agent-initiated `POST`, `PUT`, `PATCH`, or `DELETE` test would be useful but the user did not ask for it, ask before calling it.
- `GET`, `HEAD`, and `OPTIONS` may be called for user-requested API tests.
- Do NOT add private Swagger URLs to plugin source files.
- Register Swagger/OpenAPI services through the local registry before searching, inspecting, or testing.
- Refresh the relevant service cache before searching when freshness matters.
- If refresh fails but stale cache exists, continue with stale cache and mark the result as stale.
- If no services are registered, tell the user to register a service with this skill instead of guessing service IDs.
- Prefer `get_endpoint` before `call_endpoint` when the request shape is unclear.
- Use the smallest valid request body and parameter set needed for an API test.
- Do NOT print full sensitive values such as `Authorization`, `Cookie`, `X-API-Key`, tokens, passwords, or secrets. Rely on MCP masking and omit secrets from explanations.

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
   - `call_endpoint`
3. If OpenAPI MCP tools are not exposed in the current session, use the bundled CLI fallback:
   - Resolve the plugin root from this `SKILL.md` path, then run `ruby <plugin-root>/tools/openapi-mcp.rb <command>`.
   - `ruby <plugin-root>/tools/openapi-mcp.rb list-services`
   - `ruby <plugin-root>/tools/openapi-mcp.rb register-service --id <id> --name "<name>" --swagger-url "<url>" --api-base-url "<base-url>"`
   - `ruby <plugin-root>/tools/openapi-mcp.rb unregister-service --service <id>`
   - `ruby <plugin-root>/tools/openapi-mcp.rb refresh-service --service <id>`
   - `ruby <plugin-root>/tools/openapi-mcp.rb search-endpoints --service <id> --query "<terms>" --limit 5`
   - `ruby <plugin-root>/tools/openapi-mcp.rb get-endpoint --service <id> --method GET --path /path`
   - `ruby <plugin-root>/tools/openapi-mcp.rb find-schema-field --service <id> --field fieldName`
   - `ruby <plugin-root>/tools/openapi-mcp.rb call-endpoint --service <id> --method GET --path /path --path-params '{"id":"123"}' --query-params '{"page":1}' --headers '{"Authorization":"Bearer ..."}' --body '{"name":"test"}' --timeout-sec 20`
4. For registration requests, require:
   - `id`: stable lowercase id such as `manager-api`
   - `name`: human-readable name
   - `swaggerUrl`: Swagger UI URL or OpenAPI discovery URL
   - `apiBaseUrl`: optional but recommended for endpoint candidate URLs
5. After registering, run `list-services` and optionally `refresh-service --service <id>` to verify the service is usable.
6. For search requests, call or run endpoint search with Korean product terms, English identifiers, screen names, path fragments, and schema fields.
7. Inspect endpoint details only for strong candidates.

## API Testing Workflow

Treat the MCP server as the executor and this skill as the policy layer.

1. Classify the user's intent:
   - Documentation/search intent: find APIs, inspect fields, compare request/response shapes, or get Swagger URLs. Do not call mutating endpoints.
   - Explicit test intent: call/test/run an endpoint, fetch a list, create/update/delete a test record, or verify behavior with request data.
2. For user-requested API tests, identify the exact registered service, method, and path.
3. Use `get_endpoint` first when path parameters, query parameters, headers, or body shape are unclear.
4. Build the `call_endpoint` request:
   - `service`: registered service id.
   - `method`: HTTP method.
   - `path`: OpenAPI path template, such as `/items/{id}`.
   - `pathParams`: values for `{id}` style variables.
   - `query`: query string parameters.
   - `headers`: request-specific headers only when needed. Environment-provided headers are applied by MCP.
   - `body`: JSON request body when required.
   - `timeoutSec`: optional timeout.
5. For `POST`, `PUT`, `PATCH`, or `DELETE`, call only when the user explicitly requested that test or granted permission.
6. Report status, duration, documented/validation state, important request inputs, and the relevant response fields.

## Authorization

MCP can attach authorization through environment-provided headers or per-call headers.

Supported environment variables:

- `OPENAPI_MCP_HEADERS`: default headers for all calls.
- `OPENAPI_MCP_HOST_HEADERS`: headers by host.
- `OPENAPI_MCP_SERVICE_HEADERS`: headers by registered service id.

Example service headers:

```bash
export OPENAPI_MCP_SERVICE_HEADERS='{
  "manager-api": {
    "Authorization": "Bearer token",
    "X-Company-Id": "123"
  }
}'
```

Use `call_endpoint.headers` only for request-specific overrides. Do not reveal real tokens in the final answer.

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

For API tests:

```markdown
**API Test Result**

- Endpoint: `<service>` `<METHOD> <path>`
- URL: `<resolved url>`
- Documented: `<true/false>`
- Validation: `<ok or warnings>`
- Status: `<status> <message>`
- Duration: `<durationMs>ms`
- Request: `<path/query/body summary, sensitive values omitted or masked>`
- Response: `<core fields or body preview>`
```

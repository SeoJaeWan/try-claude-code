---
name: openapi-search
description: Search registered Swagger/OpenAPI specs through the local openapi MCP server. Use when the user asks to find candidate APIs, inspect endpoint request/response fields, locate endpoints by schema field, refresh Swagger/OpenAPI cache, or get Swagger/spec/endpoint URLs for carplat manager, carplat web/app, or TMS APIs. This skill reads API documentation only and does not call business API endpoints.
---

# openapi-search

## Purpose

Find candidate API endpoints from registered Swagger/OpenAPI documents and return links the user can open in Swagger to test manually.

## Rules

- Do NOT call business API endpoints.
- Do NOT send request bodies to service APIs.
- Do NOT infer that a candidate endpoint is confirmed unless the user, Jira, repo code, or API docs clearly prove it.
- Refresh the relevant service cache before searching when freshness matters.
- If the relevant service is unclear, refresh all registered services before searching.
- If refresh fails but stale cache exists, continue with stale cache and mark the result as stale.

## Registered Services

- `carplat-manager`: manager/admin APIs from `https://test-api-admin.carplat.co.kr/`
- `carplat-web-app`: web/app APIs from `https://test-api.carplat.co.kr/`
- `tms`: TMS APIs from `http://apis.preprod.turucar.com/tms/index.html`

## Workflow

1. Use `tool_search` for `openapi` tools if they are not already available.
2. If OpenAPI MCP tools are exposed, call them directly:
   - `list_services`
   - `refresh_service`
   - `search_endpoints`
   - `get_endpoint`
   - `find_schema_field`
3. If OpenAPI MCP tools are not exposed in the current session, use the bundled CLI fallback instead of skipping API evidence:
   - Resolve the plugin root from this `SKILL.md` path, then run `ruby <plugin-root>/tools/openapi-mcp.rb <command>`.
   - Example: `ruby <plugin-root>/tools/openapi-mcp.rb list-services`
   - Example: `ruby <plugin-root>/tools/openapi-mcp.rb refresh-service --service carplat-manager`
   - Example: `ruby <plugin-root>/tools/openapi-mcp.rb search-endpoints --service carplat-manager --query "관리자 계정 admin" --limit 5`
   - Example: `ruby <plugin-root>/tools/openapi-mcp.rb get-endpoint --service carplat-manager --method GET --path /admin`
   - Example: `ruby <plugin-root>/tools/openapi-mcp.rb find-schema-field --service carplat-manager --field roleId`
4. Call `list_services` to check cache status when useful.
5. Call or run `refresh_service` / `refresh-service` for the likely service, or all services if uncertain.
6. Call or run endpoint search with Korean product terms, English identifiers, screen names, path fragments, and schema fields.
7. Inspect endpoint details only for strong candidates.

## Output

Use Korean for explanations unless the user asks otherwise. Keep methods, paths, field names, and URLs exact.

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

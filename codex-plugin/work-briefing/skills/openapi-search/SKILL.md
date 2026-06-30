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
2. Call `list_services` to check cache status when useful.
3. Call `refresh_service` for the likely service, or all services if uncertain.
4. Call `search_endpoints` with Korean product terms, English identifiers, screen names, path fragments, and schema fields.
5. Call `get_endpoint` for strong candidates only.
6. Use `find_schema_field` when the user gives a field such as `reservationId`, `couponId`, or `carId`.

## Output

Use Korean for explanations unless the user asks otherwise. Keep methods, paths, field names, and URLs exact.

```markdown
**API Candidates**

- `<service>` `<METHOD> <path>` - <summary>
  - Confidence: <candidate / likely / confirmed>
  - Swagger: <swaggerUrl or swaggerOperationUrl>
  - Spec: <specUrl>
  - Endpoint candidate: <endpointUrl>
  - Request/Response: <core fields only>
  - Why: <why this matches the user's query>
```

When there are many matches, show the best 5-10 and say what query terms were used.

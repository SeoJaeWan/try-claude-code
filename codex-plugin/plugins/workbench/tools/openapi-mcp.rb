#!/usr/bin/env ruby
# frozen_string_literal: true

require "base64"
require "date"
require "digest"
require "fileutils"
require "json"
require "net/http"
require "optparse"
require "stringio"
require "time"
require "uri"
require "yaml"

ROOT = File.expand_path("../..", __dir__)
CODEX_HOME = ENV.fetch("CODEX_HOME", File.expand_path("~/.codex"))
DEFAULT_CONFIG_DIR = ENV.fetch("OPENAPI_MCP_CONFIG_DIR", File.expand_path("workbench", CODEX_HOME))
DEFAULT_SERVICES_FILE = File.expand_path("openapi-services.json", DEFAULT_CONFIG_DIR)
SERVICES_FILE = ENV.fetch("OPENAPI_MCP_SERVICES_FILE", DEFAULT_SERVICES_FILE)
CACHE_DIR = ENV.fetch("OPENAPI_MCP_CACHE_DIR", File.expand_path("~/.codex/cache/openapi-mcp"))
TIMEOUT_SEC = Integer(ENV.fetch("OPENAPI_MCP_TIMEOUT_SEC", "20"))
RESPONSE_BODY_LIMIT_BYTES = Integer(ENV.fetch("OPENAPI_MCP_RESPONSE_BODY_LIMIT_BYTES", "200000"))
# Increment when normalized documents or the cache bundle format become incompatible.
CACHE_SCHEMA_VERSION = 1

HTTP_METHODS = %w[get put post delete patch options head trace].freeze
SENSITIVE_HEADER_NAMES = %w[
  authorization proxy-authorization cookie set-cookie x-api-key x-api-token api-key token
].freeze
SENSITIVE_BODY_KEYS = %w[
  access_token api_key apikey authorization cookie password refresh_token secret token
].freeze

class OpenApiMcp
  def initialize
    FileUtils.mkdir_p(CACHE_DIR)
    @services = load_services
  end

  def handle(request)
    case request["method"]
    when "initialize"
      result({
        protocolVersion: request.dig("params", "protocolVersion") || "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "openapi-mcp", version: "0.1.0" }
      })
    when "notifications/initialized"
      nil
    when "tools/list"
      result({ tools: tools })
    when "tools/call"
      call_tool(request.dig("params", "name"), request.dig("params", "arguments") || {})
    else
      error(-32_601, "Method not found: #{request["method"]}")
    end
  rescue StandardError => e
    error(-32_003, "#{e.class}: #{e.message}")
  end

  private

  def result(payload)
    { jsonrpc: "2.0", result: payload }
  end

  def error(code, message)
    { jsonrpc: "2.0", error: { code: code, message: message } }
  end

  def text_result(data)
    result({
      content: [
        {
          type: "text",
          text: JSON.pretty_generate(data)
        }
      ]
    })
  end

  def tools
    [
      {
        name: "list_services",
        description: "List registered Swagger/OpenAPI services and cached spec status.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "register_service",
        description: "Register or replace one local Swagger/OpenAPI service in the user-owned OpenAPI service registry.",
        inputSchema: {
          type: "object",
          required: %w[id name swaggerUrl],
          properties: {
            id: { type: "string", description: "Stable service id, e.g. manager-api." },
            name: { type: "string", description: "Human-readable service name." },
            swaggerUrl: { type: "string", description: "Swagger UI URL or OpenAPI document discovery URL." },
            apiBaseUrl: { type: "string", description: "Optional API base URL for endpoint candidates." }
          },
          additionalProperties: false
        }
      },
      {
        name: "unregister_service",
        description: "Remove one local Swagger/OpenAPI service from the user-owned OpenAPI service registry.",
        inputSchema: {
          type: "object",
          required: ["service"],
          properties: {
            service: { type: "string", description: "Service id to remove." }
          },
          additionalProperties: false
        }
      },
      {
        name: "refresh_service",
        description: "Fetch and cache OpenAPI specs for one service or all services. Reads OpenAPI documents only; it never calls API endpoints.",
        inputSchema: {
          type: "object",
          properties: {
            service: { type: "string", description: "Optional service id. If omitted, refresh all services." }
          },
          additionalProperties: false
        }
      },
      {
        name: "search_endpoints",
        description: "Search endpoint paths, summaries, descriptions, tags, operation ids, and schema fields.",
        inputSchema: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string" },
            service: { type: "string", description: "Optional service id." },
            limit: { type: "integer", minimum: 1, maximum: 50, default: 10 }
          },
          additionalProperties: false
        }
      },
      {
        name: "get_endpoint",
        description: "Get request/response details for a specific service, method, and path.",
        inputSchema: {
          type: "object",
          required: %w[service method path],
          properties: {
            service: { type: "string" },
            method: { type: "string", enum: HTTP_METHODS.map(&:upcase) + HTTP_METHODS },
            path: { type: "string" }
          },
          additionalProperties: false
        }
      },
      {
        name: "find_schema_field",
        description: "Find endpoints whose parameters, request body, or response schemas mention a field name.",
        inputSchema: {
          type: "object",
          required: ["field"],
          properties: {
            field: { type: "string" },
            service: { type: "string", description: "Optional service id." },
            limit: { type: "integer", minimum: 1, maximum: 50, default: 10 }
          },
          additionalProperties: false
        }
      },
      {
        name: "call_endpoint",
        description: "Call a registered API endpoint using its apiBaseUrl. Executes the HTTP request and returns structured request/response details.",
        inputSchema: {
          type: "object",
          required: %w[service method path],
          properties: {
            service: { type: "string" },
            method: { type: "string", enum: HTTP_METHODS.map(&:upcase) + HTTP_METHODS },
            path: { type: "string", description: "Endpoint path or OpenAPI path template, e.g. /users/{id}." },
            pathParams: { type: "object", description: "Values for OpenAPI path template variables.", additionalProperties: true },
            query: { type: "object", description: "Query string parameters.", additionalProperties: true },
            headers: { type: "object", description: "Request headers. Overrides env-provided headers.", additionalProperties: true },
            body: { description: "JSON request body. Objects and arrays are JSON-encoded." },
            timeoutSec: { type: "integer", minimum: 1, maximum: 300, default: TIMEOUT_SEC }
          },
          additionalProperties: false
        }
      }
    ]
  end

  def call_tool(name, args)
    case name
    when "list_services"
      text_result(list_services)
    when "register_service"
      text_result(register_service(args.fetch("id"), args.fetch("name"), args.fetch("swaggerUrl"), args["apiBaseUrl"]))
    when "unregister_service"
      text_result(unregister_service(args.fetch("service")))
    when "refresh_service"
      text_result(refresh_service(args["service"]))
    when "search_endpoints"
      text_result(search_endpoints(args.fetch("query"), args["service"], args["limit"] || 10))
    when "get_endpoint"
      text_result(get_endpoint(args.fetch("service"), args.fetch("method"), args.fetch("path")))
    when "find_schema_field"
      text_result(find_schema_field(args.fetch("field"), args["service"], args["limit"] || 10))
    when "call_endpoint"
      text_result(
        call_endpoint(
          args.fetch("service"),
          args.fetch("method"),
          args.fetch("path"),
          args["pathParams"] || {},
          args["query"] || {},
          args["headers"] || {},
          args.key?("body") ? args["body"] : nil,
          args.key?("body"),
          args["timeoutSec"] || TIMEOUT_SEC
        )
      )
    else
      error(-32_602, "Unknown tool: #{name}")
    end
  end

  def load_services
    return [] unless File.exist?(SERVICES_FILE)

    raw = File.read(SERVICES_FILE)
    return [] if raw.strip.empty?

    data = JSON.parse(raw)
    services = data.fetch("services", [])
    raise "Invalid service config: services must be an array" unless services.is_a?(Array)

    services.map { |svc| normalize_service_config(svc) }
  end

  def normalize_service_config(svc)
    raise "Invalid service config: service must be an object" unless svc.is_a?(Hash)

    required = %w[id name swaggerUrl]
    missing = required.reject { |key| svc[key].to_s != "" }
    raise "Invalid service config, missing #{missing.join(", ")}" unless missing.empty?

    id = svc.fetch("id").to_s
    raise "Invalid service id '#{id}'. Use lowercase letters, digits, hyphen, or underscore." unless id.match?(/\A[a-z0-9][a-z0-9_-]*\z/)

    swagger_uri = URI(svc.fetch("swaggerUrl").to_s)
    raise "Invalid swaggerUrl for '#{id}': must be http(s)" unless %w[http https].include?(swagger_uri.scheme)

    if svc["apiBaseUrl"].to_s != ""
      api_base_uri = URI(svc.fetch("apiBaseUrl").to_s)
      raise "Invalid apiBaseUrl for '#{id}': must be http(s)" unless %w[http https].include?(api_base_uri.scheme)
    end

    hash_pick(svc, "id", "name", "swaggerUrl", "apiBaseUrl")
  rescue URI::InvalidURIError => e
    raise "Invalid URL in service '#{svc["id"] || "(unknown)"}': #{e.message}"
  end

  def service_ids
    @services.map { |svc| svc.fetch("id") }
  end

  def service!(id)
    svc = @services.find { |item| item.fetch("id") == id }
    raise "Unknown service '#{id}'. Known services: #{service_ids.join(", ")}" unless svc

    svc
  end

  def list_services
    {
      servicesFile: SERVICES_FILE,
      cacheDir: CACHE_DIR,
      services: @services.map do |svc|
        docs = cached_docs_for(svc)
        endpoints = docs.sum { |doc| doc.fetch("endpoints", []).length }
        {
          id: svc.fetch("id"),
          name: svc.fetch("name"),
          swaggerUrl: svc.fetch("swaggerUrl"),
          apiBaseUrl: svc["apiBaseUrl"] || root_url(svc.fetch("swaggerUrl")),
          cached: docs.any?,
          cachedDocuments: docs.length,
          endpoints: endpoints,
          refreshedAt: docs.map { |doc| doc["fetchedAt"] }.compact.max,
          stale: docs.any? { |doc| doc["stale"] }
        }
      end
    }
  end

  def register_service(id, name, swagger_url, api_base_url = nil)
    candidate = {
      "id" => id.to_s,
      "name" => name.to_s,
      "swaggerUrl" => swagger_url.to_s
    }
    candidate["apiBaseUrl"] = api_base_url.to_s if api_base_url.to_s != ""
    normalized = normalize_service_config(candidate)
    existing = @services.find { |svc| svc.fetch("id") == normalized.fetch("id") }

    services = @services.reject { |svc| svc.fetch("id") == normalized.fetch("id") }
    services << normalized
    write_services(services)
    @services = load_services
    remove_service_cache(normalized.fetch("id")) if existing.nil? || source_fingerprint(existing) != source_fingerprint(normalized)

    {
      servicesFile: SERVICES_FILE,
      registered: normalized,
      services: @services.map { |svc| hash_pick(svc, "id", "name", "swaggerUrl", "apiBaseUrl") }
    }
  end

  def unregister_service(service_id)
    service!(service_id)
    services = @services.reject { |svc| svc.fetch("id") == service_id }
    write_services(services)
    @services = load_services
    remove_service_cache(service_id)

    {
      servicesFile: SERVICES_FILE,
      removed: service_id,
      services: @services.map { |svc| hash_pick(svc, "id", "name", "swaggerUrl", "apiBaseUrl") }
    }
  end

  def write_services(services)
    FileUtils.mkdir_p(File.dirname(SERVICES_FILE))
    File.write("#{SERVICES_FILE}.tmp", JSON.pretty_generate({ "services" => services }) + "\n")
    FileUtils.mv("#{SERVICES_FILE}.tmp", SERVICES_FILE)
  end

  def refresh_service(service_id = nil)
    services = service_id ? [service!(service_id)] : @services
    {
      refreshed: services.map { |svc| refresh_one_service(svc) }
    }
  end

  def search_endpoints(query, service_id = nil, limit = 10)
    ensure_cache(service_id)
    words = tokenize(query)
    results = docs_for_scope(service_id).flat_map do |doc|
      map_present(doc.fetch("endpoints", [])) do |endpoint|
        score, matched = score_endpoint(endpoint, words)
        next if score <= 0

        hash_pick(endpoint, "service", "documentName", "method", "path", "summary", "description", "operationId", "tags", "urls")
                .merge("score" => score, "matched" => matched)
      end
    end

    {
      query: query,
      count: results.length,
      results: results.sort_by { |item| [-item.fetch("score"), item.fetch("service"), item.fetch("path")] }
                      .first(limit.to_i)
    }
  end

  def get_endpoint(service_id, method, path)
    ensure_cache(service_id)
    method = method.downcase
    doc = docs_for_scope(service_id).find do |candidate|
      candidate.fetch("endpoints", []).any? { |endpoint| endpoint["method"] == method && endpoint["path"] == path }
    end
    raise "Endpoint not found: #{service_id} #{method.upcase} #{path}" unless doc

    endpoint = doc.fetch("endpoints").find { |item| item["method"] == method && item["path"] == path }
    {
      service: service_id,
      documentName: doc["documentName"],
      documentUrl: doc["documentUrl"],
      urls: endpoint["urls"],
      method: method.upcase,
      path: path,
      summary: endpoint["summary"],
      description: endpoint["description"],
      operationId: endpoint["operationId"],
      tags: endpoint["tags"],
      deprecated: endpoint["deprecated"],
      security: endpoint["security"],
      parameters: endpoint["parameters"],
      requestBody: endpoint["requestBody"],
      responses: endpoint["responses"]
    }
  end

  def find_schema_field(field, service_id = nil, limit = 10)
    ensure_cache(service_id)
    needle = normalize(field)
    results = docs_for_scope(service_id).flat_map do |doc|
      map_present(doc.fetch("endpoints", [])) do |endpoint|
        fields = endpoint.fetch("schemaFields", [])
        matched = fields.select { |item| normalize(item).include?(needle) }
        next if matched.empty?

        hash_pick(endpoint, "service", "documentName", "method", "path", "summary", "tags", "urls")
                .merge("matchedFields" => matched.first(20), "score" => matched.length)
      end
    end

    {
      field: field,
      count: results.length,
      results: results.sort_by { |item| [-item.fetch("score"), item.fetch("service"), item.fetch("path")] }
                      .first(limit.to_i)
    }
  end

  def call_endpoint(service_id, method, path, path_params = {}, query = {}, request_headers = {}, body = nil, body_provided = false, timeout_sec = TIMEOUT_SEC)
    svc = service!(service_id)
    method = normalize_method!(method)
    path_params = normalize_hash_arg(path_params, "pathParams")
    query = normalize_hash_arg(query, "query")
    request_headers = normalize_hash_arg(request_headers, "headers")
    timeout_sec = normalize_timeout(timeout_sec)

    endpoint = endpoint_for_call(service_id, method, path)
    expanded_path = expand_path_template(path, path_params)
    uri = build_endpoint_uri(svc, expanded_path, query)
    headers = request_headers_for(uri, svc, request_headers)
    validation = validate_endpoint_call(endpoint, path_params, query, headers, body_provided)
    request = build_http_request(method, uri, headers, body, body_provided)

    started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    response = perform_request(uri, request, timeout_sec)
    duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round

    {
      service: service_id,
      method: method.upcase,
      path: path,
      resolvedPath: expanded_path,
      url: uri.to_s,
      documented: !endpoint.nil?,
      validation: validation,
      request: {
        headers: mask_sensitive_headers(headers),
        body: body_provided ? mask_sensitive_body(body) : nil
      }.compact,
      # Endpoint response bodies remain unmasked (subject to the response-size limit) and never enter the spec cache.
      response: summarize_http_response(response),
      durationMs: duration_ms
    }
  end

  def refresh_one_service(svc)
    existing_docs = cached_docs_for(svc)
    stale_by_url = existing_docs.to_h { |doc| [document_identity(doc.fetch("documentUrl")), doc] }
    discovered = discover_documents(svc.fetch("swaggerUrl"))
    cached_docs = []
    docs = discovered.map do |document|
      begin
        spec = document[:spec] || fetch_spec(document.fetch(:url))
        normalized = normalize_document(svc, document, spec)
        cached_docs << normalized
        {
          name: document.fetch(:name),
          url: document.fetch(:url),
          endpoints: normalized.fetch("endpoints").length,
          ok: true
        }
      rescue StandardError => e
        stale = stale_by_url[document_identity(document.fetch(:url))]&.dup
        if stale
          stale["stale"] = true
          cached_docs << stale
          {
            name: document.fetch(:name),
            url: document.fetch(:url),
            endpoints: stale.fetch("endpoints", []).length,
            ok: false,
            stale: true,
            error: "#{e.class}: #{e.message}"
          }
        else
          {
            name: document.fetch(:name),
            url: document.fetch(:url),
            ok: false,
            error: "#{e.class}: #{e.message}"
          }
        end
      end
    end

    if cached_docs.empty? && existing_docs.any?
      refresh_error = docs.map { |doc| doc[:error] }.compact.first
      cached_docs = existing_docs.map { |doc| doc.merge("stale" => true) }
      docs = cached_docs.map do |doc|
        {
          name: doc["documentName"],
          url: doc["documentUrl"],
          endpoints: doc.fetch("endpoints", []).length,
          ok: false,
          stale: true,
          error: refresh_error || "No OpenAPI document refreshed successfully."
        }
      end
    end
    write_service_cache(svc, cached_docs)

    {
      service: svc.fetch("id"),
      swaggerUrl: svc.fetch("swaggerUrl"),
      documents: docs,
      ok: docs.any? { |doc| doc[:ok] || doc[:stale] }
    }
  rescue StandardError => e
    stale_docs = existing_docs.map { |doc| doc.merge("stale" => true) }
    write_service_cache(svc, stale_docs)
    {
      service: svc.fetch("id"),
      swaggerUrl: svc.fetch("swaggerUrl"),
      documents: if stale_docs.empty?
                   [{ ok: false, error: "#{e.class}: #{e.message}" }]
                 else
                   stale_docs.map do |doc|
                     {
                       name: doc["documentName"],
                       url: doc["documentUrl"],
                       endpoints: doc.fetch("endpoints", []).length,
                       ok: false,
                       stale: true,
                       error: "#{e.class}: #{e.message}"
                     }
                   end
                 end,
      ok: stale_docs.any?
    }
  end

  def ensure_cache(service_id = nil)
    services = service_id ? [service!(service_id)] : @services
    missing = services.select { |svc| cached_docs_for(svc).empty? }
    missing.each { |svc| refresh_one_service(svc) }
  end

  def docs_for_scope(service_id = nil)
    services = service_id ? [service!(service_id)] : @services
    services.flat_map { |svc| cached_docs_for(svc) }
  end

  def discover_documents(swagger_url)
    base_uri = URI(swagger_url)
    source = fetch_text(base_uri)
    direct_spec = parse_openapi_text(source)
    if openapi_document?(direct_spec)
      return [{ url: base_uri.to_s, name: direct_spec.dig("info", "title") || "-", spec: direct_spec }]
    end

    docs = extract_swagger_urls(source, base_uri)

    if docs.empty?
      initializer_uri = URI.join(swagger_url.end_with?("/") ? swagger_url : "#{swagger_url}/", "swagger-initializer.js")
      begin
        initializer = fetch_text(initializer_uri)
        docs = extract_swagger_urls(initializer, initializer_uri)
      rescue StandardError
        docs = []
      end
    end

    docs = default_document_candidates(base_uri) if docs.empty?
    docs.uniq { |doc| doc.fetch(:url) }
  end

  def extract_swagger_urls(text, base_uri)
    docs = []

    text.scan(/url:\s*["']([^"']+)["']\s*,\s*name:\s*["']([^"']*)["']/m) do |url, name|
      docs << { url: absolutize_url(url, base_uri), name: decode_js_string(name) }
    end
    text.scan(/name:\s*["']([^"']*)["']\s*,\s*url:\s*["']([^"']+)["']/m) do |name, url|
      docs << { url: absolutize_url(url, base_uri), name: decode_js_string(name) }
    end
    text.scan(/url:\s*["']([^"']+)["']/m) do |url|
      docs << { url: absolutize_url(url.first, base_uri), name: "-" }
    end

    text.scan(/JSON\.parse\('([^']+)'\)/m) do |json_literal|
      json = decode_js_string(json_literal.first)
      parsed = JSON.parse(json)
      Array(parsed["urls"]).each do |item|
        next unless item["url"]

        docs << { url: absolutize_url(item["url"], base_uri), name: item["name"] || "-" }
      end
      docs << { url: absolutize_url(parsed["url"], base_uri), name: "-" } if parsed["url"]
    rescue JSON::ParserError
      next
    end

    docs.select { |doc| doc.fetch(:url).match?(/\.(ya?ml|json)(\?|$)|api-docs|openapi|swagger/i) }
  end

  def default_document_candidates(base_uri)
    base = "#{base_uri.scheme}://#{base_uri.host}"
    base += ":#{base_uri.port}" if base_uri.port && ![80, 443].include?(base_uri.port)
    path_base = base_uri.path.sub(/\/[^\/]*$/, "")
    [
      "/v3/api-docs",
      "/swagger/v1/swagger.json",
      "/swagger.json",
      "/openapi.json",
      "#{path_base}/v3/api-docs"
    ].map { |path| { url: URI.join(base, path).to_s, name: "-" } }
  end

  def fetch_spec(url)
    parsed = parse_openapi_text(fetch_text(URI(url)))
    raise "Fetched document is not an OpenAPI object" unless openapi_document?(parsed)

    parsed
  end

  def parse_openapi_text(text)
    raw = normalize_document_text(text)
    if raw.lstrip.start_with?("{", "[")
      JSON.parse(raw)
    else
      YAML.safe_load(raw, permitted_classes: [Date, Time], aliases: true)
    end
  rescue JSON::ParserError, Psych::Exception
    nil
  end

  def openapi_document?(value)
    value.is_a?(Hash) && (value["openapi"].to_s != "" || value["swagger"].to_s != "")
  end

  def fetch_text(uri)
    request = Net::HTTP::Get.new(uri)
    headers_for(uri).each { |key, value| request[key] = value }
    request["User-Agent"] ||= "Codex openapi-mcp/0.1"
    response = perform_request(uri, request)

    case response
    when Net::HTTPSuccess
      response.body
    when Net::HTTPRedirection
      fetch_text(URI(response["location"]))
    else
      raise "HTTP #{response.code} for #{uri}"
    end
  end

  def normalize_document_text(text)
    text.to_s.force_encoding("UTF-8")
        .sub(/\A\uFEFF/, "")
        .gsub("\r\n", "\n")
        .gsub("\r", "\n")
  end

  def perform_request(uri, request, timeout_sec = TIMEOUT_SEC)
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: timeout_sec, read_timeout: timeout_sec) do |http|
      http.request(request)
    end
  end

  def headers_for(uri)
    headers = parse_json_env("OPENAPI_MCP_HEADERS")
    by_host = parse_json_env("OPENAPI_MCP_HOST_HEADERS")
    by_service = parse_json_env("OPENAPI_MCP_SERVICE_HEADERS")
    service = @services.find { |svc| uri.to_s.start_with?(root_url(svc.fetch("swaggerUrl"))) }

    headers.merge!(by_host[uri.host] || {})
    headers.merge!(by_service[service.fetch("id")] || {}) if service
    headers
  end

  def request_headers_for(uri, svc, overrides = {})
    headers = parse_json_env("OPENAPI_MCP_HEADERS")
    by_host = parse_json_env("OPENAPI_MCP_HOST_HEADERS")
    by_service = parse_json_env("OPENAPI_MCP_SERVICE_HEADERS")

    headers.merge!(by_host[uri.host] || {})
    headers.merge!(by_service[svc.fetch("id")] || {})
    headers.merge!(stringify_hash(overrides))
    headers
  end

  def parse_json_env(name)
    value = ENV[name]
    return {} if value.nil? || value.strip.empty?

    parsed = JSON.parse(value)
    parsed.is_a?(Hash) ? parsed : {}
  rescue JSON::ParserError
    {}
  end

  def root_url(url)
    uri = URI(url)
    root = "#{uri.scheme}://#{uri.host}"
    root += ":#{uri.port}" if uri.port && ![80, 443].include?(uri.port)
    root
  end

  def endpoint_urls(svc, document, path, method, operation)
    swagger_url = svc.fetch("swaggerUrl")
    api_base_url = svc["apiBaseUrl"] || root_url(swagger_url)
    swagger_document_url = swagger_document_url(swagger_url, document.fetch(:name))
    {
      "swaggerUrl" => swagger_url,
      "swaggerDocumentUrl" => swagger_document_url,
      "swaggerOperationUrl" => swagger_operation_url(swagger_document_url, operation),
      "specUrl" => document.fetch(:url),
      "endpointUrl" => join_url_path(api_base_url, path)
    }.compact
  end

  def swagger_document_url(swagger_url, document_name)
    uri = URI(swagger_url)
    params = URI.decode_www_form(uri.query.to_s)
    params.reject! { |key, _| key == "urls.primaryName" }
    params << ["urls.primaryName", document_name.to_s]
    uri.query = URI.encode_www_form(params)
    uri.to_s
  end

  def swagger_operation_url(swagger_url, operation)
    tag = Array(operation["tags"]).first
    operation_id = operation["operationId"]
    return swagger_url unless tag && operation_id

    separator = swagger_url.include?("#") ? "" : "#"
    "#{swagger_url}#{separator}/#{escape_fragment(tag)}/#{escape_fragment(operation_id)}"
  end

  def escape_fragment(value)
    value.to_s.gsub(" ", "%20").gsub("/", "~1")
  end

  def join_url_path(base_url, path)
    "#{base_url.to_s.sub(%r{/+\z}, "")}/#{path.to_s.sub(%r{\A/+}, "")}"
  end

  def build_endpoint_uri(svc, path, query)
    api_base_url = svc["apiBaseUrl"] || root_url(svc.fetch("swaggerUrl"))
    uri = URI(join_url_path(api_base_url, path))
    pairs = URI.decode_www_form(uri.query.to_s) + flatten_query(query)
    uri.query = pairs.empty? ? nil : URI.encode_www_form(pairs)
    uri
  end

  def normalize_document(svc, document, spec)
    {
      "service" => svc.fetch("id"),
      "serviceName" => svc.fetch("name"),
      "documentName" => document.fetch(:name),
      "documentUrl" => document.fetch(:url),
      "title" => spec.dig("info", "title"),
      "version" => spec.dig("info", "version"),
      "fetchedAt" => Time.now.utc.iso8601,
      "endpoints" => extract_endpoints(svc, document, spec)
    }
  end

  def extract_endpoints(svc, document, spec)
    paths = spec["paths"] || {}
    components = spec["components"] || {}
    paths.flat_map do |path, path_item|
      next [] unless path_item.is_a?(Hash)

      path_parameters = Array(path_item["parameters"])
      map_present(HTTP_METHODS) do |method|
        operation = path_item[method]
        next unless operation.is_a?(Hash)

        parameters = summarize_parameters(path_parameters + Array(operation["parameters"]), components)
        request_body = summarize_request_body(operation["requestBody"], components)
        responses = summarize_responses(operation["responses"], components)
        schema_fields = (fields_from(parameters) + fields_from(request_body) + fields_from(responses)).uniq.sort

        {
          "service" => svc.fetch("id"),
          "documentName" => document.fetch(:name),
          "documentUrl" => document.fetch(:url),
          "urls" => endpoint_urls(svc, document, path, method, operation),
          "method" => method,
          "path" => path,
          "summary" => operation["summary"],
          "description" => compact_text(operation["description"]),
          "operationId" => operation["operationId"],
          "tags" => Array(operation["tags"]),
          "deprecated" => operation["deprecated"] == true,
          "security" => operation["security"],
          "parameters" => parameters,
          "requestBody" => request_body,
          "responses" => responses,
          "schemaFields" => schema_fields,
          "searchText" => [
            svc.fetch("id"), document.fetch(:name), method, path, operation["summary"],
            operation["description"], operation["operationId"], Array(operation["tags"]).join(" "),
            schema_fields.join(" ")
          ].compact.join(" ")
        }
      end
    end
  end

  def summarize_parameters(parameters, components)
    map_present(parameters.map { |param| resolve_ref(param, components) }) do |param|
      next unless param.is_a?(Hash)

      schema = resolve_ref(param["schema"], components)
      {
        "name" => param["name"],
        "in" => param["in"],
        "required" => param["required"] == true,
        "description" => compact_text(param["description"]),
        "schema" => summarize_schema(schema, components)
      }
    end
  end

  def summarize_request_body(request_body, components)
    body = resolve_ref(request_body, components)
    return nil unless body.is_a?(Hash)

    {
      "required" => body["required"] == true,
      "description" => compact_text(body["description"]),
      "content" => summarize_content(body["content"], components)
    }
  end

  def summarize_responses(responses, components)
    return {} unless responses.is_a?(Hash)

    responses.transform_values do |response|
      resolved = resolve_ref(response, components)
      next { "description" => nil, "content" => {} } unless resolved.is_a?(Hash)

      {
        "description" => compact_text(resolved["description"]),
        "content" => summarize_content(resolved["content"], components)
      }
    end
  end

  def summarize_content(content, components)
    return {} unless content.is_a?(Hash)

    content.transform_values do |media|
      schema = media.is_a?(Hash) ? media["schema"] : nil
      summarize_schema(schema, components)
    end
  end

  def summarize_schema(schema, components, depth = 0, seen = {})
    schema = resolve_ref(schema, components, seen)
    return nil unless schema.is_a?(Hash)
    return { "type" => schema["type"] || schema["format"] || "object", "truncated" => true } if depth > 4

    if schema["oneOf"] || schema["anyOf"] || schema["allOf"]
      key = %w[oneOf anyOf allOf].find { |item| schema[item] }
      return {
        key => Array(schema[key]).first(5).map { |item| summarize_schema(item, components, depth + 1, seen) }
      }
    end

    if schema["type"] == "array" || schema["items"]
      return {
        "type" => "array",
        "items" => summarize_schema(schema["items"], components, depth + 1, seen)
      }
    end

    properties = schema["properties"]
    if properties.is_a?(Hash)
      return {
        "type" => schema["type"] || "object",
        "required" => Array(schema["required"]),
        "properties" => properties.first(40).to_h do |name, property|
          [name, summarize_schema(property, components, depth + 1, seen)]
        end
      }
    end

    {
      "type" => schema["type"] || schema["format"],
      "format" => schema["format"],
      "enum" => Array(schema["enum"]).first(30),
      "description" => compact_text(schema["description"])
    }.compact
  end

  def resolve_ref(value, components, seen = {})
    return value unless value.is_a?(Hash) && value["$ref"].is_a?(String)

    ref = value["$ref"]
    return value if seen[ref]

    seen[ref] = true
    if ref.start_with?("#/components/")
      parts = ref.sub("#/components/", "").split("/")
      resolved = parts.reduce(components) { |memo, part| memo.is_a?(Hash) ? memo[part] : nil }
      return resolve_ref(resolved, components, seen) if resolved
    end

    value
  end

  def fields_from(value, prefix = nil, acc = [])
    case value
    when Array
      value.each { |item| fields_from(item, prefix, acc) }
    when Hash
      value.each do |key, child|
        acc << key.to_s if key.to_s.match?(/[A-Za-z가-힣]/)
        if key == "properties" && child.is_a?(Hash)
          child.each_key { |name| acc << [prefix, name].compact.join(".") }
        end
        fields_from(child, key == "properties" ? prefix : key, acc)
      end
    end
    acc
  end

  def score_endpoint(endpoint, words)
    haystack = normalize(endpoint.fetch("searchText", ""))
    matched = []
    score = 0

    words.each do |word|
      next unless haystack.include?(word)

      matched << word
      score += 1
      score += 2 if normalize(endpoint.fetch("path", "")).include?(word)
      score += 2 if normalize(endpoint.fetch("summary", "")).include?(word)
      score += 1 if endpoint.fetch("schemaFields", []).any? { |field| normalize(field).include?(word) }
    end

    [score, matched.uniq]
  end

  def tokenize(text)
    normalize(text).split(/[^0-9a-z가-힣_]+/).reject { |word| word.length < 2 }.uniq
  end

  def normalize(text)
    text.to_s.downcase
  end

  def normalize_method!(method)
    normalized = method.to_s.downcase
    raise "Invalid HTTP method '#{method}'" unless HTTP_METHODS.include?(normalized)

    normalized
  end

  def normalize_hash_arg(value, name)
    return {} if value.nil?
    raise "#{name} must be an object" unless value.is_a?(Hash)

    value
  end

  def normalize_timeout(value)
    timeout = Integer(value)
    raise "timeoutSec must be between 1 and 300" if timeout < 1 || timeout > 300

    timeout
  rescue ArgumentError, TypeError
    raise "timeoutSec must be an integer"
  end

  def endpoint_for_call(service_id, method, path)
    ensure_cache(service_id)
    docs_for_scope(service_id).flat_map { |doc| doc.fetch("endpoints", []) }
                              .find { |endpoint| endpoint["method"] == method && endpoint["path"] == path }
  rescue StandardError
    nil
  end

  def validate_endpoint_call(endpoint, path_params, query, request_headers, body_provided)
    warnings = []
    unless endpoint
      return {
        ok: false,
        warnings: ["Endpoint was not found in the cached OpenAPI document; request will still be sent."]
      }
    end

    Array(endpoint["parameters"]).each do |param|
      next unless param["required"]

      name = param["name"].to_s
      case param["in"]
      when "path"
        warnings << "Missing required path parameter: #{name}" unless path_params.key?(name) || path_params.key?(name.to_sym)
      when "query"
        warnings << "Missing required query parameter: #{name}" unless query.key?(name) || query.key?(name.to_sym)
      when "header"
        warnings << "Missing required header: #{name}" unless header_key?(request_headers, name)
      end
    end

    if endpoint.dig("requestBody", "required") && !body_provided
      warnings << "Missing required request body."
    end

    { ok: warnings.empty?, warnings: warnings }
  end

  def header_key?(headers, name)
    headers.keys.any? { |key| key.to_s.downcase == name.to_s.downcase }
  end

  def expand_path_template(path, path_params)
    expanded = path.to_s.gsub(/\{([^}]+)\}/) do
      name = Regexp.last_match(1)
      value = path_params[name] || path_params[name.to_sym]
      raise "Missing pathParams.#{name} for #{path}" if value.nil?

      URI.encode_www_form_component(value.to_s)
    end

    if expanded.match?(/\{[^}]+\}/)
      raise "Unresolved path template in #{expanded}"
    end

    expanded
  end

  def flatten_query(query)
    query.flat_map do |key, value|
      if value.is_a?(Array)
        value.map { |item| [key.to_s, item.to_s] }
      elsif value.nil?
        [[key.to_s, ""]]
      else
        [[key.to_s, value.to_s]]
      end
    end
  end

  def build_http_request(method, uri, headers, body, body_provided)
    request_class = {
      "get" => Net::HTTP::Get,
      "post" => Net::HTTP::Post,
      "put" => Net::HTTP::Put,
      "patch" => Net::HTTP::Patch,
      "delete" => Net::HTTP::Delete,
      "head" => Net::HTTP::Head,
      "options" => Net::HTTP::Options,
      "trace" => Net::HTTP::Trace
    }.fetch(method)
    request = request_class.new(uri)
    headers.each { |key, value| request[key] = value.to_s }
    request["User-Agent"] ||= "Codex openapi-mcp/0.1"

    if body_provided
      request["Content-Type"] ||= "application/json"
      request.body = body.is_a?(String) ? body : JSON.generate(body)
    end

    request
  end

  def summarize_http_response(response)
    raw_body = response.body.to_s
    truncated = raw_body.bytesize > RESPONSE_BODY_LIMIT_BYTES
    body_text = truncated ? raw_body.byteslice(0, RESPONSE_BODY_LIMIT_BYTES) : raw_body
    parsed_body = parse_response_body(body_text, response["content-type"], truncated)

    {
      status: response.code.to_i,
      message: response.message,
      headers: mask_sensitive_headers(response.each_header.to_h),
      body: parsed_body,
      truncated: truncated,
      bytes: raw_body.bytesize
    }
  end

  def parse_response_body(body_text, content_type, truncated)
    return nil if body_text.empty?
    return body_text if truncated

    if content_type.to_s.include?("json") || body_text.lstrip.start_with?("{", "[")
      JSON.parse(body_text)
    else
      body_text
    end
  rescue JSON::ParserError
    body_text
  end

  def mask_sensitive_headers(headers)
    stringify_hash(headers).each_with_object({}) do |(key, value), masked|
      masked[key] = sensitive_header?(key) ? mask_value(value) : value
    end
  end

  def sensitive_header?(key)
    normalized = key.to_s.downcase
    SENSITIVE_HEADER_NAMES.any? { |name| normalized == name || normalized.include?(name) }
  end

  def mask_sensitive_body(value)
    case value
    when Hash
      value.each_with_object({}) do |(key, child), masked|
        masked[key] = sensitive_body_key?(key) ? mask_value(child) : mask_sensitive_body(child)
      end
    when Array
      value.map { |item| mask_sensitive_body(item) }
    else
      value
    end
  end

  def sensitive_body_key?(key)
    normalized = key.to_s.downcase
    SENSITIVE_BODY_KEYS.any? { |name| normalized == name || normalized.include?(name) }
  end

  def mask_value(value)
    return nil if value.nil?

    text = value.to_s
    return "***" if text.length <= 12

    "#{text[0, 8]}***"
  end

  def stringify_hash(hash)
    hash.each_with_object({}) { |(key, value), result| result[key.to_s] = value }
  end

  def compact_text(text)
    return nil if text.nil?

    text.to_s.gsub(/\s+/, " ").strip[0, 500]
  end

  def absolutize_url(url, base_uri)
    URI.join(base_uri.to_s, url).to_s
  end

  def decode_js_string(value)
    JSON.parse(%("#{value.gsub('"', '\"')}"))
  rescue JSON::ParserError
    value
  end

  def cached_docs_for(service)
    svc = service.is_a?(Hash) ? service : @services.find { |item| item.fetch("id") == service }
    return [] unless svc

    record = read_service_cache(svc)
    record ? refresh_cached_presentation(svc, record.fetch("documents")) : []
  end

  def refresh_cached_presentation(svc, documents)
    documents.each do |doc|
      next unless doc.is_a?(Hash)

      doc["serviceName"] = svc.fetch("name")
      document_url = doc["documentUrl"]
      if document_url && document_identity(document_url) == document_identity(svc.fetch("swaggerUrl"))
        document_url = svc.fetch("swaggerUrl")
        doc["documentUrl"] = document_url
      end
      document = { name: doc["documentName"], url: document_url }
      Array(doc["endpoints"]).each do |endpoint|
        next unless endpoint.is_a?(Hash)

        operation = { "tags" => endpoint["tags"], "operationId" => endpoint["operationId"] }
        endpoint["documentUrl"] = document_url
        endpoint["urls"] = endpoint_urls(svc, document, endpoint["path"], endpoint["method"], operation)
      end
    end
    documents
  end

  def read_service_cache(svc)
    path = service_cache_path(svc.fetch("id"))
    return nil unless File.exist?(path)

    record = JSON.parse(File.read(path))
    return nil unless record.is_a?(Hash) && record["documents"].is_a?(Array)
    return nil unless cache_manifest_matches?(record["manifest"], svc)

    record
  rescue JSON::ParserError, Errno::ENOENT
    nil
  end

  def write_service_cache(svc, documents)
    FileUtils.mkdir_p(CACHE_DIR)
    path = service_cache_path(svc.fetch("id"))
    temporary_path = "#{path}.tmp-#{Process.pid}-#{Thread.current.object_id}"
    record = {
      "manifest" => cache_manifest(svc),
      "documents" => documents
    }
    File.write(temporary_path, JSON.pretty_generate(record) + "\n")
    File.rename(temporary_path, path)
    remove_legacy_cache_files(svc.fetch("id"))
  ensure
    FileUtils.rm_f(temporary_path) if defined?(temporary_path) && temporary_path
  end

  def remove_service_cache(service_id)
    FileUtils.rm_f(service_cache_path(service_id))
    remove_legacy_cache_files(service_id)
  end

  def remove_legacy_cache_files(service_id)
    legacy_name = /\A#{Regexp.escape(service_id)}-[0-9a-f]{16}\.json\z/
    Dir[File.join(CACHE_DIR, "#{service_id}-*.json")].each do |path|
      FileUtils.rm_f(path) if File.basename(path).match?(legacy_name)
    end
  end

  def service_cache_path(service_id)
    File.join(CACHE_DIR, "#{service_id}.cache.json")
  end

  def cache_manifest(svc)
    {
      "serviceId" => svc.fetch("id"),
      "canonicalSwaggerUrl" => canonical_url(svc.fetch("swaggerUrl")),
      "effectiveApiBaseUrl" => effective_api_base_url(svc),
      "sourceFingerprint" => source_fingerprint(svc),
      "cacheSchemaVersion" => CACHE_SCHEMA_VERSION,
      "refreshedAt" => Time.now.utc.iso8601
    }
  end

  def cache_manifest_matches?(manifest, svc)
    return false unless manifest.is_a?(Hash)

    expected = cache_manifest(svc)
    %w[serviceId canonicalSwaggerUrl effectiveApiBaseUrl sourceFingerprint cacheSchemaVersion].all? do |key|
      manifest[key] == expected[key]
    end
  end

  def source_fingerprint(svc)
    identity = {
      "canonicalSwaggerUrl" => canonical_url(svc.fetch("swaggerUrl")),
      "effectiveApiBaseUrl" => effective_api_base_url(svc)
    }
    Digest::SHA256.hexdigest(JSON.generate(identity))
  end

  def effective_api_base_url(svc)
    canonical_url(svc["apiBaseUrl"] || root_url(svc.fetch("swaggerUrl"))).sub(%r{/+\z}, "")
  end

  def canonical_url(url)
    uri = URI(url.to_s.strip)
    uri.fragment = nil
    uri.normalize.to_s
  end

  def document_identity(url)
    canonical_url(url)
  rescue URI::InvalidURIError
    url.to_s
  end

  def map_present(items)
    results = []
    items.each do |item|
      value = yield(item)
      results << value unless value.nil?
    end
    results
  end

  def hash_pick(hash, *keys)
    keys.each_with_object({}) do |key, picked|
      picked[key] = hash[key] if hash.key?(key)
    end
  end
end

class JsonRpcStdio
  def initialize(app)
    @app = app
    @input = STDIN.binmode
    @output = STDOUT.binmode
  end

  def run
    while (message = read_message)
      response = @app.handle(message)
      next unless response

      response[:id] = message["id"] if message.key?("id")
      write_message(response)
    end
  end

  private

  def read_message
    headers = {}
    loop do
      line = @input.gets
      return nil unless line

      line = line.chomp
      break if line.empty?

      key, value = line.split(/:\s*/, 2)
      headers[key.downcase] = value
    end

    length = headers["content-length"].to_i
    return nil if length <= 0

    JSON.parse(@input.read(length))
  end

  def write_message(message)
    body = JSON.generate(message)
    @output.write("Content-Length: #{body.bytesize}\r\n\r\n#{body}")
    @output.flush
  end
end

if $PROGRAM_NAME == __FILE__
  def parse_cli_options(argv)
    options = {}
    parser = OptionParser.new do |opts|
      opts.banner = <<~TEXT
        Usage:
          ruby openapi-mcp.rb                         # run MCP stdio server
          ruby openapi-mcp.rb list-services
          ruby openapi-mcp.rb register-service --id ID --name NAME --swagger-url URL [--api-base-url URL]
          ruby openapi-mcp.rb unregister-service --service SERVICE
          ruby openapi-mcp.rb refresh-service [--service SERVICE]
          ruby openapi-mcp.rb search-endpoints --query QUERY [--service SERVICE] [--limit N]
          ruby openapi-mcp.rb get-endpoint --service SERVICE --method METHOD --path PATH
          ruby openapi-mcp.rb find-schema-field --field FIELD [--service SERVICE] [--limit N]
          ruby openapi-mcp.rb call-endpoint --service SERVICE --method METHOD --path PATH [--path-params JSON] [--query-params JSON] [--headers JSON] [--body JSON] [--timeout-sec N]
      TEXT
      opts.on("--id ID", "Service id to register") { |value| options[:id] = value }
      opts.on("--name NAME", "Service display name to register") { |value| options[:name] = value }
      opts.on("--swagger-url URL", "Swagger UI URL or OpenAPI discovery URL to register") { |value| options[:swagger_url] = value }
      opts.on("--api-base-url URL", "Optional API base URL for endpoint candidates") { |value| options[:api_base_url] = value }
      opts.on("--service SERVICE", "Service id") { |value| options[:service] = value }
      opts.on("--query QUERY", "Search query") { |value| options[:query] = value }
      opts.on("--field FIELD", "Schema field name") { |value| options[:field] = value }
      opts.on("--method METHOD", "HTTP method") { |value| options[:method] = value }
      opts.on("--path PATH", "Endpoint path") { |value| options[:path] = value }
      opts.on("--path-params JSON", "Path template parameters as JSON object") { |value| options[:path_params] = value }
      opts.on("--query-params JSON", "Query string parameters as JSON object") { |value| options[:query_params] = value }
      opts.on("--headers JSON", "Request headers as JSON object") { |value| options[:headers] = value }
      opts.on("--body JSON", "JSON request body") { |value| options[:body] = value }
      opts.on("--timeout-sec N", Integer, "Request timeout seconds") { |value| options[:timeout_sec] = value }
      opts.on("--limit N", Integer, "Result limit") { |value| options[:limit] = value }
      opts.on("-h", "--help", "Show help") do
        puts opts
        exit 0
      end
    end

    parser.parse!(argv)
    [argv.shift, options, parser]
  end

  def require_cli_option!(options, key, command)
    value = options[key]
    return value if value && value.to_s != ""

    raise OptionParser::MissingArgument, "#{command} requires --#{key.to_s.tr("_", "-")}"
  end

  def parse_json_cli_option(options, key, default, command)
    raw = options[key]
    return default if raw.nil? || raw.to_s == ""

    JSON.parse(raw)
  rescue JSON::ParserError => e
    raise OptionParser::InvalidArgument, "#{command} --#{key.to_s.tr("_", "-")} must be valid JSON: #{e.message}"
  end

  def parse_json_object_cli_option(options, key, command)
    parsed = parse_json_cli_option(options, key, {}, command)
    return parsed if parsed.is_a?(Hash)

    raise OptionParser::InvalidArgument, "#{command} --#{key.to_s.tr("_", "-")} must be a JSON object"
  end

  def run_cli(argv)
    command, options, parser = parse_cli_options(argv)
    app = OpenApiMcp.new
    result = case command
             when "list-services"
               app.send(:list_services)
             when "register-service"
               app.send(
                 :register_service,
                 require_cli_option!(options, :id, command),
                 require_cli_option!(options, :name, command),
                 require_cli_option!(options, :swagger_url, command),
                 options[:api_base_url]
               )
             when "unregister-service"
               app.send(:unregister_service, require_cli_option!(options, :service, command))
             when "refresh-service"
               app.send(:refresh_service, options[:service])
             when "search-endpoints"
               app.send(
                 :search_endpoints,
                 require_cli_option!(options, :query, command),
                 options[:service],
                 options[:limit] || 10
               )
             when "get-endpoint"
               app.send(
                 :get_endpoint,
                 require_cli_option!(options, :service, command),
                 require_cli_option!(options, :method, command),
                 require_cli_option!(options, :path, command)
               )
             when "find-schema-field"
               app.send(
                 :find_schema_field,
                 require_cli_option!(options, :field, command),
                 options[:service],
                 options[:limit] || 10
               )
             when "call-endpoint"
               app.send(
                 :call_endpoint,
                 require_cli_option!(options, :service, command),
                 require_cli_option!(options, :method, command),
                 require_cli_option!(options, :path, command),
                 parse_json_object_cli_option(options, :path_params, command),
                 parse_json_object_cli_option(options, :query_params, command),
                 parse_json_object_cli_option(options, :headers, command),
                 parse_json_cli_option(options, :body, nil, command),
                 options.key?(:body),
                 options[:timeout_sec] || TIMEOUT_SEC
               )
             else
               warn parser
               exit 2
             end

    puts JSON.pretty_generate(result)
  rescue OptionParser::ParseError, KeyError => e
    warn e.message
    exit 2
  rescue StandardError => e
    warn "#{e.class}: #{e.message}"
    exit 1
  end

  if ARGV.empty?
    JsonRpcStdio.new(OpenApiMcp.new).run
  else
    run_cli(ARGV)
  end
end

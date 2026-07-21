# frozen_string_literal: true

require "json"
require "fileutils"
require "tmpdir"
require "webrick"
require "yaml"

TEST_ROOT = Dir.mktmpdir("openapi-mcp-test")
at_exit { FileUtils.rm_rf(TEST_ROOT) }
ENV["OPENAPI_MCP_SERVICES_FILE"] = File.join(TEST_ROOT, "services.json")
ENV["OPENAPI_MCP_CACHE_DIR"] = File.join(TEST_ROOT, "cache")

require "minitest/autorun"
require_relative "../openapi-mcp"

class OpenApiMcpTest < Minitest::Test
  def setup
    FileUtils.rm_f(SERVICES_FILE)
    FileUtils.rm_rf(CACHE_DIR)
    FileUtils.mkdir_p(CACHE_DIR)
    @multi_documents = %w[multi-a multi-b]
    @stale_available = true
    @stale_ui_malformed = false
    @block_default_openapi = false
    @spec_requests = Hash.new(0)
    @server = WEBrick::HTTPServer.new(
      Port: 0,
      BindAddress: "127.0.0.1",
      Logger: WEBrick::Log.new(File::NULL),
      AccessLog: []
    )
    @base_url = "http://127.0.0.1:#{@server.listeners.first.addr[1]}"
    mount_test_api
    @thread = Thread.new { @server.start }
    ENV["OPENAPI_MCP_SERVICE_HEADERS"] = JSON.generate(
      "test-api" => {
        "Authorization" => "Bearer secret-token",
        "X-API-Key" => "secret-key"
      }
    )
  end

  def teardown
    @server.shutdown
    @thread.join
    ENV.delete("OPENAPI_MCP_SERVICE_HEADERS")
  end

  def test_call_endpoint_masks_requests_but_returns_response_body_raw_without_caching_it
    app = OpenApiMcp.new
    app.send(:register_service, "test-api", "Test API", "#{@base_url}/swagger-ui/", @base_url)
    app.send(:refresh_service, "test-api")

    get_result = app.send(
      :call_endpoint,
      "test-api",
      "GET",
      "/items/{id}",
      { "id" => "abc" },
      { "page" => 2 },
      {},
      nil,
      false,
      5
    )
    post_result = app.send(
      :call_endpoint,
      "test-api",
      "POST",
      "/items",
      {},
      {},
      {},
      { "name" => "sample", "token" => "body-secret" },
      true,
      5
    )

    assert_equal 200, get_result.dig(:response, :status)
    assert_equal true, get_result[:documented]
    assert_equal true, get_result.dig(:validation, :ok)
    assert_equal "2", get_result.dig(:response, :body, "query", "page")
    assert_includes get_result.dig(:request, :headers, "Authorization"), "***"

    assert_equal 201, post_result.dig(:response, :status)
    assert_equal "sample", post_result.dig(:response, :body, "body", "name")
    assert_equal "***", post_result.dig(:request, :body, "token")
    assert_equal "body-secret", post_result.dig(:response, :body, "body", "token")
    assert_equal "secret-key", post_result.dig(:response, :body, "apiKey")
    assert_equal "diagnostic-token", post_result.dig(:response, :body, "access_token")
    assert_equal "diagnostic-password", post_result.dig(:response, :body, "password")

    rpc_result = app.handle(
      "method" => "tools/call",
      "params" => {
        "name" => "call_endpoint",
        "arguments" => {
          "service" => "test-api",
          "method" => "POST",
          "path" => "/items",
          "body" => { "name" => "through-mcp", "token" => "mcp-secret" },
          "timeoutSec" => 5
        }
      }
    )
    rpc_payload = JSON.parse(rpc_result.dig(:result, :content, 0, :text))
    assert_equal "***", rpc_payload.dig("request", "body", "token")
    assert_equal "mcp-secret", rpc_payload.dig("response", "body", "body", "token")
    assert_equal "diagnostic-token", rpc_payload.dig("response", "body", "access_token")

    cache_contents = Dir[File.join(CACHE_DIR, "**", "*")].select { |path| File.file?(path) }.map { |path| File.read(path) }.join
    refute_includes cache_contents, "mcp-secret"
    refute_includes cache_contents, "diagnostic-token"
    refute_includes cache_contents, "diagnostic-password"
  end

  def test_same_service_id_replacement_invalidates_cache_and_uses_new_source
    app = OpenApiMcp.new
    app.send(:register_service, "replace-api", "Source A", "#{@base_url}/spec-a.json", "#{@base_url}/v1")

    assert_equal 1, app.send(:search_endpoints, "alpha", "replace-api")[:count]

    app.send(:register_service, "replace-api", "Source B", "#{@base_url}/spec-b.json", "#{@base_url}/v2")

    assert_equal 1, app.send(:search_endpoints, "beta", "replace-api")[:count]
    assert_equal 0, app.send(:search_endpoints, "alpha", "replace-api")[:count]
    endpoint = app.send(:get_endpoint, "replace-api", "GET", "/beta")
    assert_equal "#{@base_url}/v2/beta", endpoint.dig(:urls, "endpointUrl")

    manifest = cache_record("replace-api").fetch("manifest")
    assert_equal "#{@base_url}/spec-b.json", manifest.fetch("canonicalSwaggerUrl")
    assert_equal "#{@base_url}/v2", manifest.fetch("effectiveApiBaseUrl")
    assert_equal CACHE_SCHEMA_VERSION, manifest.fetch("cacheSchemaVersion")
    assert_match(/\A[0-9a-f]{64}\z/, manifest.fetch("sourceFingerprint"))
  end

  def test_api_base_url_change_alone_invalidates_cached_endpoint_urls
    app = OpenApiMcp.new
    swagger_url = "#{@base_url}/spec-a.json"
    app.send(:register_service, "base-api", "Base API", swagger_url, "#{@base_url}/v1/")
    first = app.send(:get_endpoint, "base-api", "GET", "/alpha")
    first_fetches = @spec_requests["spec-a"]

    app.send(:register_service, "base-api", "Base API", swagger_url, "#{@base_url}/v2")
    second = app.send(:get_endpoint, "base-api", "GET", "/alpha")

    assert_equal "#{@base_url}/v1/alpha", first.dig(:urls, "endpointUrl")
    assert_equal "#{@base_url}/v2/alpha", second.dig(:urls, "endpointUrl")
    assert_operator @spec_requests["spec-a"], :>, first_fetches
  end

  def test_fragment_only_swagger_url_change_reuses_source_but_refreshes_presented_urls
    app = OpenApiMcp.new
    app.send(:register_service, "fragment-api", "Fragment API", "#{@base_url}/spec-a.json#/A", @base_url)
    app.send(:get_endpoint, "fragment-api", "GET", "/alpha")
    first_fetches = @spec_requests["spec-a"]

    app.send(:register_service, "fragment-api", "Fragment API", "#{@base_url}/spec-a.json#/B", @base_url)
    endpoint = app.send(:get_endpoint, "fragment-api", "GET", "/alpha")

    assert_equal "#{@base_url}/spec-a.json#/B", endpoint.dig(:urls, "swaggerUrl")
    assert_equal "#{@base_url}/spec-a.json#/B", endpoint[:documentUrl]
    assert_equal first_fetches, @spec_requests["spec-a"]
  end

  def test_unregister_removes_registry_and_cache
    app = OpenApiMcp.new
    app.send(:register_service, "remove-api", "Remove API", "#{@base_url}/spec-a.json", @base_url)
    app.send(:refresh_service, "remove-api")
    app.send(:register_service, "remove-api-other", "Other API", "#{@base_url}/spec-b.json", @base_url)
    app.send(:refresh_service, "remove-api-other")
    cache_path = File.join(CACHE_DIR, "remove-api.cache.json")
    other_cache_path = File.join(CACHE_DIR, "remove-api-other.cache.json")
    assert File.exist?(cache_path)
    assert File.exist?(other_cache_path)

    app.send(:unregister_service, "remove-api")

    refute File.exist?(cache_path)
    assert File.exist?(other_cache_path)
    assert_equal ["remove-api-other"], app.send(:list_services)[:services].map { |svc| svc[:id] }
  end

  def test_refresh_replaces_complete_document_set_and_prunes_removed_docs
    app = OpenApiMcp.new
    app.send(:register_service, "multi-api", "Multi API", "#{@base_url}/multi/", @base_url)
    app.send(:refresh_service, "multi-api")
    assert_equal 2, app.send(:list_services)[:services].first[:cachedDocuments]
    assert_equal 1, app.send(:search_endpoints, "alpha", "multi-api")[:count]

    @multi_documents = ["multi-b"]
    app.send(:refresh_service, "multi-api")

    assert_equal 1, app.send(:list_services)[:services].first[:cachedDocuments]
    assert_equal 0, app.send(:search_endpoints, "alpha", "multi-api")[:count]
    assert_equal 1, app.send(:search_endpoints, "beta", "multi-api")[:count]
    assert_equal ["#{@base_url}/multi-b.json"], cache_record("multi-api").fetch("documents").map { |doc| doc.fetch("documentUrl") }
  end

  def test_stale_fallback_is_kept_only_for_the_same_source_identity
    app = OpenApiMcp.new
    app.send(:register_service, "stale-api", "Stale API", "#{@base_url}/stale.json", @base_url)
    app.send(:refresh_service, "stale-api")
    @stale_available = false

    same_source = app.send(:refresh_service, "stale-api")
    assert_equal true, same_source.dig(:refreshed, 0, :documents, 0, :stale)
    assert_equal 1, app.send(:search_endpoints, "stale alpha", "stale-api")[:count]

    app.send(:register_service, "stale-api", "Broken replacement", "#{@base_url}/missing.json", @base_url)
    changed_source = app.send(:refresh_service, "stale-api")

    assert_equal false, changed_source.dig(:refreshed, 0, :ok)
    assert_equal 0, app.send(:search_endpoints, "stale alpha", "stale-api")[:count]
    assert_empty cache_record("stale-api").fetch("documents")
  end

  def test_same_source_stale_cache_survives_malformed_discovery_fallbacks
    app = OpenApiMcp.new
    app.send(:register_service, "stale-ui-api", "Stale UI API", "#{@base_url}/stale-ui/", @base_url)
    app.send(:refresh_service, "stale-ui-api")
    @stale_ui_malformed = true
    @block_default_openapi = true

    result = app.send(:refresh_service, "stale-ui-api")

    assert_equal true, result.dig(:refreshed, 0, :ok)
    assert_equal true, result.dig(:refreshed, 0, :documents, 0, :stale)
    assert_match(/HTTP 404/, result.dig(:refreshed, 0, :documents, 0, :error))
    assert_equal 1, app.send(:search_endpoints, "heuristic stale", "stale-ui-api")[:count]
    assert_equal true, cache_record("stale-ui-api").dig("documents", 0, "stale")
  end

  def test_cache_schema_version_mismatch_forces_rebuild
    app = OpenApiMcp.new
    app.send(:register_service, "version-api", "Version API", "#{@base_url}/spec-a.json", @base_url)
    app.send(:refresh_service, "version-api")
    before = @spec_requests["spec-a"]
    record = cache_record("version-api")
    record.fetch("manifest")["cacheSchemaVersion"] = CACHE_SCHEMA_VERSION - 1
    File.write(File.join(CACHE_DIR, "version-api.cache.json"), JSON.pretty_generate(record))

    assert_equal 1, app.send(:search_endpoints, "alpha", "version-api")[:count]

    assert_operator @spec_requests["spec-a"], :>, before
    assert_equal CACHE_SCHEMA_VERSION, cache_record("version-api").dig("manifest", "cacheSchemaVersion")
  end

  def test_direct_json_and_yaml_openapi_urls_are_discovered_as_documents
    app = OpenApiMcp.new
    app.send(:register_service, "json-api", "JSON API", "#{@base_url}/direct", @base_url)
    json_refresh = app.send(:refresh_service, "json-api")

    app.send(:register_service, "yaml-api", "YAML API", "#{@base_url}/direct-yaml", @base_url)
    yaml_refresh = app.send(:refresh_service, "yaml-api")

    assert_equal true, json_refresh.dig(:refreshed, 0, :ok)
    assert_equal 1, json_refresh.dig(:refreshed, 0, :documents)&.length
    assert_equal 1, app.send(:search_endpoints, "direct json", "json-api")[:count]
    assert_equal true, yaml_refresh.dig(:refreshed, 0, :ok)
    assert_equal 1, yaml_refresh.dig(:refreshed, 0, :documents)&.length
    assert_equal 1, app.send(:search_endpoints, "direct yaml", "yaml-api")[:count]
  end

  private

  def mount_test_api
    @server.mount_proc("/swagger-ui/") do |_req, res|
      res["Content-Type"] = "text/html"
      res.body = "<script>window.ui = SwaggerUIBundle({url: '/openapi.json'});</script>"
    end

    @server.mount_proc("/openapi.json") do |_req, res|
      if @block_default_openapi
        res.status = 404
        res.body = "missing"
      else
        res["Content-Type"] = "application/json"
        res.body = JSON.generate(test_spec)
      end
    end

    @server.mount_proc("/spec-a.json") do |_req, res|
      @spec_requests["spec-a"] += 1
      json_response(res, endpoint_spec("/alpha", "Alpha endpoint"))
    end

    @server.mount_proc("/spec-b.json") do |_req, res|
      @spec_requests["spec-b"] += 1
      json_response(res, endpoint_spec("/beta", "Beta endpoint"))
    end

    @server.mount_proc("/direct") do |_req, res|
      json_response(res, endpoint_spec("/direct-json", "Direct JSON endpoint"))
    end

    @server.mount_proc("/direct-yaml") do |_req, res|
      res["Content-Type"] = "application/yaml"
      res.body = YAML.dump(endpoint_spec("/direct-yaml", "Direct YAML endpoint", version: "2.0"))
    end

    @server.mount_proc("/multi/") do |_req, res|
      urls = @multi_documents.map { |name| "{url: '/#{name}.json', name: '#{name}'}" }.join(",")
      res["Content-Type"] = "text/html"
      res.body = "<script>SwaggerUIBundle({urls: [#{urls}]});</script>"
    end

    @server.mount_proc("/multi-a.json") do |_req, res|
      json_response(res, endpoint_spec("/multi-alpha", "Multi Alpha endpoint"))
    end

    @server.mount_proc("/multi-b.json") do |_req, res|
      json_response(res, endpoint_spec("/multi-beta", "Multi Beta endpoint"))
    end

    @server.mount_proc("/stale.json") do |_req, res|
      if @stale_available
        json_response(res, endpoint_spec("/stale-alpha", "Stale Alpha endpoint"))
      else
        res.status = 503
        res.body = "unavailable"
      end
    end

    @server.mount_proc("/stale-ui/") do |_req, res|
      res["Content-Type"] = "text/html"
      res.body = if @stale_ui_malformed
                   "<html>broken discovery</html>"
                 else
                   "<script>SwaggerUIBundle({url: '/stale-ui-spec.json'});</script>"
                 end
    end

    @server.mount_proc("/stale-ui-spec.json") do |_req, res|
      json_response(res, endpoint_spec("/heuristic-stale", "Heuristic Stale endpoint"))
    end

    @server.mount_proc("/missing.json") do |_req, res|
      res.status = 404
      res.body = "missing"
    end

    @server.mount_proc("/items/abc") do |req, res|
      res["Content-Type"] = "application/json"
      res.body = JSON.generate({ id: "abc", query: req.query, auth: req["authorization"] })
    end

    @server.mount_proc("/items") do |req, res|
      res.status = 201
      res["Content-Type"] = "application/json"
      res.body = JSON.generate(
        {
          created: true,
          body: JSON.parse(req.body),
          apiKey: req["x-api-key"],
          access_token: "diagnostic-token",
          password: "diagnostic-password"
        }
      )
    end
  end

  def json_response(response, body)
    response["Content-Type"] = "application/json"
    response.body = JSON.generate(body)
  end

  def endpoint_spec(path, summary, version: "3.0.0")
    marker = version == "2.0" ? { "swagger" => version } : { "openapi" => version }
    marker.merge(
      "info" => { "title" => summary, "version" => "1" },
      "paths" => {
        path => {
          "get" => {
            "summary" => summary,
            "responses" => { "200" => { "description" => "ok" } }
          }
        }
      }
    )
  end

  def cache_record(service_id)
    JSON.parse(File.read(File.join(CACHE_DIR, "#{service_id}.cache.json")))
  end

  def test_spec
    {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1" },
      paths: {
        "/items/{id}" => {
          get: {
            summary: "Get item",
            parameters: [
              { name: "id", in: "path", required: true, schema: { type: "string" } },
              { name: "page", in: "query", required: true, schema: { type: "integer" } },
              { name: "Authorization", in: "header", required: true, schema: { type: "string" } }
            ],
            responses: { "200" => { description: "ok", content: { "application/json" => { schema: { type: "object" } } } } }
          }
        },
        "/items" => {
          post: {
            summary: "Create item",
            requestBody: { required: true, content: { "application/json" => { schema: { type: "object" } } } },
            responses: { "201" => { description: "created", content: { "application/json" => { schema: { type: "object" } } } } }
          }
        }
      }
    }
  end
end

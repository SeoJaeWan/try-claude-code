# frozen_string_literal: true

require "json"
require "fileutils"
require "tmpdir"
require "webrick"

TEST_ROOT = Dir.mktmpdir("openapi-mcp-test")
at_exit { FileUtils.rm_rf(TEST_ROOT) }
ENV["OPENAPI_MCP_SERVICES_FILE"] = File.join(TEST_ROOT, "services.json")
ENV["OPENAPI_MCP_CACHE_DIR"] = File.join(TEST_ROOT, "cache")

require "minitest/autorun"
require_relative "../openapi-mcp"

class OpenApiMcpTest < Minitest::Test
  def setup
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

  def test_call_endpoint_handles_auth_path_query_body_and_masking
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
  end

  private

  def mount_test_api
    @server.mount_proc("/swagger-ui/") do |_req, res|
      res["Content-Type"] = "text/html"
      res.body = "<script>window.ui = SwaggerUIBundle({url: '/openapi.json'});</script>"
    end

    @server.mount_proc("/openapi.json") do |_req, res|
      res["Content-Type"] = "application/json"
      res.body = JSON.generate(test_spec)
    end

    @server.mount_proc("/items/abc") do |req, res|
      res["Content-Type"] = "application/json"
      res.body = JSON.generate({ id: "abc", query: req.query, auth: req["authorization"] })
    end

    @server.mount_proc("/items") do |req, res|
      res.status = 201
      res["Content-Type"] = "application/json"
      res.body = JSON.generate({ created: true, body: JSON.parse(req.body), apiKey: req["x-api-key"] })
    end
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

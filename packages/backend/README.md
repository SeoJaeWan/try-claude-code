# @seojaewan/backend

Backend CLI — package-owned manifest for Spring Boot file generation.

## Install

```bash
npm i -g @seojaewan/backend
```

## Quick Start

```bash
backend --help
backend module --help
backend module --json "{\"name\":\"Product\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}"
backend requestDto --json "{\"name\":\"CreateProductRequest\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}"
```

`backend --help` returns a manifest-driven summary JSON with all available commands, whenToUse guidance, and workflow flows.
Use `backend <command> --help` for command-scoped detail before scaffolding.

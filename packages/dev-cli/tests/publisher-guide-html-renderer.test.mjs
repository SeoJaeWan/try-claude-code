import test from "node:test";
import assert from "node:assert/strict";

import { renderPublisherGuideHtml } from "../src/core/publisher-guide-html-renderer.mjs";

test("renderer는 summary, nav, command section용 stable testid를 포함한 self-contained HTML을 만든다", () => {
  const html = renderPublisherGuideHtml({
    readOnly: true,
    profile: {
      alias: "tcp",
      id: "publisher/personal/v1",
      role: "publisher",
      mode: "personal",
      version: "v1",
      summary: "퍼블리셔 personal v1 규칙",
      groups: []
    },
    sections: [
      {
        id: "component",
        title: "component",
        description: "Generate a publisher UI component file",
        meta: {
          inputMode: "json",
          executionKind: "file"
        },
        groups: [
          {
            id: "guide",
            title: "Guide",
            value: {
              목적: "컴포넌트 생성"
            }
          },
          {
            id: "render",
            title: "Render",
            value: {
              output: {
                filePattern: "{path}/index.tsx"
              }
            }
          }
        ]
      }
    ]
  });

  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /data-testid="publisher-guide-page"/);
  assert.match(html, /data-testid="publisher-guide-summary"/);
  assert.match(html, /data-testid="publisher-guide-readonly-badge"/);
  assert.match(html, /data-testid="publisher-guide-nav"/);
  assert.match(html, /data-testid="publisher-guide-nav-item-component"/);
  assert.match(html, /data-testid="publisher-guide-command-component"/);
  assert.match(html, /data-testid="publisher-guide-group-component-guide"/);
  assert.match(html, /data-testid="publisher-guide-group-component-render"/);
});

test("renderer는 guide/example 문자열을 escape해 raw HTML 삽입을 막는다", () => {
  const html = renderPublisherGuideHtml({
    readOnly: true,
    profile: {
      alias: "tcp",
      id: "publisher/personal/v1",
      role: "publisher",
      mode: "personal",
      version: "v1",
      summary: "<script>alert(1)</script>",
      groups: []
    },
    sections: [
      {
        id: "component",
        title: "component",
        description: "Generate",
        meta: {},
        groups: [
          {
            id: "examples",
            title: "Examples",
            kind: "examples",
            value: ["tcp component --json '{\"name\":\"<script>\"}'"]
          }
        ]
      }
    ]
  });

  assert.equal(html.includes("<script>alert(1)</script>"), false);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("command filter가 전달되면 해당 command section만 렌더한다", () => {
  const html = renderPublisherGuideHtml(
    {
      readOnly: true,
      profile: {
        alias: "tcp",
        id: "publisher/personal/v1",
        role: "publisher",
        mode: "personal",
        version: "v1",
        summary: "퍼블리셔 personal v1 규칙",
        groups: []
      },
      sections: [
        {
          id: "component",
          title: "component",
          description: "Generate component",
          meta: {},
          groups: []
        },
        {
          id: "uiState",
          title: "uiState",
          description: "Generate UI state",
          meta: {},
          groups: []
        }
      ]
    },
    {
      activeCommandId: "uiState"
    }
  );

  assert.match(html, /publisher-guide-command-uiState/);
  assert.doesNotMatch(html, /publisher-guide-command-component/);
});

test("renderer는 read-only page에 edit save version action locator를 만들지 않는다", () => {
  const html = renderPublisherGuideHtml({
    readOnly: true,
    profile: {
      alias: "tcp",
      id: "publisher/personal/v1",
      role: "publisher",
      mode: "personal",
      version: "v1",
      summary: "퍼블리셔 personal v1 규칙",
      groups: []
    },
    sections: []
  });

  assert.doesNotMatch(html, /publisher-guide-edit-action/);
  assert.doesNotMatch(html, /publisher-guide-save-action/);
  assert.doesNotMatch(html, /publisher-guide-version-action/);
});

import test from "node:test";
import assert from "node:assert/strict";

import { resolveRefs } from "../src/core/execution/ref-resolver.mjs";

test("ref resolver는 앞선 op 결과를 참조값으로 해석한다", () => {
  const resolved = resolveRefs(
    {
      componentName: {
        $ref: "component.normalizedSpec.name"
      }
    },
    {
      component: {
        normalizedSpec: {
          name: "HomePage"
        }
      }
    }
  );

  assert.equal(resolved.componentName, "HomePage");
});

test("ref resolver는 알 수 없거나 아직 생성되지 않은 참조를 거부한다", () => {
  assert.throws(
    () =>
      resolveRefs(
        {
          componentName: {
            $ref: "component.normalizedSpec.name"
          }
        },
        {}
      ),
    (error) => error.code === "INVALID_REF"
  );
});

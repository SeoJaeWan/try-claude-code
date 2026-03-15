import test from "node:test";
import assert from "node:assert/strict";

import { routeCommand } from "../src/core/command-router.mjs";

test("routeCommand maps alias to role and generate action", () => {
  const route = routeCommand("tcp", {
    positionals: ["component", "HomePage"],
    options: {
      path: "page/homePage",
      dryRun: true
    }
  });

  assert.equal(route.role, "publisher");
  assert.equal(route.action, "generate");
  assert.equal(route.commandName, "component");
  assert.equal(route.name, "HomePage");
});

test("routeCommand throws for unknown alias", () => {
  assert.throws(
    () =>
      routeCommand("unknown", {
        positionals: [],
        options: {}
      }),
    /Unknown alias/
  );
});

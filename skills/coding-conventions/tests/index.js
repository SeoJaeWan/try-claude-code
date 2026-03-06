const path = require("path");
const { pathToFileURL } = require("url");

const files = [
  "test_component.test.mjs",
  "test_hook.test.mjs",
  "test_structure.test.mjs",
  "test_api_hook.test.mjs",
  "test_test_suite.test.mjs",
  "test_naming.test.mjs",
];

(async () => {
  for (const file of files) {
    const fileUrl = pathToFileURL(path.join(__dirname, file)).href;
    await import(fileUrl);
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


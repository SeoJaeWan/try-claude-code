import assert from "node:assert/strict";

function scalar(raw, label) {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  assert.notEqual(value, "", `${label} must have a scalar value`);
  return value;
}

export function parseOpenaiMetadata(text, label) {
  assert.doesNotMatch(text, /\t/, `${label} must not use tabs`);
  const result = {};
  let section;
  let tool;

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;

    const top = line.match(/^([a-z_]+):\s*$/);
    if (top) {
      section = top[1];
      assert.equal(result[section], undefined, `${label}:${index + 1} duplicates ${section}`);
      result[section] = {};
      tool = undefined;
      continue;
    }

    assert.notEqual(section, undefined, `${label}:${index + 1} has content before a section`);

    const levelTwo = line.match(/^  ([a-z_]+):(?:\s*(.*))?$/);
    if (levelTwo) {
      const [, key, raw = ""] = levelTwo;
      if (section === "dependencies" && key === "tools" && raw === "") {
        result.dependencies.tools = [];
      } else {
        assert.notEqual(raw, "", `${label}:${index + 1} must use a scalar`);
        result[section][key] = scalar(raw, `${label}:${index + 1}`);
      }
      tool = undefined;
      continue;
    }

    const listStart = line.match(/^    - ([a-z_]+):\s*(.+)$/);
    if (listStart && section === "dependencies" && Array.isArray(result.dependencies.tools)) {
      tool = { [listStart[1]]: scalar(listStart[2], `${label}:${index + 1}`) };
      result.dependencies.tools.push(tool);
      continue;
    }

    const listField = line.match(/^      ([a-z_]+):\s*(.+)$/);
    if (listField && tool) {
      tool[listField[1]] = scalar(listField[2], `${label}:${index + 1}`);
      continue;
    }

    assert.fail(`${label}:${index + 1} uses unsupported or malformed YAML: ${line}`);
  }

  return result;
}

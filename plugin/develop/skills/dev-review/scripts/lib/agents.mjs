import fs from "node:fs";
import path from "node:path";

const FRONTMATTER = /^---\s*\n([\s\S]*?)\n---/m;
const YAML_FIELD = (field) =>
  new RegExp(`^${field}\\s*:\\s*(["']?)(.*?)\\1\\s*$`, "m");

/**
 * 주어진 디렉터리들에서 `.md` 에이전트 파일을 스캔해 frontmatter의 name/
 * description 을 추출한다. 같은 name 이 여러 디렉터리에 있으면 먼저 발견한
 * 항목이 우선한다. 결과는 name 알파벳 순으로 정렬되어 반환된다.
 *
 * @param {string[]} dirs - 검색할 디렉터리 경로 목록.
 * @param {{warn?: Function}} [logger] - 경고 메시지를 출력할 로거.
 * @returns {Array<{name: string, description: string}>}
 */
export function discoverAvailableAgents(dirs, logger) {
  const seen = new Map();

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch (err) {
      logger?.warn(`cannot read agents dir ${dir}: ${err.message}`);
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const filePath = path.join(dir, entry);
      let text;
      try {
        text = fs.readFileSync(filePath, "utf8");
      } catch (err) {
        logger?.warn(`cannot read agent file ${filePath}: ${err.message}`);
        continue;
      }
      const fm = text.match(FRONTMATTER);
      if (!fm) {
        logger?.warn(`agent file missing frontmatter: ${filePath}`);
        continue;
      }
      const nameMatch = fm[1].match(YAML_FIELD("name"));
      const descMatch = fm[1].match(YAML_FIELD("description"));
      if (!nameMatch) {
        logger?.warn(`agent file missing name: ${filePath}`);
        continue;
      }
      const name = nameMatch[2].trim();
      const description = descMatch ? descMatch[2].trim() : "";
      if (!seen.has(name)) {
        seen.set(name, { name, description });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * 에이전트 검색의 기본 디렉터리 목록을 만든다.
 *
 * - 워크스페이스 로컬 위치(`plugin/develop/agents`, `.claude/agents`).
 *   `plugin/develop/agents` 항목은 본 제너레이터가 플러그인 자체 소스 트리
 *   안에서 실행될 때를 커버하며, 설치/소비자 환경에서는 존재하지 않는 경로로
 *   해석되어 위의 existsSync 게이트에서 조용히 건너뛴다.
 * - 플러그인 로컬 위치(`${CLAUDE_PLUGIN_ROOT}/agents`).
 *   `CLAUDE_PLUGIN_ROOT` 는 `.claude-plugin/plugin.json` 이 위치한 디렉터리를
 *   가리킨다(이 플러그인의 경우 소스 트리에선 `plugin/develop/`, 설치 환경
 *   에선 캐시 루트). 환경 변수 상속을 신뢰할 수 없는 호출자는 이 fallback
 *   대신 `--available-agents-dir` 를 명시적으로 전달해야 한다.
 *
 * @param {string} workspaceRoot - 워크스페이스 루트 절대 경로.
 * @returns {string[]} 검색 디렉터리 절대 경로 배열.
 */
export function defaultAgentsDirs(workspaceRoot) {
  const dirs = [
    path.resolve(workspaceRoot, "plugin/develop/agents"),
    path.resolve(workspaceRoot, ".claude/agents"),
  ];

  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (pluginRoot) {
    dirs.push(path.resolve(pluginRoot, "agents"));
  }

  return dirs;
}

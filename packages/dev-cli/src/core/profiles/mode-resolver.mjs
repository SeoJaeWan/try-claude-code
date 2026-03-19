import {
  getProfileSelection,
  readGlobalConfig
} from "./config-store.mjs";
import {
  assertProfileVersion
} from "./version-utils.mjs";

export async function resolveActiveProfile({
  alias
}) {
  const globalConfig = await readGlobalConfig();
  const globalSelection = getProfileSelection(globalConfig, alias);
  if (globalSelection?.mode && globalSelection?.version) {
    const version = assertProfileVersion(globalSelection.version);

    return {
      source: "global",
      mode: globalSelection.mode,
      version,
      majorVersion: version
    };
  }

  return null;
}

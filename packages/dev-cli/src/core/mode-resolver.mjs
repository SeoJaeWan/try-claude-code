import {
  getProfileSelection,
  readGlobalConfig
} from "./config-store.mjs";
import {
  assertProfileVersion
} from "./version-utils.mjs";

export async function resolveActiveProfile({
  role
}) {
  const globalConfig = await readGlobalConfig();
  const globalSelection = getProfileSelection(globalConfig, role);
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

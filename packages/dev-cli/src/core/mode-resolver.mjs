import {
  getProfileSelection,
  readConfigs
} from "./config-store.mjs";

function parseProfileInput(rawValue) {
  if (!rawValue) {
    return null;
  }

  if (rawValue.includes("/")) {
    const [mode, version] = rawValue.split("/");
    if (mode && version) {
      return {
        mode,
        version
      };
    }
  }

  if (rawValue.includes("@")) {
    const [mode, version] = rawValue.split("@");
    if (mode && version) {
      return {
        mode,
        version
      };
    }
  }

  return {
    mode: rawValue,
    version: null
  };
}

export async function resolveActiveProfile({
  role,
  repoRoot,
  options
}) {
  const explicitProfile = parseProfileInput(options.profile);
  if (explicitProfile?.mode) {
    return {
      source: "explicit",
      mode: explicitProfile.mode,
      version: explicitProfile.version ?? options.version ?? "v1"
    };
  }

  if (options.mode) {
    const explicitMode = parseProfileInput(options.mode);
    return {
      source: "explicit",
      mode: explicitMode.mode,
      version: explicitMode.version ?? options.version ?? "v1"
    };
  }

  if (options.version) {
    return {
      source: "explicit",
      mode: "personal",
      version: options.version
    };
  }

  const { globalConfig, repoConfig } = await readConfigs(repoRoot);
  const repoSelection = getProfileSelection(repoConfig, role);
  if (repoSelection?.mode && repoSelection?.version) {
    return {
      source: "repo",
      mode: repoSelection.mode,
      version: repoSelection.version
    };
  }

  const globalSelection = getProfileSelection(globalConfig, role);
  if (globalSelection?.mode && globalSelection?.version) {
    return {
      source: "global",
      mode: globalSelection.mode,
      version: globalSelection.version
    };
  }

  return {
    source: "default",
    mode: "personal",
    version: "v1"
  };
}

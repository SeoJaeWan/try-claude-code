import {
  getProfileSelection,
  readConfigs
} from "./config-store.mjs";
import {
  assertProfileVersion
} from "./version-utils.mjs";

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
    const version = assertProfileVersion(
      explicitProfile.version ?? options.version ?? "v1"
    );

    return {
      source: "explicit",
      mode: explicitProfile.mode,
      version,
      majorVersion: version
    };
  }

  if (options.mode) {
    const explicitMode = parseProfileInput(options.mode);
    const version = assertProfileVersion(
      explicitMode.version ?? options.version ?? "v1"
    );

    return {
      source: "explicit",
      mode: explicitMode.mode,
      version,
      majorVersion: version
    };
  }

  if (options.version) {
    const version = assertProfileVersion(options.version);

    return {
      source: "explicit",
      mode: "personal",
      version,
      majorVersion: version
    };
  }

  const { globalConfig, repoConfig } = await readConfigs(repoRoot);
  const repoSelection = getProfileSelection(repoConfig, role);
  if (repoSelection?.mode && repoSelection?.version) {
    const version = assertProfileVersion(repoSelection.version);

    return {
      source: "repo",
      mode: repoSelection.mode,
      version,
      majorVersion: version
    };
  }

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

  const version = "v1";
  return {
    source: "default",
    mode: "personal",
    version,
    majorVersion: version
  };
}

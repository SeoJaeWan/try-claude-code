import {
  getProfileSelection,
  readConfigs
} from "./config-store.mjs";
import {
  assertProfileVersion,
  extractMajorProfileVersion
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
    requestedVersion: null
  };
}

export async function resolveActiveProfile({
  role,
  repoRoot,
  options
}) {
  const explicitProfile = parseProfileInput(options.profile);
  if (explicitProfile?.mode) {
    const requestedVersion = assertProfileVersion(
      explicitProfile.version ?? explicitProfile.requestedVersion ?? options.version ?? "v1"
    );

    return {
      source: "explicit",
      mode: explicitProfile.mode,
      version: requestedVersion,
      requestedVersion,
      majorVersion: extractMajorProfileVersion(requestedVersion)
    };
  }

  if (options.mode) {
    const explicitMode = parseProfileInput(options.mode);
    const requestedVersion = assertProfileVersion(
      explicitMode.version ?? explicitMode.requestedVersion ?? options.version ?? "v1"
    );

    return {
      source: "explicit",
      mode: explicitMode.mode,
      version: requestedVersion,
      requestedVersion,
      majorVersion: extractMajorProfileVersion(requestedVersion)
    };
  }

  if (options.version) {
    const requestedVersion = assertProfileVersion(options.version);

    return {
      source: "explicit",
      mode: "personal",
      version: requestedVersion,
      requestedVersion,
      majorVersion: extractMajorProfileVersion(requestedVersion)
    };
  }

  const { globalConfig, repoConfig } = await readConfigs(repoRoot);
  const repoSelection = getProfileSelection(repoConfig, role);
  if (repoSelection?.mode && repoSelection?.requestedVersion) {
    const requestedVersion = assertProfileVersion(repoSelection.requestedVersion);

    return {
      source: "repo",
      mode: repoSelection.mode,
      version: requestedVersion,
      requestedVersion,
      majorVersion: extractMajorProfileVersion(requestedVersion),
      resolvedVersion: repoSelection.resolvedVersion ?? null,
      resolvedRef: repoSelection.resolvedRef ?? null
    };
  }

  const globalSelection = getProfileSelection(globalConfig, role);
  if (globalSelection?.mode && globalSelection?.requestedVersion) {
    const requestedVersion = assertProfileVersion(globalSelection.requestedVersion);

    return {
      source: "global",
      mode: globalSelection.mode,
      version: requestedVersion,
      requestedVersion,
      majorVersion: extractMajorProfileVersion(requestedVersion),
      resolvedVersion: globalSelection.resolvedVersion ?? null,
      resolvedRef: globalSelection.resolvedRef ?? null
    };
  }

  const requestedVersion = "v1";
  return {
    source: "default",
    mode: "personal",
    version: requestedVersion,
    requestedVersion,
    majorVersion: requestedVersion
  };
}

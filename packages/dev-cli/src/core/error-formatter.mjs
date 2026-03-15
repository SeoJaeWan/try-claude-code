function normalizeDetails(details) {
  return details ?? {};
}

export function createErrorPayload(code, message, details = {}, exitCode = 1) {
  return {
    ok: false,
    error: {
      code,
      message,
      details: normalizeDetails(details)
    },
    exitCode
  };
}

export function errorToPayload(error) {
  if (error?.code && error?.message) {
    return createErrorPayload(error.code, error.message, error.details);
  }

  return createErrorPayload(
    "UNHANDLED_ERROR",
    error instanceof Error ? error.message : String(error)
  );
}

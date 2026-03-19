function pickFields(payload, fields) {
  if (!fields) {
    return payload;
  }

  const requested = fields
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return requested.reduce((accumulator, field) => {
    if (field in payload) {
      accumulator[field] = payload[field];
    }
    return accumulator;
  }, {});
}

export function formatOutput(payload, format, fields) {
  const exitCode = payload.ok === false ? payload.exitCode ?? 1 : 0;
  if (format === "text") {
    const textPayload =
      typeof payload.payload === "string"
        ? payload.payload
        : Array.isArray(payload.results)
          ? JSON.stringify(pickFields(payload, fields), null, 2)
        : payload.ok !== false && payload.result?.kind === "snippet"
          ? payload.result.code
        : payload.ok !== false && Array.isArray(payload.files)
            ? payload.files.map((file) => file.path).join("\n")
        : payload.ok === false && payload.error
          ? [
              `${payload.error.code}: ${payload.error.message}`,
              ...(payload.error.details && Object.keys(payload.error.details).length > 0
                ? [JSON.stringify(payload.error.details, null, 2)]
                : [])
            ].join("\n")
          : JSON.stringify(pickFields(payload, fields), null, 2);

    return {
      exitCode,
      text: `${textPayload}\n`
    };
  }

  const jsonPayload =
    payload.format === "json" && "payload" in payload ? payload.payload : payload;

  return {
    exitCode,
    text: `${JSON.stringify(pickFields(jsonPayload, fields), null, 2)}\n`
  };
}

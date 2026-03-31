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

export function formatOutput(payload, fields) {
  const exitCode = payload.ok === false ? payload.exitCode ?? 1 : 0;

  return {
    exitCode,
    text: `${JSON.stringify(pickFields(payload, fields), null, 2)}\n`
  };
}

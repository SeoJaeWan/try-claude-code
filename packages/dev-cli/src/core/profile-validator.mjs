import { validateBackendRequest } from "../validators/backend-validator.mjs";
import { validateFrontendRequest } from "../validators/frontend-validator.mjs";
import { validatePublisherRequest } from "../validators/publisher-validator.mjs";

const VALIDATORS = {
  publisher: validatePublisherRequest,
  frontend: validateFrontendRequest,
  backend: validateBackendRequest
};

export async function validateRequest({
  role,
  profile,
  commandName,
  args,
  files,
  repoRoot
}) {
  const validator = VALIDATORS[role];
  if (!validator) {
    return {
      ok: true,
      checks: []
    };
  }

  return validator({
    profile,
    commandName,
    args,
    files,
    repoRoot
  });
}

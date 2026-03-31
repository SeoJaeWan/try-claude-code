#!/usr/bin/env node

import { runCli } from "@seojaewan/dev-cli-core";
import { manifest } from "../src/manifest.mjs";

await runCli({ manifest });

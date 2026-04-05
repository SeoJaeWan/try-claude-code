#!/usr/bin/env node

/**
 * gmail-collect.mjs
 *
 * CLI entrypoint for Gmail background collection.
 * Spawned by status-cache.mjs triggerRefreshIfStale().
 */

import { collect } from "./lib/gmail-collector.mjs";

collect().catch(() => process.exit(0));

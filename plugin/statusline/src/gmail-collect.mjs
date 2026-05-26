#!/usr/bin/env node

/**
 * gmail-collect.mjs
 *
 * Gmail 백그라운드 수집의 CLI 진입점.
 * status-cache.mjs 의 triggerRefreshIfStale() 가 spawn 으로 띄운다.
 */

import { collect } from "./lib/gmail-collector.mjs";

collect().catch(() => process.exit(0));

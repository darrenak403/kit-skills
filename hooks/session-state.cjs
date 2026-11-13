#!/usr/bin/env node
/**
 * Session State Hook - Persist session progress across sessions
 *
 * Fires on:
 * - Stop / SubagentStop -> persist markdown state (todos read from transcript)
 *
 * Exit Codes:
 *   0 - Always (fail-open, non-blocking)
 */

try {
  const fs = require('fs');
  const { isHookEnabled } = require('./lib/kit-config-utils.cjs');

  if (!isHookEnabled('session-state')) process.exit(0);

  const { persistState } = require('./lib/session-state-manager.cjs');

  const stdin = fs.readFileSync(0, 'utf-8').trim();
  const data = stdin ? JSON.parse(stdin) : {};
  const eventType = data.hook_event_name || null;

  if (eventType === 'Stop' || eventType === 'SubagentStop') {
    persistState(data, { eventType })
      .then(() => process.exit(0))
      .catch(() => process.exit(0));
  } else {
    process.exit(0);
  }
} catch (e) {
  try {
    const fs = require('fs');
    const p = require('path');
    const logDir = p.join(__dirname, '.logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      p.join(logDir, 'hook-log.jsonl'),
      JSON.stringify({
        ts: new Date().toISOString(),
        hook: 'session-state',
        status: 'crash',
        error: e.message
      }) + '\n'
    );
  } catch (_) {}
  process.exit(0);
}

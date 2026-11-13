'use strict';

// Runtime-neutral hook helpers.  This module has no filesystem, environment,
// or lifecycle assumptions, making it safe to share between provider adapters.
function normalizeInput(value) {
  const payload = value && typeof value === 'object' ? value : {};
  return {
    cwd: typeof payload.cwd === 'string' ? payload.cwd : process.cwd(),
    prompt: String(payload.prompt ?? payload.user_prompt ?? ''),
    tool: String(payload.tool ?? payload.tool_name ?? ''),
    sessionId: String(payload.session_id ?? payload.sessionId ?? ''),
    agent: String(payload.agent_type ?? payload.agent ?? '')
  };
}

function codexResponse(eventName, result = {}) {
  const context = String(result.context || result.message || '').trim();
  if (eventName === 'PreToolUse' && result.allow === false) {
    return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: context || 'kit-skills guard blocked this tool call' } };
  }
  if (eventName === 'UserPromptSubmit' && result.allow === false) {
    return { decision: 'block', reason: context || 'kit-skills guard blocked this prompt' };
  }
  return { hookSpecificOutput: { hookEventName: eventName, additionalContext: context } };
}

module.exports = { normalizeInput, codexResponse };

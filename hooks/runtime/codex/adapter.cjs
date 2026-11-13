'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { normalizeInput, codexResponse } = require('./core.cjs');

function readInput() {
  const raw = fs.readFileSync(0, 'utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

const EVENT_BY_HOOK = {
  'session-init': 'SessionStart', 'subagent-init': 'SubagentStart',
  'privacy-block': 'PreToolUse', 'scout-block': 'PreToolUse',
  'secret-output-guardrail': 'UserPromptSubmit', 'dev-rules-reminder': 'UserPromptSubmit',
  'simplify-gate': 'UserPromptSubmit', 'session-state': 'Stop'
};

function run(name) {
  const eventName = EVENT_BY_HOOK[name];
  if (!eventName) throw new Error(`Unsupported Codex hook: ${name}`);
  const rawInput = readInput();
  const input = { ...rawInput, ...normalizeInput(rawInput) };
  // Execute the shared implementation and translate only its provider-specific
  // response envelope. This keeps blocking decisions and lifecycle persistence
  // identical across runtimes without exposing a runtime-only environment API.
  const { CLAUDE_ENV_FILE: _ignored, ...runtimeEnv } = process.env;
  const child = spawnSync(process.execPath, [path.join(__dirname, 'shared', `${name}.cjs`)], {
    input: JSON.stringify(input), encoding: 'utf8', cwd: input.cwd, env: runtimeEnv
  });
  if (child.error) process.exit(0); // hook transport failures fail open
  if (child.status === 2) {
    const message = String(child.stderr || child.stdout || 'kit-skills guard blocked this action')
      .replaceAll('AskUserQuestion', 'structured relay to the parent')
      .replaceAll('Claude:', 'Runtime:')
      .replaceAll('CLAUDE_', 'RUNTIME_').trim();
    process.stdout.write(JSON.stringify(codexResponse(eventName, { allow: false, message })) + '\n');
    process.exit(0);
  }
  // Stop hooks only persist state and have no context or decision to return.
  // Returning the generic hookSpecificOutput envelope makes Codex reject the
  // response for this lifecycle event even though the command exits cleanly.
  if (name === 'session-state') process.exit(0);
  let context = name === 'session-init'
    ? `kit-skills active in ${input.cwd}`
    : name === 'subagent-init' && input.agent
      ? `kit-skills context for ${input.agent}`
      : '';
  // Several shared hooks emit Claude's JSON envelope on successful decisions.
  // Extract only its semantic additional context for Codex; plain stdout is
  // diagnostics and must not be exposed as a serialized Claude payload.
  try {
    const shared = JSON.parse(String(child.stdout || '').trim());
    const additional = shared?.hookSpecificOutput?.additionalContext;
    if (typeof additional === 'string' && additional.trim()) {
      context = additional.replaceAll('AskUserQuestion', 'the runtime approval mechanism');
    }
  } catch { /* shared hook produced diagnostics or no structured context */ }
  process.stdout.write(JSON.stringify(codexResponse(eventName, { allow: true, context })) + '\n');
}

module.exports = { run };

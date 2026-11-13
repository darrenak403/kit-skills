#!/usr/bin/env node
'use strict';

/**
 * Exit-code contract tests for privacy-block.cjs and scout-block.cjs.
 * Contract: 0 allow, 2 block; transport failure fails OPEN,
 * privacy evaluation crash fails CLOSED.
 * Run: node hooks/lib/__tests__/hook-exit-contracts.test.cjs
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const PRIVACY_HOOK = path.join(HOOKS_DIR, 'privacy-block.cjs');
const SCOUT_HOOK = path.join(HOOKS_DIR, 'scout-block.cjs');

let passed = 0;
let failed = 0;
const failures = [];

function runHook(hookPath, stdinInput, opts = {}) {
  return spawnSync(process.execPath, [hookPath], {
    input: stdinInput,
    encoding: 'utf8',
    timeout: 15000,
    cwd: opts.cwd || path.dirname(HOOKS_DIR)
  });
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
    failures.push({ name, error: e.message });
  }
}

function assertExit(result, expected, context) {
  if (result.status !== expected) {
    throw new Error(
      `${context}\n  Expected exit: ${expected}, got: ${result.status}\n  stderr: ${(result.stderr || '').slice(0, 300)}`
    );
  }
}

// ============================================================================
// scout-block: transport failures fail OPEN
// ============================================================================

test('scout-block: empty stdin exits 0 (fail-open)', () => {
  assertExit(runHook(SCOUT_HOOK, ''), 0, 'Empty stdin is a transport failure');
});

test('scout-block: garbage stdin exits 0 (fail-open)', () => {
  assertExit(runHook(SCOUT_HOOK, '{{{not-json'), 0, 'Unparseable stdin is a transport failure');
});

test('scout-block: missing tool_input exits 0 (fail-open)', () => {
  assertExit(runHook(SCOUT_HOOK, JSON.stringify({ tool_name: 'Read' })), 0, 'Invalid structure fails open');
});

// ============================================================================
// privacy-block: transport failures fail OPEN
// ============================================================================

test('privacy-block: empty stdin exits 0 (fail-open)', () => {
  assertExit(runHook(PRIVACY_HOOK, ''), 0, 'Empty stdin is a transport failure');
});

test('privacy-block: garbage stdin exits 0 (fail-open)', () => {
  assertExit(runHook(PRIVACY_HOOK, '{{{not-json'), 0, 'Unparseable stdin is a transport failure');
});

// ============================================================================
// privacy-block: evaluation over a parsed tool call
// ============================================================================

test('privacy-block: benign Read exits 0', () => {
  const input = JSON.stringify({
    tool_name: 'Read',
    tool_input: { file_path: 'src/index.js' }
  });
  assertExit(runHook(PRIVACY_HOOK, input), 0, 'Non-sensitive file must pass');
});

test('privacy-block: unapproved sensitive Read exits 2', () => {
  const input = JSON.stringify({
    tool_name: 'Read',
    tool_input: { file_path: '.env' }
  });
  assertExit(runHook(PRIVACY_HOOK, input), 2, 'Sensitive file without approval must block');
});

test('privacy-block: evaluation crash exits 2 (fail-closed)', () => {
  // Non-string command reaches extractPaths and throws inside checkPrivacy;
  // a crafted tool_input that crashes the checker must not become a bypass.
  const input = JSON.stringify({
    tool_name: 'Bash',
    tool_input: { command: 12345 }
  });
  assertExit(runHook(PRIVACY_HOOK, input), 2, 'Checker crash over a parsed tool call must block');
});

// ============================================================================
// privacy-block: require-time failure stays fail-open
// ============================================================================

test('privacy-block: require failure exits 0 (fail-open)', () => {
  // Copy the entry file without its lib/ so every require() throws at load
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'privacy-require-fail-'));
  const orphanHook = path.join(tmpDir, 'privacy-block.cjs');
  try {
    fs.copyFileSync(PRIVACY_HOOK, orphanHook);
    const input = JSON.stringify({
      tool_name: 'Read',
      tool_input: { file_path: '.env' }
    });
    assertExit(runHook(orphanHook, input, { cwd: tmpDir }), 0, 'Module-load failure must not brick tool calls');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log(`\nTotal Tests: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFailed Tests:');
  failures.forEach(f => {
    console.log(`  ✗ ${f.name}`);
    console.log(`    ${f.error.split('\n')[0]}`);
  });
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}

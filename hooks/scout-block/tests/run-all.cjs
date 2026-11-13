#!/usr/bin/env node
/**
 * Runs every test-*.cjs in this directory as a child process.
 *
 * Each test file owns its own assertions and signals the result through its
 * exit code (0 = all passed), so this runner only needs to collect exit codes
 * rather than parse output. Output is streamed through so a failing file's
 * own diagnostics stay visible.
 *
 * Exits non-zero if any file fails.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs
  .readdirSync(dir)
  .filter((f) => f.startsWith('test-') && f.endsWith('.cjs'))
  .sort();

if (files.length === 0) {
  console.error('No test-*.cjs files found in', dir);
  process.exit(1);
}

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const failures = [];

for (const file of files) {
  console.log(`${DIM}--- ${file} ---${RESET}`);
  const res = spawnSync(process.execPath, [path.join(dir, file)], {
    stdio: 'inherit',
    // One of these files spawns scout-block.cjs itself, so a hang is a real
    // risk. Bound it: an exceeded timeout arrives as a SIGTERM signal below.
    timeout: 30000,
  });
  // A signal-terminated child reports status null, and a spawn that never
  // started reports null for both status and signal; treat each as a failure.
  const ok = res.status === 0;
  if (!ok) failures.push({ file, status: res.status, signal: res.signal, error: res.error });
  console.log(ok ? `${GREEN}PASS${RESET} ${file}\n` : `${RED}FAIL${RESET} ${file}\n`);
}

console.log('='.repeat(48));
console.log(`${files.length - failures.length}/${files.length} files passed`);
for (const f of failures) {
  const how = f.error
    ? `could not run: ${f.error.message}`
    : f.signal
      ? `signal ${f.signal}`
      : `exit ${f.status}`;
  console.log(`  ${RED}FAIL${RESET} ${f.file} (${how})`);
}
process.exit(failures.length > 0 ? 1 : 0);

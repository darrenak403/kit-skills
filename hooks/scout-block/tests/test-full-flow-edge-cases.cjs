#!/usr/bin/env node
/**
 * test-full-flow-edge-cases.cjs - Edge case validation for full hook flow
 *
 * Exercises the real production pipeline from lib/scout-checker.cjs:
 * prefix stripping (env vars, sudo, time) → allowlist → compound splitting.
 */

const {
  isBuildCommand,
  isAllowedCommand,
  splitCompoundCommand,
  stripCommandPrefix
} = require('../../lib/scout-checker.cjs');

console.log('=== FULL FLOW EDGE CASE VALIDATION ===\n');

// isAllowedCommand is the decision the hook actually uses: it strips
// env-var/sudo/time prefixes before matching, unlike raw isBuildCommand.
const tests = [
  // Allowed outright (build/tool allowlist)
  { fn: isAllowedCommand, cmd: 'go build ./...', expect: true, desc: 'go build basic' },
  { fn: isAllowedCommand, cmd: 'cargo build', expect: true, desc: 'cargo build basic' },
  { fn: isAllowedCommand, cmd: 'make build', expect: true, desc: 'make build' },
  { fn: isAllowedCommand, cmd: 'make -j4', expect: true, desc: 'make with flags' },
  { fn: isAllowedCommand, cmd: 'mvn clean install', expect: true, desc: 'maven' },
  { fn: isAllowedCommand, cmd: 'gradle build', expect: true, desc: 'gradle' },
  { fn: isAllowedCommand, cmd: 'dotnet build', expect: true, desc: 'dotnet' },
  { fn: isAllowedCommand, cmd: 'npm run build', expect: true, desc: 'npm run build' },
  { fn: isAllowedCommand, cmd: 'go test ./...', expect: true, desc: 'go test' },
  { fn: isAllowedCommand, cmd: 'docker build .', expect: true, desc: 'docker build (allowlisted tool)' },
  { fn: isAllowedCommand, cmd: 'php artisan build', expect: true, desc: 'php artisan' },
  { fn: isAllowedCommand, cmd: 'bundle exec build', expect: true, desc: 'ruby bundler' },

  // Prefixes are stripped before the allowlist check
  { fn: isAllowedCommand, cmd: 'GOOS=linux go build', expect: true, desc: 'env var prefix stripped' },
  { fn: isAllowedCommand, cmd: 'sudo go build', expect: true, desc: 'sudo prefix stripped' },
  { fn: isAllowedCommand, cmd: 'time go build', expect: true, desc: 'time prefix stripped' },

  // Not allowlisted — go through path extraction
  { fn: isAllowedCommand, cmd: 'ls build', expect: false, desc: 'ls build dir (path check applies)' },
  { fn: isAllowedCommand, cmd: 'cd build', expect: false, desc: 'cd build dir (path check applies)' },
  { fn: isAllowedCommand, cmd: 'cd proj && go build', expect: false, desc: 'compound: not allowed as a whole' },

  // Raw isBuildCommand does NOT strip prefixes — that is stripCommandPrefix's job
  { fn: isBuildCommand, cmd: 'GOOS=linux go build', expect: false, desc: 'raw matcher without prefix strip' },
  { fn: isBuildCommand, cmd: 'docker build .', expect: true, desc: 'raw matcher: docker allowlisted' }
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  const result = t.fn(t.cmd);
  const success = result === t.expect;

  if (success) {
    console.log(`\x1b[32m✓\x1b[0m ${t.desc}: "${t.cmd}" → ${result}`);
    passed++;
  } else {
    console.log(`\x1b[31m✗\x1b[0m ${t.desc}: "${t.cmd}" → ${result} (expected ${t.expect})`);
    failed++;
  }
}

// Compound commands are split so each segment is checked individually.
const segments = splitCompoundCommand('cd proj && go build');
if (segments.length === 2 && segments[1] === 'go build' && isAllowedCommand(segments[1])) {
  console.log('\x1b[32m✓\x1b[0m compound split: second segment "go build" allowed individually');
  passed++;
} else {
  console.log(`\x1b[31m✗\x1b[0m compound split: got ${JSON.stringify(segments)}`);
  failed++;
}

const stripped = stripCommandPrefix('GOOS=linux CGO_ENABLED=0 go build');
if (stripped === 'go build') {
  console.log('\x1b[32m✓\x1b[0m stripCommandPrefix removes stacked env assignments');
  passed++;
} else {
  console.log(`\x1b[31m✗\x1b[0m stripCommandPrefix: got ${JSON.stringify(stripped)}`);
  failed++;
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

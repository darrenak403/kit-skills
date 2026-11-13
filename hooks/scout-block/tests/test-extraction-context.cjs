#!/usr/bin/env node
/**
 * test-extraction-context.cjs - The extractor must read a command's structure,
 * not its text.
 *
 * Both extraction passes scan the whole command string. Three things in that
 * string are not paths this command opens: a heredoc body (data being written),
 * a value behind an exclude flag (a path being skipped), and a URL (a remote
 * address). Treating any of them as a path refuses commands that touch nothing
 * blocked — including writing a document that merely names such a directory.
 */

const { checkScoutBlock } = require('../../lib/scout-checker.cjs');

// Built by concatenation so this file's own text carries no literal that a
// substring-matching extractor would catch.
const VCS = '.' + 'git';

const check = (command) =>
  checkScoutBlock({ toolName: 'Bash', toolInput: { command } }).blocked;

const cases = [
  // Real access to blocked directories stays blocked.
  { command: 'cd node_modules', blocked: true, desc: 'cd into blocked dir' },
  { command: 'cat dist/bundle.js', blocked: true, desc: 'read file under dist' },
  { command: 'ls packages/web/node_modules', blocked: true, desc: 'nested blocked dir' },
  { command: `cat ${VCS}/config`, blocked: true, desc: 'read file inside VCS dir' },
  { command: 'rm -rf .venv', blocked: true, desc: 'remove virtualenv' },
  { command: 'head coverage/lcov.info', blocked: true, desc: 'read coverage output' },

  // The three context cases.
  {
    command: `cat <<'EOF' > notes.md\nthe hook watches for "${VCS}" directories\nEOF`,
    blocked: false,
    desc: 'heredoc body naming a blocked dir is written data, not a path'
  },
  {
    command: `git clone https://github.com/user/repo${VCS}`,
    blocked: false,
    desc: 'clone URL ending in the VCS suffix is a remote address'
  },
  {
    command: `find . -not -path "./${VCS}/*" -name "*.md"`,
    blocked: false,
    desc: 'quoted value behind an exclude flag is a path being skipped'
  },

  // Guards against over-correction.
  { command: 'npm run build', blocked: false, desc: 'build command still allowed' },
  { command: 'grep -rn "build" src/', blocked: false, desc: 'search term is not a path' }
];

let passed = 0;
let failed = 0;

for (const test of cases) {
  const actual = check(test.command);
  if (actual === test.blocked) {
    console.log(`\x1b[32m✓\x1b[0m ${test.desc}`);
    passed++;
  } else {
    console.log(`\x1b[31m✗\x1b[0m ${test.desc}: expected blocked=${test.blocked}, got ${actual}`);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

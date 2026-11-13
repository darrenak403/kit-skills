#!/usr/bin/env node
/**
 * Regression tests for scan_skills.py registry generation.
 *
 * Runs the generator against the real skills/ tree, asserts on the produced
 * skills_data.yaml, then restores the checked-in registry so the test leaves
 * the working tree untouched.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_PATH = path.join(__dirname, 'scan_skills.py');
const SKILLS_DATA_PATH = path.join(REPO_ROOT, 'skills', 'kit-help', 'scripts', 'skills_data.yaml');

// Probe for a working interpreter: Windows often has only `py` (or a
// Microsoft Store `python` stub), POSIX often has only `python3`.
function findPython() {
  for (const candidate of ['python', 'py -3', 'python3']) {
    try {
      execSync(`${candidate} --version`, { stdio: 'pipe' });
      return candidate;
    } catch { /* try next */ }
  }
  return null;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertMatch(content, pattern, message) {
  assert(pattern.test(content), message);
}

console.log('\n📚 scan_skills.py Regression Tests');

if (!fs.existsSync(path.join(REPO_ROOT, 'skills'))) {
  console.log('  - skipped: skills/ not found at repo root');
  process.exit(0);
}

const PYTHON = findPython();
if (!PYTHON) {
  console.log('  - skipped: no Python interpreter found (tried python, py -3, python3)');
  process.exit(0);
}

const hadRegistry = fs.existsSync(SKILLS_DATA_PATH);
const registryBackup = hadRegistry ? fs.readFileSync(SKILLS_DATA_PATH) : null;

function restoreRegistry() {
  if (hadRegistry) {
    // Atomic restore: a mid-write interrupt must not truncate the registry.
    const tmp = `${SKILLS_DATA_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, registryBackup);
    fs.renameSync(tmp, SKILLS_DATA_PATH);
  } else if (fs.existsSync(SKILLS_DATA_PATH)) {
    fs.rmSync(SKILLS_DATA_PATH);
  }
}

let skillsData;
try {
  execSync(`${PYTHON} "${SCRIPT_PATH}"`, {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    encoding: 'utf-8',
  });
  skillsData = fs.readFileSync(SKILLS_DATA_PATH, 'utf-8');
} finally {
  restoreRegistry();
}

test('mcp-builder stays in dev-tools', () => {
  assertMatch(
    skillsData,
    /- name: "mcp-builder"[\s\S]*?category: "dev-tools"/,
    'mcp-builder should be categorized as dev-tools',
  );
});

test('registry paths use forward slashes', () => {
  const pathLines = skillsData.split('\n').filter(l => l.trimStart().startsWith('path:'));
  assert(pathLines.length > 0, 'registry should contain path entries');
  assert(pathLines.every(l => !l.includes('\\')), 'path entries should not contain backslashes');
  assertMatch(
    skillsData,
    /path: "kit-mcp-builder\/SKILL\.md"/,
    'paths should be posix-style relative to skills/',
  );
});

test('block frontmatter descriptions are flattened', () => {
  assert(!skillsData.includes('description: ">-"'), 'registry should not emit raw block markers');
  assertMatch(
    skillsData,
    /name: "context-engineering"[\s\S]*?description: "Optimize token consumption,/,
    'context-engineering description should be flattened',
  );
  assertMatch(
    skillsData,
    /name: "excalidraw"[\s\S]*?description: "Create Excalidraw diagrams/,
    'excalidraw description should be flattened',
  );
});

test('regenerated registry matches the checked-in registry', () => {
  assert(hadRegistry, 'skills_data.yaml should be checked in');
  // Normalize line endings: git eol=lf vs a Windows-generated working copy
  // must not masquerade as content drift.
  const normalize = (s) => s.replace(/\r\n/g, '\n');
  assert(
    normalize(skillsData) === normalize(registryBackup.toString('utf-8')),
    'checked-in skills_data.yaml is stale; run: python tools/scan_skills.py',
  );
});

if (failed > 0) {
  console.log(`\n❌ Test Results: ${passed} passed, ${failed} failed`);
  process.exit(1);
}

console.log(`\n✅ Test Results: ${passed} passed, ${failed} failed`);

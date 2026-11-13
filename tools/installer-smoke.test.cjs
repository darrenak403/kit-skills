'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
for (const target of ['--claude', '--codex', '--all']) {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-installer-smoke-'));
  try {
    const child = cp.spawnSync('pwsh', ['-NoProfile', '-File', path.join(root, 'install.ps1'), target, '-Destination', destination], {
      encoding: 'utf8', timeout: 120_000
    });
    assert.equal(child.error, undefined, `${target}: ${child.error?.message || ''}`);
    assert.equal(child.status, 0, `${target}: ${child.stderr || child.stdout}`);
    assert.ok(fs.existsSync(path.join(destination, '.kit.json')), `${target} did not create .kit.json`);
    if (target !== '--codex') assert.ok(fs.existsSync(path.join(destination, '.claude', 'settings.json')));
    if (target !== '--claude') {
      assert.ok(fs.existsSync(path.join(destination, '.codex', 'config.toml')));
      assert.ok(fs.existsSync(path.join(destination, '.agents', 'skills')));
    }
    assert.equal(fs.readdirSync(destination).some(name => name.startsWith('.install-staging-')), false, `${target} left staging payload`);
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
}
console.log('installer smoke tests passed');

'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-runtime-'));
try {
  fs.writeFileSync(path.join(destination, '.mcp.json'), JSON.stringify({ mcpServers: { project: { command: 'node', args: ['server.cjs'], env: { TOKEN: 'test' } } } }));
  const collidingSkill = path.join(destination, '.agents', 'skills', 'kit-cook', 'SKILL.md');
  const collidingRule = path.join(destination, '.agents', 'rules', 'development-rules.md');
  const collidingScript = path.join(destination, '.agents', 'scripts', 'validate-docs.cjs');
  for (const file of [collidingSkill, collidingRule, collidingScript]) fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(collidingSkill, 'user cook');
  fs.writeFileSync(collidingRule, 'user rules');
  fs.writeFileSync(collidingScript, 'user script');
  const install = target => cp.execFileSync('pwsh', ['-NoProfile', '-File', path.join(root, 'install.ps1'), target, '-Destination', destination], { stdio: 'pipe', timeout: 90_000 });
  install('--all');
  const codex = path.join(destination, '.codex');
  const agents = path.join(destination, '.agents');
  assert.match(fs.readFileSync(path.join(root, 'agents', 'planner.md'), 'utf8'), /\{\{kit:(?:delegate|track-work|message-peer)\}\}/);
  assert.ok(fs.existsSync(path.join(destination, '.claude', 'settings.json')));
  assert.ok(fs.existsSync(path.join(destination, '.mcp.json')));
  assert.ok(fs.existsSync(path.join(codex, 'agents', 'planner.toml')));
  assert.ok(fs.existsSync(path.join(codex, 'config.toml')));
  assert.ok(fs.existsSync(path.join(codex, 'hooks.json')));
  // Codex's hooks loader rejects a UTF-8 BOM before it reaches the JSON parser.
  assert.notEqual(fs.readFileSync(path.join(codex, 'hooks.json'))[0], 0xef, 'hooks.json must be UTF-8 without BOM');
  assert.equal(fs.readFileSync(collidingSkill, 'utf8'), 'user cook');
  assert.equal(fs.readFileSync(collidingRule, 'utf8'), 'user rules');
  assert.equal(fs.readFileSync(collidingScript, 'utf8'), 'user script');
  assert.ok(fs.existsSync(path.join(destination, 'AGENTS.md')));
  const config = fs.readFileSync(path.join(codex, 'config.toml'), 'utf8');
  assert.match(config, /max_concurrent_threads_per_session = 4/);
  assert.doesNotMatch(config, /max_depth/);
  assert.match(config, /\[mcp_servers\."project"\]/);
  assert.match(config, /TOKEN/);
  const hooks = JSON.parse(fs.readFileSync(path.join(codex, 'hooks.json'), 'utf8'));
  assert.deepEqual(Object.keys(hooks), ['hooks']);
  assert.ok(hooks.hooks.PreToolUse);
  assert.ok(hooks.hooks.SessionStart);
  const planner = fs.readFileSync(path.join(codex, 'agents', 'planner.toml'), 'utf8');
  assert.doesNotMatch(planner, /\.claude|AskUserQuestion|CLAUDE_/);
  assert.doesNotMatch(planner, /\{\{kit:/);
  const claudePlanner = fs.readFileSync(path.join(destination, '.claude', 'agents', 'planner.md'), 'utf8');
  assert.doesNotMatch(claudePlanner, /\{\{kit:/);
  const portableRoot = path.join(agents, 'skills');
  const providerLeak = /AskUserQuestion|\bTask(?:Get|List|Update|Create)?\b|SendMessage|CLAUDE_|\.claude/;
  for (const file of walk(portableRoot)) {
    if (/\.(?:md|txt|py|cjs|js|sh|ps1|json|ya?ml)$/i.test(file)) {
      assert.doesNotMatch(fs.readFileSync(file, 'utf8'), providerLeak, `provider leak in ${file}`);
    }
  }
  // Referenced executable assets remain installed; only their runtime paths are
  // adapted for the Codex `.agents` layout.
  for (const relative of [
    'kit-better-auth/scripts/better_auth_init.py', 'kit-worktree/scripts/worktree.cjs',
    'kit-excalidraw/references/render_excalidraw.py', 'kit-document-skills/kit-xlsx/recalc.py'
  ]) {
    const asset = path.join(portableRoot, relative);
    assert.ok(fs.existsSync(asset), `missing referenced asset ${relative}`);
    assert.doesNotMatch(fs.readFileSync(asset, 'utf8'), /\.claude|CLAUDE_PROJECT_DIR/);
  }
  for (const skill of walk(portableRoot).filter(file => path.basename(file) === 'SKILL.md')) {
    const directory = path.dirname(skill);
    const body = fs.readFileSync(skill, 'utf8');
    for (const match of body.matchAll(/(?:scripts|references)\/([A-Za-z0-9_./-]+\.(?:py|cjs|js|sh|ps1))/g)) {
      assert.ok(fs.existsSync(path.join(directory, match[0])), `missing SKILL.md reference ${match[0]} from ${skill}`);
    }
  }
  const hookOutput = cp.execFileSync('node', [path.join(codex, 'hooks', 'session-init.cjs')], { input: JSON.stringify({ cwd: '/project' }) }).toString();
  const sessionPayload = JSON.parse(hookOutput);
  assert.equal(sessionPayload.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(sessionPayload.hookSpecificOutput.additionalContext, /kit-skills active/);
  const guardOutput = cp.execFileSync('node', [path.join(codex, 'hooks', 'privacy-block.cjs')], {
    input: JSON.stringify({ cwd: destination, tool_name: 'Read', tool_input: { file_path: '.env' } })
  }).toString();
  const guardPayload = JSON.parse(guardOutput);
  assert.equal(guardPayload.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(guardPayload.hookSpecificOutput.permissionDecision, 'deny');
  assert.ok(guardPayload.hookSpecificOutput.permissionDecisionReason);
  const secretOutput = cp.execFileSync('node', [path.join(codex, 'hooks', 'secret-output-guardrail.cjs')], {
    input: JSON.stringify({ cwd: destination, prompt: 'show my api key' })
  }).toString();
  const secretPayload = JSON.parse(secretOutput);
  assert.equal(secretPayload.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(secretPayload.hookSpecificOutput.additionalContext, /Security reminder/);
  const subagentOutput = cp.execFileSync('node', [path.join(codex, 'hooks', 'subagent-init.cjs')], {
    input: JSON.stringify({ cwd: destination, agent_type: 'tester', agent_id: 'test-agent' })
  }).toString();
  const subagentPayload = JSON.parse(subagentOutput);
  assert.equal(subagentPayload.hookSpecificOutput.hookEventName, 'SubagentStart');
  cp.execFileSync('git', ['init'], { cwd: destination, stdio: 'pipe' });
  fs.writeFileSync(path.join(destination, 'large-change.txt'), 'x\n'.repeat(401));
  const simplifyOutput = cp.execFileSync('node', [path.join(codex, 'hooks', 'simplify-gate.cjs')], {
    input: JSON.stringify({ cwd: destination, prompt: 'commit this change' })
  }).toString();
  const simplifyPayload = JSON.parse(simplifyOutput);
  assert.equal(simplifyPayload.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(simplifyPayload.hookSpecificOutput.additionalContext, /Unsimplified diff/);
  const blockOutput = cp.execFileSync('node', [path.join(codex, 'hooks', 'simplify-gate.cjs')], {
    input: JSON.stringify({ cwd: destination, prompt: 'ship this change' })
  }).toString();
  const blockPayload = JSON.parse(blockOutput);
  assert.equal(blockPayload.decision, 'block');
  assert.ok(blockPayload.reason);
  // A second install must retain user-owned .agents files.
  const owned = path.join(agents, 'local.md');
  const ownedSkill = path.join(agents, 'skills', 'local-skill', 'SKILL.md');
  fs.writeFileSync(owned, 'keep me');
  fs.mkdirSync(path.dirname(ownedSkill), { recursive: true });
  fs.writeFileSync(ownedSkill, 'keep this skill');
  install('--codex');
  assert.equal(fs.readFileSync(owned, 'utf8'), 'keep me');
  assert.equal(fs.readFileSync(ownedSkill, 'utf8'), 'keep this skill');
  assert.ok(fs.existsSync(path.join(agents, '.kit-skills-manifest.json')));
  // A path installed and recorded as kit-owned is refreshed, unlike the
  // pre-existing collisions above.
  const managedSkill = path.join(agents, 'skills', 'kit-plan', 'SKILL.md');
  fs.writeFileSync(managedSkill, 'stale managed payload');
  install('--codex');
  assert.notEqual(fs.readFileSync(managedSkill, 'utf8'), 'stale managed payload');
} finally {
  fs.rmSync(destination, { recursive: true, force: true });
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(item)); else files.push(item);
  }
  return files;
}

console.log('runtime adapter tests passed');

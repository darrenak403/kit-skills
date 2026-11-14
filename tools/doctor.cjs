#!/usr/bin/env node
/**
 * Health check for an installed kit, across both runtimes.
 *
 * The kit is installed two different ways on purpose: Claude reads the source
 * format and may be wired up with symlinks into this checkout, while Codex
 * reads a transformed copy under ~/.agents (its metadata keys and skill names
 * differ, so it cannot share files with Claude). Both arrangements drift
 * silently — a renamed checkout leaves dangling symlinks, and a copy goes
 * stale the moment the source changes. Neither failure announces itself: a
 * dangling `rules` symlink simply means no rules load.
 *
 * This reports drift; it changes nothing. Exits non-zero if any check fails.
 *
 * Usage: node tools/doctor.cjs [--quiet]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const HOME = os.homedir();
const CLAUDE = path.join(HOME, '.claude');
const CODEX = path.join(HOME, '.codex');
const AGENTS = path.join(HOME, '.agents');

const quiet = process.argv.includes('--quiet');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const problems = [];
const notes = [];

function fail(section, message) {
  problems.push({ section, message });
}
function note(section, message) {
  notes.push({ section, message });
}
function tilde(p) {
  return p.startsWith(HOME) ? '~' + p.slice(HOME.length) : p;
}

// ---------------------------------------------------------------------------
// 1. Dangling symlinks
// ---------------------------------------------------------------------------
// A symlink install survives everything except moving or renaming its target,
// and that is exactly what a repo rename does.
function checkSymlinks() {
  const roots = [CLAUDE, CODEX, AGENTS];
  let checked = 0;

  const walk = (dir, depth) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      // backups/ is where retired files are parked on purpose; a dangling link
      // in there is the point, not a fault.
      if (entry.isDirectory() && (entry.name === 'backups' || entry.name === 'skill-backups')) continue;
      if (entry.isSymbolicLink()) {
        checked++;
        if (!fs.existsSync(full)) {
          let target = '?';
          try {
            target = fs.readlinkSync(full);
          } catch {
            /* unreadable link; the path alone is enough to act on */
          }
          fail('symlink', `${tilde(full)} -> ${tilde(target)} (đích không tồn tại)`);
        }
      } else if (entry.isDirectory() && depth > 0) {
        walk(full, depth - 1);
      }
    }
  };

  for (const root of roots) walk(root, 2);
  note('symlink', `đã kiểm ${checked} symlink`);
}

// ---------------------------------------------------------------------------
// 2. Hook commands that point at files which are not there
// ---------------------------------------------------------------------------
// Both runtimes store hooks as shell command strings, so a missing script is
// not caught until the hook fires and silently does nothing useful.
function checkHookTargets() {
  const configs = [
    path.join(CLAUDE, 'settings.json'),
    path.join(CODEX, 'hooks.json'),
  ];

  // Absolute script paths, plus the $HOME / ~ forms both configs use.
  const PATH_PATTERN = /(?:\$HOME|~|\/Users\/[^\s'"]+?)\/[^\s'"]*?\.(?:cjs|mjs|js|sh|py)/g;

  // Collect every hook command string out of the parsed config, rather than
  // scanning the raw text: a path has to be judged against the command that
  // uses it, not against the whole file.
  function commandsOf(config) {
    const out = [];
    for (const groups of Object.values(config.hooks || {})) {
      for (const group of groups || []) {
        for (const hook of group.hooks || []) {
          if (typeof hook.command === 'string') out.push(hook.command);
        }
      }
    }
    return out;
  }

  // A command may deliberately tolerate a missing script, e.g.
  //   if [ -f '/path/x.sh' ] && [ -x '/path/x.sh' ]; then ... ; else : ; fi
  // Absence is then the designed path, not a fault, so only an UNGUARDED
  // reference is worth reporting.
  function isGuarded(command, reference) {
    const quoted = reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:\\[\\s*-[a-z]+|\\btest\\s+-[a-z]+)\\s*'?"?${quoted}`).test(command);
  }

  for (const config of configs) {
    if (!fs.existsSync(config)) {
      note('hook', `${tilde(config)} không có — bỏ qua`);
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(config, 'utf8'));
    } catch (error) {
      fail('hook', `${tilde(config)} không phải JSON hợp lệ: ${error.message}`);
      continue;
    }

    const required = new Map(); // resolved path -> reference as written
    const guarded = new Set();

    for (const command of commandsOf(parsed)) {
      for (const reference of command.match(PATH_PATTERN) || []) {
        const resolved = reference.replace(/^\$HOME/, HOME).replace(/^~/, HOME);
        if (isGuarded(command, reference)) guarded.add(resolved);
        else if (!required.has(resolved)) required.set(resolved, reference);
      }
    }

    let missing = 0;
    for (const resolved of required.keys()) {
      if (!fs.existsSync(resolved)) {
        missing++;
        fail('hook', `${tilde(config)} gọi ${tilde(resolved)} — file không tồn tại`);
      }
    }

    const optional = [...guarded].filter((f) => !fs.existsSync(f)).length;
    const tail = optional > 0 ? `, ${optional} thiếu nhưng có guard nên bỏ qua` : '';
    note('hook', `${tilde(config)}: ${required.size} script bắt buộc, ${missing} thiếu${tail}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Skills present in the source but not installed
// ---------------------------------------------------------------------------
// Claude's skill names keep the `kit:` namespace; Codex rewrites them to
// `kit-`, so compare by directory name, which both sides share.
// The installer declares which skills it deliberately leaves out of the Claude
// install, so read that list instead of guessing from what happens to be on
// disk: an intended exclusion must never read as drift.
function claudeExclusions() {
  const installer = path.join(REPO, 'install.ps1');
  if (!fs.existsSync(installer)) return new Set();
  const block = /\$ClaudeRedundantSkills\s*=\s*@\(([\s\S]*?)\)/.exec(fs.readFileSync(installer, 'utf8'));
  if (!block) return new Set();
  return new Set([...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

function checkSkills() {
  const sourceDir = path.join(REPO, 'skills');
  if (!fs.existsSync(sourceDir)) {
    fail('skill', `không thấy ${tilde(sourceDir)} — đang chạy ngoài checkout?`);
    return;
  }

  const source = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && !e.name.startsWith('_'))
    .map((e) => e.name)
    .sort();

  // A skill absent from ONE runtime is usually a deliberate choice — the kit
  // ships several skills that duplicate a standalone or plugin skill, and the
  // obvious fix is to install only one of them. Absent from BOTH runtimes is
  // different: no choice produces that, so it means the install did not land.
  const missingBySide = new Map();
  for (const [label, dir] of [['Claude', path.join(CLAUDE, 'skills')], ['Codex', path.join(AGENTS, 'skills')]]) {
    if (!fs.existsSync(dir)) {
      note('skill', `${label}: ${tilde(dir)} không có — chưa cài runtime này`);
      continue;
    }
    const installed = new Set(fs.readdirSync(dir));
    const missing = source.filter((name) => !installed.has(name));
    missingBySide.set(label, new Set(missing));
    note('skill', `${label}: có ${source.length - missing.length}/${source.length} skill của kit`);
  }

  const excluded = claudeExclusions();
  const sides = [...missingBySide.keys()];
  for (const name of source) {
    const absentFrom = sides.filter((side) => missingBySide.get(side).has(name));
    if (absentFrom.length === 0) continue;
    if (absentFrom.length === sides.length && sides.length > 1) {
      fail('skill', `'${name}' thiếu ở CẢ ${sides.join(' và ')} — cài không tới`);
    } else if (absentFrom.length === 1 && absentFrom[0] === 'Claude' && excluded.has(name)) {
      note('skill', `'${name}' bị install.ps1 loại khỏi Claude có chủ đích`);
    } else {
      // Name the likely replacement so the reader can confirm it was a choice.
      const bare = name.replace(/^kit-/, '');
      const alt = absentFrom
        .map((side) => (side === 'Claude' ? path.join(CLAUDE, 'skills', bare) : path.join(AGENTS, 'skills', bare)))
        .find((p) => fs.existsSync(p));
      const hint = alt ? ` (có '${bare}' thay thế — chắc là cố ý)` : '';
      note('skill', `'${name}' không có ở ${absentFrom.join(', ')}${hint}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Agents: the installer's policy table vs what is actually installed
// ---------------------------------------------------------------------------
// Platform policy (model tier, read-only, tool allowlist) lives in
// install.ps1, not in the agent markdown. An agent added to the source without
// a policy, or installed before a policy change, shows up here.
function checkAgents() {
  const installer = path.join(REPO, 'install.ps1');
  if (!fs.existsSync(installer)) {
    fail('agent', `không thấy ${tilde(installer)}`);
    return;
  }

  const text = fs.readFileSync(installer, 'utf8');
  const block = text.match(/\$AgentPolicies\s*=\s*@\{([\s\S]*?)\n\}/);
  if (!block) {
    fail('agent', 'không đọc được bảng $AgentPolicies trong install.ps1');
    return;
  }

  const policies = new Map();
  const line = /^\s*'([^']+)'\s*=\s*@\{(.*)\}\s*$/gm;
  let match;
  while ((match = line.exec(block[1])) !== null) {
    const [, name, body] = match;
    policies.set(name, {
      readOnly: /ReadOnly\s*=\s*\$true/.test(body),
      needsBash: /NeedsBash\s*=\s*\$true/.test(body),
      needsWebSearch: /NeedsWebSearch\s*=\s*\$true/.test(body),
    });
  }
  if (policies.size === 0) {
    fail('agent', 'bảng $AgentPolicies rỗng hoặc định dạng đã đổi');
    return;
  }

  // Source markdown must have a policy, and vice versa.
  const sourceDir = path.join(REPO, 'agents');
  const sourceAgents = fs.existsSync(sourceDir)
    ? fs.readdirSync(sourceDir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''))
    : [];
  for (const name of sourceAgents) {
    if (!policies.has(name)) fail('agent', `agents/${name}.md không có entry trong $AgentPolicies`);
  }
  for (const name of policies.keys()) {
    if (!sourceAgents.includes(name)) fail('agent', `$AgentPolicies có '${name}' nhưng không có agents/${name}.md`);
  }

  // Claude: every policy should have an installed .md whose tools line matches.
  const claudeAgents = path.join(CLAUDE, 'agents');
  if (fs.existsSync(claudeAgents)) {
    let drift = 0;
    for (const [name, policy] of policies) {
      const file = path.join(claudeAgents, `${name}.md`);
      if (!fs.existsSync(file)) {
        fail('agent', `Claude chưa cài agent '${name}'`);
        continue;
      }
      const head = fs.readFileSync(file, 'utf8').slice(0, 1200);
      const tools = (head.match(/^tools:\s*(.*)$/m) || [, ''])[1];
      if (!tools) {
        fail('agent', `Claude: ${name}.md không khai 'tools:' — nó thừa hưởng mọi tool`);
        drift++;
        continue;
      }
      const has = (t) => tools.split(',').map((s) => s.trim()).includes(t);
      if (policy.needsBash && !has('Bash')) {
        fail('agent', `Claude: ${name} cần Bash theo policy nhưng allowlist không có`);
        drift++;
      }
      if (policy.needsWebSearch && !has('WebSearch')) {
        fail('agent', `Claude: ${name} cần WebSearch theo policy nhưng allowlist không có`);
        drift++;
      }
      if (!policy.needsBash && has('Bash') && policy.readOnly) {
        note('agent', `Claude: ${name} có Bash trong allowlist mà policy không khai NeedsBash (cài trước khi policy đổi?)`);
      }
    }
    note('agent', `Claude: kiểm ${policies.size} agent, ${drift} lệch`);
  } else {
    note('agent', `${tilde(claudeAgents)} không có — chưa cài cho Claude`);
  }

  // Codex: presence only. Its .toml carries sandbox_mode, not a tool allowlist.
  const codexAgents = path.join(CODEX, 'agents');
  if (fs.existsSync(codexAgents)) {
    const missing = [...policies.keys()].filter((n) => !fs.existsSync(path.join(codexAgents, `${n}.toml`)));
    if (missing.length > 0) {
      fail('agent', `Codex thiếu ${missing.length} agent: ${missing.join(', ')}`);
    } else {
      note('agent', `Codex: đủ ${policies.size} agent .toml`);
    }
  } else {
    note('agent', `${tilde(codexAgents)} không có — chưa cài cho Codex`);
  }
}

// ---------------------------------------------------------------------------

const SECTIONS = [
  ['symlink', 'Symlink', checkSymlinks],
  ['hook', 'Hook', checkHookTargets],
  ['skill', 'Skill', checkSkills],
  ['agent', 'Agent', checkAgents],
];

console.log(`${DIM}kit doctor — checkout: ${REPO}${RESET}\n`);

for (const [key, label, check] of SECTIONS) {
  try {
    check();
  } catch (error) {
    fail(key, `kiểm tra lỗi: ${error.message}`);
  }
  const sectionProblems = problems.filter((p) => p.section === key);
  const sectionNotes = notes.filter((n) => n.section === key);
  const mark = sectionProblems.length === 0 ? `${GREEN}OK${RESET}` : `${RED}${sectionProblems.length} vấn đề${RESET}`;
  console.log(`${label}: ${mark}`);
  for (const p of sectionProblems) console.log(`  ${RED}✗${RESET} ${p.message}`);
  if (!quiet) for (const n of sectionNotes) console.log(`  ${DIM}· ${n.message}${RESET}`);
  console.log();
}

console.log('='.repeat(56));
if (problems.length === 0) {
  console.log(`${GREEN}Không phát hiện vấn đề.${RESET}`);
} else {
  console.log(`${RED}${problems.length} vấn đề cần xử lý.${RESET}`);
  console.log(`${YELLOW}Lưu ý: doctor chỉ báo, không sửa gì.${RESET}`);
}
process.exit(problems.length > 0 ? 1 : 0);

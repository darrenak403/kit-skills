#!/usr/bin/env node
'use strict';
/**
 * Token audit for a Claude Code session transcript (JSONL).
 * Reads only usage numbers of assistant turns; never prints message content.
 *
 * Usage:
 *   node token-audit.cjs [transcript.jsonl] [--since <ISO>] [--json]
 *        [--min-hit 0.8] [--max-context 0.7] [--window 200000]
 * Without a path it picks the newest transcript of the current project.
 * Exit 2 when a budget gate fails, so pipelines can stop on it.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
}

function projectDir(cwd = process.cwd()) {
  return path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[^a-zA-Z0-9]/g, '-'));
}

function newestTranscript(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))
    .map(f => ({ f: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files[0]?.f ?? null;
}

const n = v => (Number.isFinite(v) && v > 0 ? v : 0);

/** Aggregate usage of main-thread assistant turns; dedupes streamed chunks by message id. */
function audit(text, { since = null, window = 200000, sidechain = false } = {}) {
  const seen = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let row; try { row = JSON.parse(line); } catch { continue; }
    if (row.type !== 'assistant' || Boolean(row.isSidechain) !== sidechain || !row.message?.usage) continue;
    if (since && row.timestamp && row.timestamp < since) continue;
    seen.set(row.message.id ?? row.uuid, row.message.usage);
  }
  const t = { turns: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, peakContext: 0 };
  for (const u of seen.values()) {
    const input = n(u.input_tokens), read = n(u.cache_read_input_tokens), write = n(u.cache_creation_input_tokens);
    t.turns++; t.input += input; t.cacheRead += read; t.cacheWrite += write; t.output += n(u.output_tokens);
    t.peakContext = Math.max(t.peakContext, input + read + write);
  }
  const prompt = t.input + t.cacheRead + t.cacheWrite;
  const win = t.peakContext > window ? 1000000 : window;
  return { ...t, window: win,
    cacheHitRatio: prompt ? +(t.cacheRead / prompt).toFixed(3) : 0,
    peakContextRatio: +(t.peakContext / win).toFixed(3),
    avgNewTokensPerTurn: t.turns ? Math.round((t.input + t.cacheWrite) / t.turns) : 0,
    // Cost in units of one fresh input token: cache write 1.25, cache read 0.1, output 5.
    costUnits: Math.round(t.input + t.cacheWrite * 1.25 + t.cacheRead * 0.1 + t.output * 5) };
}

/** Subagent transcripts live next to the main one: <session>/subagents/agent-*.jsonl. */
function auditSubagents(mainFile, opts) {
  const dir = path.join(mainFile.replace(/\.jsonl$/, ''), 'subagents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))
    .map(f => ({ id: f.replace(/^agent-|\.jsonl$/g, ''), ...audit(fs.readFileSync(path.join(dir, f), 'utf8'), { ...opts, sidechain: true }) }))
    .filter(r => r.turns > 0);
}

function gates(r, minHit, maxContext) {
  const fails = [];
  if (r.turns >= 5 && r.cacheHitRatio < minHit) fails.push(`cache hit ${r.cacheHitRatio} < ${minHit}: prefix is churning (re-read files, reloaded skills, edited early context)`);
  if (r.peakContextRatio > maxContext) fails.push(`peak context ${Math.round(r.peakContextRatio * 100)}% > ${Math.round(maxContext * 100)}%: delegate wide reads to a subagent or compact at a phase boundary`);
  return fails;
}

if (require.main === module) {
  const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : newestTranscript(projectDir());
  if (!file) { console.error('no transcript found'); process.exit(1); }
  const opts = { since: arg('--since', null), window: +arg('--window', 200000) };
  const r = audit(fs.readFileSync(file, 'utf8'), opts);
  const subs = auditSubagents(file, opts);
  const fails = gates(r, +arg('--min-hit', 0.8), +arg('--max-context', 0.7));
  // A subagent that cost more than it saved shows up as a high share of the run's cost units.
  const subCost = subs.reduce((n, x) => n + x.costUnits, 0);
  const total = r.costUnits + subCost;
  if (process.argv.includes('--json')) console.log(JSON.stringify({ main: r, subagents: subs, totalCostUnits: total, fails }));
  else {
    const k = v => `${(v / 1000).toFixed(1)}k`;
    const line = (name, x) => `${name} turns ${x.turns} | new ${k(x.input + x.cacheWrite)} | cached ${k(x.cacheRead)} | out ${k(x.output)} | hit ${(x.cacheHitRatio * 100).toFixed(1)}% | peak ctx ${k(x.peakContext)} | cost ${k(x.costUnits)}`;
    console.log(line('main', r) + ` (${Math.round(r.peakContextRatio * 100)}% of ${k(r.window)}) | avg new/turn ${k(r.avgNewTokensPerTurn)}`);
    for (const x of subs) console.log(line(`  sub ${x.id.slice(0, 8)}`, x));
    console.log(`total cost ${k(total)} units | subagents ${subs.length} = ${total ? Math.round(subCost / total * 100) : 0}%`);
    for (const f of fails) console.log(`GATE FAIL: ${f}`);
  }
  process.exit(fails.length ? 2 : 0);
}

module.exports = { audit, auditSubagents, gates, projectDir };

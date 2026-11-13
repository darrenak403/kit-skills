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
function audit(text, { since = null, window = 200000 } = {}) {
  const seen = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let row; try { row = JSON.parse(line); } catch { continue; }
    if (row.type !== 'assistant' || row.isSidechain || !row.message?.usage) continue;
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
    avgNewTokensPerTurn: t.turns ? Math.round((t.input + t.cacheWrite) / t.turns) : 0 };
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
  const r = audit(fs.readFileSync(file, 'utf8'), { since: arg('--since', null), window: +arg('--window', 200000) });
  const fails = gates(r, +arg('--min-hit', 0.8), +arg('--max-context', 0.7));
  if (process.argv.includes('--json')) console.log(JSON.stringify({ ...r, fails }));
  else {
    const k = v => `${(v / 1000).toFixed(1)}k`;
    console.log(`turns ${r.turns} | new ${k(r.input + r.cacheWrite)} | cached ${k(r.cacheRead)} | out ${k(r.output)} | hit ${(r.cacheHitRatio * 100).toFixed(1)}% | peak ctx ${k(r.peakContext)}/${k(r.window)} (${Math.round(r.peakContextRatio * 100)}%) | avg new/turn ${k(r.avgNewTokensPerTurn)}`);
    for (const f of fails) console.log(`GATE FAIL: ${f}`);
  }
  process.exit(fails.length ? 2 : 0);
}

module.exports = { audit, gates, projectDir };

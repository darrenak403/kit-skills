#!/usr/bin/env node
'use strict';
/**
 * Decide inline vs subagents for one piece of work, in cost units of one fresh input token.
 * Prices relative to input: cache write 1.25, cache read 0.1, output 5.
 *
 * Usage: node delegation-calc.cjs --read 60000 --parts 3 --turns 40 [--summary 1500]
 *        [--overhead 25000] [--sub-turns 8] [--prefer-speed] [--needs-context] [--writes-shared] [--json]
 *   --read       tokens the work must pull in (files, logs, search output)
 *   --parts      independent pieces (different files, no result passed between them)
 *   --turns      main-thread turns still expected after this work
 *   --summary    tokens each subagent returns
 *   --overhead   cold-start tokens of one subagent (system prompt, tools, rules, brief)
 *   --sub-turns  turns a subagent takes for its piece
 *   --prefer-speed  split independent parts in parallel when it costs at most 35% more
 */
const W = 1.25, R = 0.1;
// Most a single subagent should pull in: 60% of a 200k window, leaving room to reason.
const SLICE_MAX = 120000;

function inlineCost({ read, turns }) {
  // Read once into the main context, then re-sent as cache on every later main turn.
  return read * W + read * R * turns;
}

function delegatedCost({ read, turns, parts, summary, overhead, subTurns }) {
  const per = read / parts;
  // Each subagent: cold start + its slice, re-read across its own turns; the main keeps only the summaries.
  const sub = (overhead + per) * W + (overhead + per) * R * subTurns;
  return parts * sub + parts * summary * (W + R * turns);
}

function decide(o) {
  const reasons = [];
  if (o.needsContext) reasons.push('needs this conversation: a subagent would re-derive it');
  if (o.writesShared && o.parts > 1) reasons.push('parts edit the same files: parallel writers conflict');
  if (o.read < 20000) reasons.push(`only ${Math.round(o.read / 1000)}k to read: below the 20k delegation floor`);
  const inline = inlineCost(o);
  // Splitting never lowers total tokens (each agent pays its own cold start); it is forced only when one
  // agent's slice would not fit its window, and chosen for wall-clock speed when the extra cost is small.
  const fit = Math.ceil(o.read / SLICE_MAX);
  const one = delegatedCost({ ...o, parts: 1 });
  let best = { agents: 1, cost: delegatedCost({ ...o, parts: Math.max(1, fit) }) };
  best.agents = Math.max(1, fit);
  if (o.preferSpeed) {
    for (let k = Math.min(4, o.parts); k > best.agents; k--) {
      const cost = delegatedCost({ ...o, parts: k });
      if (o.read / k >= 15000 && cost <= one * 1.35) { best = { agents: k, cost }; break; }
    }
  }
  if (best.agents > 4) reasons.push(`needs ${best.agents} agents of ${SLICE_MAX / 1000}k: narrow the scope first`);
  if (best.cost >= inline) reasons.push('main thread ends soon: re-sending the read costs less than a subagent');
  const agents = reasons.length ? 0 : best.agents;
  return {
    recommendation: agents ? `delegate to ${agents} subagent${agents > 1 ? 's' : ''}${agents > 1 ? ' in parallel' : ''}` : 'do it inline in the main thread',
    agents, inlineCost: Math.round(inline), delegatedCost: Math.round(agents ? best.cost : delegatedCost({ ...o, parts: 1 })),
    savings: agents ? +(1 - best.cost / inline).toFixed(2) : 0,
    model: agents ? 'read-only pieces: a cheaper model (Sonnet/Haiku); pieces that write code: same model' : null,
    reasons,
  };
}

function num(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
}

if (require.main === module) {
  const o = {
    read: num('--read', 0), parts: num('--parts', 1), turns: num('--turns', 20),
    summary: num('--summary', 1500), overhead: num('--overhead', 25000), subTurns: num('--sub-turns', 8),
    preferSpeed: process.argv.includes('--prefer-speed'),
    needsContext: process.argv.includes('--needs-context'), writesShared: process.argv.includes('--writes-shared'),
  };
  const r = decide(o);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r));
  else {
    console.log(`${r.recommendation} | inline ${r.inlineCost} vs delegated ${r.delegatedCost} cost units${r.savings ? ` | saves ${Math.round(r.savings * 100)}%` : ''}`);
    for (const why of r.reasons) console.log(`  inline because: ${why}`);
    if (r.model) console.log(`  model: ${r.model}`);
  }
}

module.exports = { decide, inlineCost, delegatedCost };

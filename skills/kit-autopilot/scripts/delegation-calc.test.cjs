'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { decide } = require('./delegation-calc.cjs');
const base = { summary: 1500, overhead: 25000, subTurns: 8 };

test('small work stays inline', () => {
  assert.equal(decide({ ...base, read: 8000, parts: 1, turns: 40 }).agents, 0);
});
test('large read with a long main thread is delegated', () => {
  const r = decide({ ...base, read: 60000, parts: 1, turns: 100 });
  assert.equal(r.agents, 1);
  assert.ok(r.savings > 0.5);
});
test('splits only when a slice would overflow one agent, or for speed at bounded cost', () => {
  assert.equal(decide({ ...base, read: 300000, parts: 8, turns: 60 }).agents, 3);
  assert.equal(decide({ ...base, read: 90000, parts: 3, turns: 60 }).agents, 1);
  const fast = decide({ ...base, read: 90000, parts: 3, turns: 60, preferSpeed: true });
  assert.ok(fast.agents >= 2 && fast.agents <= 3);
  assert.ok(decide({ ...base, read: 40000, parts: 4, turns: 60, preferSpeed: true }).agents <= 2);
});
test('needs-context or shared writes force inline', () => {
  assert.equal(decide({ ...base, read: 90000, parts: 1, turns: 80, needsContext: true }).agents, 0);
  assert.equal(decide({ ...base, read: 90000, parts: 3, turns: 80, writesShared: true }).agents, 0);
});
test('near the end of a session delegation does not pay', () => {
  assert.equal(decide({ ...base, read: 30000, parts: 1, turns: 2 }).agents, 0);
});

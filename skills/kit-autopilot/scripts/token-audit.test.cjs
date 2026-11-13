'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { audit, gates } = require('./token-audit.cjs');

const row = (id, u, extra = {}) => JSON.stringify({ type: 'assistant', timestamp: '2026-01-02T00:00:00Z', message: { id, content: 'secret', usage: u }, ...extra });

test('dedupes streamed chunks and skips sidechains', () => {
  const text = [
    row('a', { input_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 1000, output_tokens: 5 }),
    row('a', { input_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 1000, output_tokens: 50 }),
    row('b', { input_tokens: 10, cache_read_input_tokens: 1000, cache_creation_input_tokens: 90, output_tokens: 5 }),
    row('c', { input_tokens: 999999 }, { isSidechain: true }),
    'garbage',
  ].join('\n');
  const r = audit(text);
  assert.equal(r.turns, 2);
  assert.equal(r.output, 55);
  assert.equal(r.peakContext, 1100);
  assert.equal(r.cacheHitRatio, +(1000 / 2110).toFixed(3));
});

test('since filter and gates', () => {
  const text = row('a', { input_tokens: 150000 });
  assert.equal(audit(text, { since: '2027-01-01' }).turns, 0);
  const r = audit(text);
  assert.ok(gates(r, 0.8, 0.7).some(f => f.startsWith('peak context')));
  assert.deepEqual(gates({ ...r, turns: 6, cacheHitRatio: 0.95, peakContextRatio: 0.2 }, 0.8, 0.7), []);
});

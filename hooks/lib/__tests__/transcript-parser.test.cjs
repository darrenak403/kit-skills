#!/usr/bin/env node
'use strict';

/**
 * Tests for transcript-parser.cjs
 * Run: node hooks/lib/__tests__/transcript-parser.test.cjs
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  parseTranscript,
  processEntry,
  extractTarget
} = require('../transcript-parser.cjs');

// Test framework
let passed = 0;
let failed = 0;
const failures = [];
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assertEquals(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, msg = '') {
  if (!condition) {
    throw new Error(`${msg}\n  Expected: true, got: ${condition}`);
  }
}

function assertContains(actual, search, msg = '') {
  if (!actual.includes(search)) {
    throw new Error(`${msg}\n  Expected to contain: ${search}\n  Actual: ${actual}`);
  }
}

// ============================================================================
// TEST 1: Module Load Test
// ============================================================================

test('transcript-parser.cjs exports required functions', () => {
  assertTrue(typeof parseTranscript === 'function', 'parseTranscript should be function');
  assertTrue(typeof processEntry === 'function', 'processEntry should be function');
  assertTrue(typeof extractTarget === 'function', 'extractTarget should be function');
});

// ============================================================================
// TEST 2: Transcript Parser - Empty/Non-existent
// ============================================================================

test('parseTranscript returns empty result for non-existent file', async () => {
  const result = await parseTranscript('/tmp/nonexistent-transcript-12345.jsonl');
  assertEquals(result.tools.length, 0, 'tools should be empty array');
  assertEquals(result.agents.length, 0, 'agents should be empty array');
  assertEquals(result.todos.length, 0, 'todos should be empty array');
});

test('parseTranscript returns empty result for null path', async () => {
  const result = await parseTranscript(null);
  assertEquals(result.tools.length, 0, 'tools should be empty array');
  assertEquals(result.agents.length, 0, 'agents should be empty array');
  assertEquals(result.todos.length, 0, 'todos should be empty array');
});

test('parseTranscript returns empty result for undefined path', async () => {
  const result = await parseTranscript(undefined);
  assertEquals(result.tools.length, 0, 'tools should be empty array');
  assertEquals(result.agents.length, 0, 'agents should be empty array');
  assertEquals(result.todos.length, 0, 'todos should be empty array');
});

// ============================================================================
// TEST 3: Transcript Parser - Real JSONL File
// ============================================================================

const tmpTranscript = path.join(os.tmpdir(), `test-transcript-${Date.now()}.jsonl`);
const sampleTranscriptData = [
  {
    timestamp: '2026-01-06T12:00:00Z',
    message: {
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'Read',
          input: { file_path: '/home/user/file.txt' }
        }
      ]
    }
  },
  {
    timestamp: '2026-01-06T12:01:00Z',
    message: {
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tool-1',
          is_error: false
        }
      ]
    }
  },
  {
    timestamp: '2026-01-06T12:02:00Z',
    message: {
      content: [
        {
          type: 'tool_use',
          id: 'tool-2',
          name: 'Bash',
          input: { command: 'git status' }
        }
      ]
    }
  },
  {
    timestamp: '2026-01-06T12:03:00Z',
    message: {
      content: [
        {
          type: 'tool_use',
          id: 'agent-1',
          name: 'Task',
          input: { subagent_type: 'researcher', model: 'claude-opus', description: 'Research topic' }
        }
      ]
    }
  },
  {
    timestamp: '2026-01-06T12:04:00Z',
    message: {
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'agent-1',
          is_error: false
        }
      ]
    }
  },
  {
    timestamp: '2026-01-06T12:05:00Z',
    message: {
      content: [
        {
          type: 'tool_use',
          id: 'todo-1',
          name: 'TodoWrite',
          input: {
            todos: [
              { content: 'First task', status: 'completed', activeForm: 'Completing first task' },
              { content: 'Second task', status: 'in_progress', activeForm: 'Working on second task' }
            ]
          }
        }
      ]
    }
  }
];

fs.writeFileSync(tmpTranscript, sampleTranscriptData.map(d => JSON.stringify(d)).join('\n'));

test('parseTranscript reads valid JSONL file', async () => {
  const result = await parseTranscript(tmpTranscript);
  assertTrue(Array.isArray(result.tools), 'tools should be array');
  assertTrue(Array.isArray(result.agents), 'agents should be array');
  assertTrue(Array.isArray(result.todos), 'todos should be array');
});

test('parseTranscript tracks tools correctly', async () => {
  const result = await parseTranscript(tmpTranscript);
  assertTrue(result.tools.length >= 2, 'Should track at least 2 tools');
  const toolNames = result.tools.map(t => t.name);
  assertContains(toolNames.join(','), 'Read', 'Should contain Read tool');
  assertContains(toolNames.join(','), 'Bash', 'Should contain Bash tool');
});

test('parseTranscript marks tool status correctly', async () => {
  const result = await parseTranscript(tmpTranscript);
  const completedTools = result.tools.filter(t => t.status === 'completed');
  assertTrue(completedTools.length > 0, 'Should have at least one completed tool');
});

test('parseTranscript tracks agents correctly', async () => {
  const result = await parseTranscript(tmpTranscript);
  assertTrue(result.agents.length > 0, 'Should track agents');
  const agent = result.agents[0];
  assertEquals(agent.type, 'researcher', 'Should capture agent type');
  assertEquals(agent.model, 'claude-opus', 'Should capture agent model');
});

test('parseTranscript tracks todos correctly', async () => {
  const result = await parseTranscript(tmpTranscript);
  assertTrue(result.todos.length >= 2, 'Should track todos');
  const inProgressTodos = result.todos.filter(t => t.status === 'in_progress');
  assertTrue(inProgressTodos.length > 0, 'Should have in_progress todo');
});

test('parseTranscript extracts targets from tools', async () => {
  const result = await parseTranscript(tmpTranscript);
  const readTool = result.tools.find(t => t.name === 'Read');
  if (readTool) {
    assertTrue(readTool.target, 'Read tool should have target');
    assertContains(readTool.target, 'file.txt', 'Should contain file path');
  }
});

// ============================================================================
// TEST 4: Extract Target Function
// ============================================================================

test('extractTarget: Read tool', () => {
  const target = extractTarget('Read', { file_path: '/home/user/file.txt' });
  assertEquals(target, '/home/user/file.txt', 'Should extract file_path');
});

test('extractTarget: Write tool', () => {
  const target = extractTarget('Write', { file_path: '/home/user/output.txt' });
  assertEquals(target, '/home/user/output.txt', 'Should extract file_path from Write');
});

test('extractTarget: Edit tool', () => {
  const target = extractTarget('Edit', { path: '/home/user/config.json' });
  assertEquals(target, '/home/user/config.json', 'Should extract path from Edit');
});

test('extractTarget: Glob tool', () => {
  const target = extractTarget('Glob', { pattern: '**/*.js' });
  assertEquals(target, '**/*.js', 'Should extract pattern from Glob');
});

test('extractTarget: Grep tool', () => {
  const target = extractTarget('Grep', { pattern: 'function.*test' });
  assertEquals(target, 'function.*test', 'Should extract pattern from Grep');
});

test('extractTarget: Bash tool (short command)', () => {
  const target = extractTarget('Bash', { command: 'ls -la' });
  assertEquals(target, 'ls -la', 'Should extract short command');
});

test('extractTarget: Bash tool (long command truncated)', () => {
  const longCmd = 'npm install --save-dev @types/node @types/jest @types/react @types/react-dom @types/webpack';
  const target = extractTarget('Bash', { command: longCmd });
  assertTrue(target.endsWith('...'), 'Should truncate long command with ...');
  assertTrue(target.length <= 33, 'Should be max 30 chars + ...');
});

test('extractTarget: Unknown tool returns null', () => {
  const target = extractTarget('UnknownTool', { someParam: 'value' });
  assertEquals(target, null, 'Should return null for unknown tools');
});

test('extractTarget: Null input returns null', () => {
  const target = extractTarget('Read', null);
  assertEquals(target, null, 'Should return null for null input');
});

// ============================================================================
// TEST 5: Fallback Error Handling (processEntry)
// ============================================================================

test('processEntry handles entry without timestamp', () => {
  const toolMap = new Map();
  const agentMap = new Map();
  const latestTodos = [];
  const result = { sessionStart: null };

  const entry = {
    message: {
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'Bash',
          input: { command: 'ls' }
        }
      ]
    }
  };

  processEntry(entry, toolMap, agentMap, latestTodos, result);
  assertTrue(toolMap.has('tool-1'), 'Should process entry without timestamp');
});

test('processEntry handles missing content array', () => {
  const toolMap = new Map();
  const agentMap = new Map();
  const latestTodos = [];
  const result = { sessionStart: null };

  const entry = { timestamp: '2026-01-06T12:00:00Z' };
  processEntry(entry, toolMap, agentMap, latestTodos, result);
  assertEquals(toolMap.size, 0, 'Should handle missing content gracefully');
});

test('processEntry handles malformed tool_result', () => {
  const toolMap = new Map();
  const agentMap = new Map();
  const latestTodos = [];
  const result = { sessionStart: null };

  const entry = {
    timestamp: '2026-01-06T12:00:00Z',
    message: {
      content: [
        { type: 'tool_result' } // missing tool_use_id
      ]
    }
  };

  processEntry(entry, toolMap, agentMap, latestTodos, result);
  assertEquals(toolMap.size, 0, 'Should handle malformed tool_result');
});

test('processEntry TaskUpdate numeric fallback targets native tasks only', () => {
  const toolMap = new Map();
  const agentMap = new Map();
  const latestTodos = [];
  const result = { sessionStart: null };

  processEntry({
    timestamp: '2026-01-06T12:00:00Z',
    message: {
      content: [{
        type: 'tool_use',
        id: 'todo-legacy',
        name: 'TodoWrite',
        input: {
          todos: [
            { content: 'Legacy first', status: 'pending' },
            { content: 'Legacy second', status: 'pending' }
          ]
        }
      }]
    }
  }, toolMap, agentMap, latestTodos, result);

  processEntry({
    timestamp: '2026-01-06T12:00:01Z',
    message: {
      content: [{
        type: 'tool_use',
        id: 'native-create-1',
        name: 'TaskCreate',
        input: { subject: 'Native task' }
      }]
    }
  }, toolMap, agentMap, latestTodos, result);

  processEntry({
    timestamp: '2026-01-06T12:00:02Z',
    message: {
      content: [{
        type: 'tool_use',
        id: 'native-update-1',
        name: 'TaskUpdate',
        input: { taskId: '1', status: 'completed' }
      }]
    }
  }, toolMap, agentMap, latestTodos, result);

  assertEquals(latestTodos[0].status, 'pending', 'Legacy todo must not be updated by native task index fallback');
  const nativeTodo = latestTodos.find(t => t.id === 'native-create-1');
  assertTrue(Boolean(nativeTodo), 'Native task should exist');
  assertEquals(nativeTodo.status, 'completed', 'Native task should be updated');
});

test('processEntry ignores non-numeric fallback taskId values', () => {
  const toolMap = new Map();
  const agentMap = new Map();
  const latestTodos = [];
  const result = { sessionStart: null };

  processEntry({
    timestamp: '2026-01-06T12:00:00Z',
    message: {
      content: [{
        type: 'tool_use',
        id: 'native-create-1',
        name: 'TaskCreate',
        input: { subject: 'Native task one' }
      }]
    }
  }, toolMap, agentMap, latestTodos, result);

  processEntry({
    timestamp: '2026-01-06T12:00:01Z',
    message: {
      content: [{
        type: 'tool_use',
        id: 'native-update-1',
        name: 'TaskUpdate',
        input: { taskId: '1abc', status: 'completed' }
      }]
    }
  }, toolMap, agentMap, latestTodos, result);

  assertEquals(latestTodos[0].status, 'pending', 'Non-numeric taskId should not trigger index fallback');
});

test('processEntry hydrates native task id from TaskCreate tool_result', () => {
  const toolMap = new Map();
  const agentMap = new Map();
  const latestTodos = [];
  const result = { sessionStart: null };

  processEntry({
    timestamp: '2026-01-06T12:00:00Z',
    message: {
      content: [{
        type: 'tool_use',
        id: 'native-create-1',
        name: 'TaskCreate',
        input: { subject: 'Native task one' }
      }]
    }
  }, toolMap, agentMap, latestTodos, result);

  processEntry({
    timestamp: '2026-01-06T12:00:01Z',
    message: {
      content: [{
        type: 'tool_result',
        tool_use_id: 'native-create-1',
        is_error: false,
        content: '{"taskId":"task-123"}'
      }]
    }
  }, toolMap, agentMap, latestTodos, result);

  processEntry({
    timestamp: '2026-01-06T12:00:02Z',
    message: {
      content: [{
        type: 'tool_use',
        id: 'native-update-1',
        name: 'TaskUpdate',
        input: { taskId: 'task-123', status: 'in_progress', activeForm: 'Working task one' }
      }]
    }
  }, toolMap, agentMap, latestTodos, result);

  assertEquals(latestTodos[0].id, 'task-123', 'TaskCreate result should hydrate native task id');
  assertEquals(latestTodos[0].status, 'in_progress', 'Hydrated id should allow direct TaskUpdate matching');
  assertEquals(latestTodos[0].activeForm, 'Working task one', 'TaskUpdate should refresh activeForm');
});

// ============================================================================
// TEST 6: Performance
// ============================================================================

test('parseTranscript processes 100 entries <100ms', async () => {
  const largeTranscript = path.join(os.tmpdir(), `perf-transcript-${Date.now()}.jsonl`);
  const lines = [];

  for (let i = 0; i < 100; i++) {
    lines.push(JSON.stringify({
      timestamp: new Date().toISOString(),
      message: {
        content: [
          {
            type: 'tool_use',
            id: `tool-${i}`,
            name: 'Bash',
            input: { command: 'echo test' }
          }
        ]
      }
    }));
  }

  fs.writeFileSync(largeTranscript, lines.join('\n'));

  try {
    const start = Date.now();
    await parseTranscript(largeTranscript);
    const elapsed = Date.now() - start;
    assertTrue(elapsed < 100, `Should parse 100 entries in <100ms, took ${elapsed}ms`);
  } finally {
    fs.unlinkSync(largeTranscript);
  }
});

// ============================================================================
// RUNNER
// ============================================================================

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${e.message}`);
      failed++;
      failures.push({ name, error: e.message });
    }
  }

  try {
    fs.unlinkSync(tmpTranscript);
  } catch {}

  console.log(`\nTotal Tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    failures.forEach(f => {
      console.log(`  ✗ ${f.name}`);
      console.log(`    ${f.error.split('\n')[0]}`);
    });
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  }
})();

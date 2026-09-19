/**
 * Test suite for Issue #18 Django Hello World Node entrypoint.
 */
const assert = require('assert');
const { execSync } = require('child_process');
const { getGreeting } = require('../index.js');

/**
 * Verifies module exports and function outputs.
 */
function testGreetingExport() {
  const greeting = getGreeting();
  assert.strictEqual(greeting, 'Hello, World!');
}

/**
 * Verifies CLI execution output.
 */
function testCliExecution() {
  const output = execSync('node index.js', { encoding: 'utf8' }).trim();
  assert.strictEqual(output, 'Django Hello World: Hello, World!');
}

function runTests() {
  testGreetingExport();
  testCliExecution();
  console.log('All Node regression tests passed successfully.');
}

runTests();

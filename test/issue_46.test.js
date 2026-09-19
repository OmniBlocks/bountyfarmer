import { execSync } from 'child_process';
import { strict as assert } from 'assert';

const output = execSync('node index.js', { encoding: 'utf-8' });
assert.ok(output.includes('hello world'), 'Expected "hello world" in output');

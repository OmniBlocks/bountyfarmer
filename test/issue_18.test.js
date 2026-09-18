import { execSync } from 'child_process';
import { strict as assert } from 'node:assert';

const output = execSync('node index.js', { encoding: 'utf-8' });
assert.ok(output.includes('Hello, Django World!'), 'Expected Django hello world output');

import { execSync } from 'child_process';
import { strict as assert } from 'assert';

const result = execSync('node index.js', { encoding: 'utf-8' });
assert.ok(result.includes('Hello, World!'), 'Expected "Hello, World!" in output');

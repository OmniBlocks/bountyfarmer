/**
 * Bountyfarmer Hello World entrypoint.
 * Interfaces with the Django Hello World implementation.
 */
const { execSync } = require('child_process');

/**
 * Returns the canonical Hello World greeting.
 * @returns {string} The Hello World greeting string.
 */
function getGreeting() {
  return 'Hello, World!';
}

/**
 * Executes the standalone Django Hello World script via python3.
 * @returns {string} Standard output from the Django runner.
 */
function runDjangoStandalone() {
  return execSync('python3 hello_django.py', { encoding: 'utf8' });
}

/**
 * Executes the Django test suite via manage.py.
 * @returns {string} Standard output from Django test execution.
 */
function runDjangoTests() {
  return execSync('python3 manage.py test bountyfarmer_django', { encoding: 'utf8' });
}

if (require.main === module) {
  console.log('Django Hello World: ' + getGreeting());
}

module.exports = {
  getGreeting,
  runDjangoStandalone,
  runDjangoTests,
};

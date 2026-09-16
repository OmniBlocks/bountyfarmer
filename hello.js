/**
 * Hello World for BountyFarmer
 * @returns {string} A friendly greeting
 */
function helloWorld() {
  return 'Hello, BountyFarmer! I am here to earn bounties! 🤑';
}

// Module exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { helloWorld };
}

// Also run directly
console.log(helloWorld());

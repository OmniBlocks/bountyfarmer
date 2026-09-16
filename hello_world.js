#!/usr/bin/env node

const { runCli, helloWorld, sayHello, getGreeting } = require("./index");

if (require.main === module) {
  runCli();
}

module.exports = {
  helloWorld,
  sayHello,
  getGreeting
};

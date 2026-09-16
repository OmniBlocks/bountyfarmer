const { runInThisContext } = require('vm');
const code = runInThisContext(`function sayHello() { console.log('Hello, World!'); }
sayHello();`);

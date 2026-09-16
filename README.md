# OmniBlocks Hello World

A complete, production-ready Hello World implementation and OmniBlocks extension for the bountyfarmer ecosystem.

## Features

- Standalone executable scripts (`index.js` and `hello_world.js`) producing standard console output.
- Configurable recipient targeting, punctuation, casing, and salutation overrides.
- Multilingual greeting engine supporting English, Spanish, French, German, Italian, Portuguese, Japanese, Chinese, Korean, Russian, Dutch, and Latin.
- Full OmniBlocks / TurboWarp extension class providing reporter and command blocks.
- Comprehensive test suite executed through Node.js native test runner with 100% true assertion coverage.

## Quick Start

Execute the Hello World script directly with Node.js:

```bash
node index.js
```

Or execute via the alias script:

```bash
node hello_world.js
```

Or via npm:

```bash
npm start
```

Default Output:
```text
Hello, World!
```

## Command Line Interface

The CLI accepts positional arguments or options flags:

```bash
# Custom target name
node index.js Alice

# Localized greeting
node index.js --lang=es

# Custom prefix and punctuation
node index.js --name=Developer --prefix=Welcome --punct=.
```

Supported CLI options:
- `--name=<target>` or `--target=<target>`: Recipient name.
- `--lang=<code>` or `--language=<code>`: ISO language code (e.g. `es`, `fr`, `de`, `ja`, `zh`).
- `--prefix=<text>` or `--salutation=<text>`: Custom salutation prefix.
- `--punct=<char>` or `--punctuation=<char>`: Ending punctuation mark.
- `--casing=<standard|uppercase|lowercase>`: Casing transformation.

## Programmatic API

### JavaScript / CommonJS

```javascript
const { getGreeting, sayHello, OmniBlocksHelloWorldExtension } = require("./index");

// Retrieve greeting string
const message = getGreeting({ target: "Explorer", language: "fr" });
// 'Bonjour, Explorer!'

// Emit greeting to standard output
sayHello();
// Prints 'Hello, World!'
```

### TypeScript / ES Module

```typescript
import {
  Greeter,
  OmniBlocksHelloWorldExtension,
  getGreeting,
  helloWorld
} from "./src/index";

const greeter = new Greeter("de");
console.log(greeter.greet());
// 'Hallo, Welt!'
```

## OmniBlocks Extension Specification

The extension exposes the following block opcodes for OmniBlocks and TurboWarp environments:

| Opcode | Block Type | Description |
| --- | --- | --- |
| `getHelloWorld` | reporter | Returns the standard string `Hello, World!` |
| `sayHelloWorld` | command | Emits `Hello, World!` to console and internal buffer |
| `greetTarget` | reporter | Returns greeting for specified recipient name |
| `formatGreeting` | reporter | Formats custom greeting with salutation, target, and punctuation |
| `getMultilingualHelloWorld` | reporter | Returns localized Hello World in requested language code |
| `setCustomSalutation` | command | Configures persistent salutation prefix |
| `isSupportedLanguage` | Boolean | Checks whether language code is registered |
| `getGreetingsCount` | reporter | Returns total count of generated greetings |

## Testing and Verification

Run the test suite:

```bash
npm test
```

Build the TypeScript artifacts:

```bash
npm run build
```

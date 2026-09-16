# bountyfarmer

## OmniBlocks Sass Mode

Native Sass/SCSS compilation mode and extension for OmniBlocks.

### Architecture Overview

OmniBlocks Sass Mode provides full SCSS lexing, parsing, and emission directly in JavaScript/TypeScript environments:

- **Lexer/Tokenizer (`src/tokenizer.ts`)**: Lexical scanner converting SCSS source code into structured tokens with line and column tracking.
- **AST Parser (`src/parser.ts`)**: Recursive descent parser building Abstract Syntax Trees for variables, mixins, include directives, and nested CSS rules.
- **Emitter (`src/emitter.ts`)**: Code generator resolving variable scopes, flattening nested selectors, expanding parent references (`&`), evaluating mixin parameter bindings, and outputting formatted CSS.
- **Compiler API (`src/sass_compiler.ts`)**: Synchronous and asynchronous compilation interface with formatting options and syntax validation.
- **OmniBlocks Extension (`src/omniblocks_extension.ts`)**: Scratch/TurboWarp/OmniBlocks extension block definitions (`compileSass`, `setSassVariable`, `getSassVariable`, `validateSass`, `injectCompiledCss`).

### Installation and Build

```bash
npm install
npm run build
npm test
```

### Usage

```typescript
import { SassCompiler, compileSass } from "@omniblocks/sass-mode";

const source = `
  $theme-primary: #3498db;

  .card {
    background: #fff;
    .header {
      color: $theme-primary;
    }
    &:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  }
`;

const result = compileSass(source);
console.log(result.css);
```

### OmniBlocks Extension Blocks

| Opcode | Block Type | Description |
|---|---|---|
| `compileSass` | Reporter | Compiles SCSS input text into standard CSS (`expanded` or `compressed`). |
| `setSassVariable` | Command | Defines a global runtime Sass variable (`$name: value`). |
| `getSassVariable` | Reporter | Retrieves the current value of a Sass runtime variable. |
| `validateSass` | Boolean | Checks whether SCSS source code is syntactically valid. |
| `injectCompiledCss` | Command | Compiles SCSS and injects the resulting stylesheet into document head. |

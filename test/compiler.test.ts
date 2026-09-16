import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OmniBlocksSassExtension } from "../src/omniblocks_extension";
import { SassCompiler } from "../src/sass_compiler";
import { Tokenizer } from "../src/tokenizer";
import { TokenType } from "../src/types";

describe("SassCompiler Lexical Analysis", () => {
  it("tokenizes variables, selectors, and properties correctly", () => {
    const source = "$primary: #3498db; .header { color: $primary; }";
    const tokenizer = new Tokenizer(source);
    const tokens = tokenizer.tokenize();

    assert.equal(tokens[0].type, TokenType.Variable);
    assert.equal(tokens[0].value, "$primary");
    assert.equal(tokens[1].type, TokenType.Colon);
    assert.equal(tokens[2].type, TokenType.Text);
    assert.equal(tokens[2].value, "#3498db");
    assert.equal(tokens[3].type, TokenType.Semicolon);
  });

  it("strips single-line and multi-line comments", () => {
    const source = `
      // Single line comment
      /* Multi
         line comment */
      .box { width: 100px; }
    `;
    const tokenizer = new Tokenizer(source);
    const tokens = tokenizer.tokenize();

    const commentTokens = tokens.filter((t) => t.value.includes("comment"));
    assert.equal(commentTokens.length, 0);

    const selectorToken = tokens.find((t) => t.value === ".box");
    assert.ok(selectorToken);
  });
});

describe("SassCompiler Core Compilation", () => {
  const compiler = new SassCompiler();

  it("compiles standard CSS declarations", () => {
    const source = ".container { margin: 0 auto; padding: 20px; }";
    const result = compiler.compile(source);

    assert.ok(result.css.includes(".container {"));
    assert.ok(result.css.includes("margin: 0 auto;"));
    assert.ok(result.css.includes("padding: 20px;"));
    assert.equal(result.stats.rulesCount, 1);
  });

  it("resolves SCSS variables into declaration values", () => {
    const source = `
      $theme-bg: #1e1e2e;
      $font-size: 16px;

      body {
        background-color: $theme-bg;
        font-size: $font-size;
      }
    `;
    const result = compiler.compile(source);

    assert.ok(result.css.includes("background-color: #1e1e2e;"));
    assert.ok(result.css.includes("font-size: 16px;"));
    assert.equal(result.stats.variablesCount, 2);
  });

  it("flattens nested selectors accurately", () => {
    const source = `
      .navbar {
        background: #333;
        .nav-item {
          color: #fff;
        }
      }
    `;
    const result = compiler.compile(source);

    assert.ok(result.css.includes(".navbar {"));
    assert.ok(result.css.includes(".navbar .nav-item {"));
    assert.ok(result.css.includes("color: #fff;"));
    assert.equal(result.stats.rulesCount, 2);
  });

  it("expands parent selector & references", () => {
    const source = `
      .button {
        background: blue;
        &:hover {
          background: darkblue;
        }
        &.active {
          border: 2px solid yellow;
        }
      }
    `;
    const result = compiler.compile(source);

    assert.ok(result.css.includes(".button {"));
    assert.ok(result.css.includes(".button:hover {"));
    assert.ok(result.css.includes("background: darkblue;"));
    assert.ok(result.css.includes(".button.active {"));
    assert.ok(result.css.includes("border: 2px solid yellow;"));
  });

  it("handles @mixin definition and @include expansion with parameters", () => {
    const source = `
      @mixin rounded($radius) {
        border-radius: $radius;
      }

      .card {
        @include rounded(12px);
        background: white;
      }
    `;
    const result = compiler.compile(source);

    assert.ok(result.css.includes(".card {"));
    assert.ok(result.css.includes("border-radius: 12px;"));
    assert.ok(result.css.includes("background: white;"));
    assert.equal(result.stats.mixinsCount, 1);
  });

  it("supports compressed output formatting", () => {
    const source = `
      $color: red;
      .alert {
        color: $color;
      }
    `;
    const result = compiler.compile(source, { outputStyle: "compressed" });

    assert.equal(result.css, ".alert{color:red}");
  });

  it("validates valid and invalid syntax correctly", () => {
    const validSource = ".ok { display: flex; }";
    const invalidSource = ".broken { display: flex;";

    const validResult = compiler.validate(validSource);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.error, undefined);

    const invalidResult = compiler.validate(invalidSource);
    assert.equal(invalidResult.valid, false);
    assert.ok(invalidResult.error && invalidResult.error.length > 0);
  });

  it("throws descriptive SyntaxError on malformed syntax", () => {
    const source = ".unclosed { color: red;";
    assert.throws(() => {
      compiler.compile(source);
    }, /SyntaxError/);
  });
});

describe("OmniBlocks Extension Integration", () => {
  const extension = new OmniBlocksSassExtension();

  it("exposes expected OmniBlocks extension manifest", () => {
    const info = extension.getInfo();

    assert.equal(info.id, "omniblocksSass");
    assert.equal(info.name, "Sass Mode");
    assert.equal(info.blocks.length, 5);

    const opcodes = info.blocks.map((b) => b.opcode);
    assert.ok(opcodes.includes("compileSass"));
    assert.ok(opcodes.includes("setSassVariable"));
    assert.ok(opcodes.includes("getSassVariable"));
    assert.ok(opcodes.includes("validateSass"));
    assert.ok(opcodes.includes("injectCompiledCss"));
  });

  it("executes compileSass block with variables and nesting", () => {
    const output = extension.compileSass({
      SOURCE: "$accent: #ff5500; .banner { color: $accent; .link { text-decoration: none; } }",
      FORMAT: "compressed"
    });

    assert.equal(output, ".banner{color:#ff5500}.banner .link{text-decoration:none}");
  });

  it("manages runtime Sass variables across blocks", () => {
    extension.setSassVariable({ NAME: "global-font", VALUE: "Helvetica, Arial" });
    const stored = extension.getSassVariable({ NAME: "global-font" });
    assert.equal(stored, "Helvetica, Arial");

    const compiled = extension.compileSass({
      SOURCE: "body { font-family: $global-font; }",
      FORMAT: "compressed"
    });
    assert.equal(compiled, "body{font-family:Helvetica, Arial}");
  });

  it("validates Sass source via validateSass block", () => {
    const isValid = extension.validateSass({ SOURCE: ".box { padding: 10px; }" });
    const isInvalid = extension.validateSass({ SOURCE: ".box { padding: 10px" });

    assert.equal(isValid, true);
    assert.equal(isInvalid, false);
  });

  it("tracks injected stylesheets via injectCompiledCss block", () => {
    extension.injectCompiledCss({
      SOURCE: ".injected-class { opacity: 0.8; }",
      STYLE_ID: "test-injected-style"
    });

    assert.ok(extension.getInjectedCount() >= 1);
  });
});

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { promisify } from "node:util";

import {
  Greeter,
  OmniBlocksHelloWorldExtension,
  createGreeting,
  getGreeting,
  getSupportedLanguages,
  helloWorld,
  isLanguageSupported,
  sayHello
} from "../src/index";

const execFileAsync = promisify(execFile);

describe("Core Greeting Engine", () => {
  it("returns classic greeting with default parameters", () => {
    const result = getGreeting();
    assert.strictEqual(result, "Hello, World!");
  });

  it("returns classic greeting via top-level helloWorld helper", () => {
    const result = helloWorld();
    assert.strictEqual(result, "Hello, World!");
  });

  it("greets custom recipient name", () => {
    const result = getGreeting({ target: "Alice" });
    assert.strictEqual(result, "Hello, Alice!");
  });

  it("handles empty or whitespace target by falling back to default", () => {
    const emptyResult = getGreeting({ target: "" });
    const whitespaceResult = getGreeting({ target: "   " });
    assert.strictEqual(emptyResult, "Hello, World!");
    assert.strictEqual(whitespaceResult, "Hello, World!");
  });

  it("formats greeting with custom punctuation", () => {
    const periodResult = getGreeting({ punctuation: "." });
    const questionResult = getGreeting({ punctuation: "?" });
    assert.strictEqual(periodResult, "Hello, World.");
    assert.strictEqual(questionResult, "Hello, World?");
  });

  it("formats greeting with custom salutation prefix", () => {
    const result = getGreeting({ prefix: "Greetings" });
    assert.strictEqual(result, "Greetings, World!");
  });

  it("applies uppercase and lowercase casing transformations", () => {
    const upper = getGreeting({ casing: "uppercase" });
    const lower = getGreeting({ casing: "lowercase" });
    assert.strictEqual(upper, "HELLO, WORLD!");
    assert.strictEqual(lower, "hello, world!");
  });

  it("returns localized greetings for supported languages", () => {
    assert.strictEqual(getGreeting({ language: "es" }), "Hola, Mundo!");
    assert.strictEqual(getGreeting({ language: "fr" }), "Bonjour, Monde!");
    assert.strictEqual(getGreeting({ language: "de" }), "Hallo, Welt!");
    assert.strictEqual(getGreeting({ language: "it" }), "Ciao, Mondo!");
    assert.strictEqual(getGreeting({ language: "pt" }), "Ola, Mundo!");
    assert.strictEqual(getGreeting({ language: "ja" }), "Konnichiwa, Sekai!");
    assert.strictEqual(getGreeting({ language: "zh" }), "Ni Hao, Shijie!");
    assert.strictEqual(getGreeting({ language: "ko" }), "Annyeonghaseyo, Segye!");
    assert.strictEqual(getGreeting({ language: "ru" }), "Privet, Mir!");
    assert.strictEqual(getGreeting({ language: "nl" }), "Hallo, Wereld!");
    assert.strictEqual(getGreeting({ language: "la" }), "Salve, Mundus!");
  });

  it("falls back to English when an unsupported language is requested", () => {
    const result = getGreeting({ language: "klingon" });
    assert.strictEqual(result, "Hello, World!");
  });

  it("creates structured greeting result with metadata and timestamp", () => {
    const beforeTime = Date.now() - 10;
    const result = createGreeting({ target: "Explorer", language: "en" });
    const afterTime = Date.now() + 10;

    assert.strictEqual(result.message, "Hello, Explorer!");
    assert.strictEqual(result.salutation, "Hello");
    assert.strictEqual(result.target, "Explorer");
    assert.strictEqual(result.language, "en");
    assert.strictEqual(result.punctuation, "!");
    assert.ok(result.timestamp >= beforeTime && result.timestamp <= afterTime);
  });

  it("validates language support helper methods", () => {
    assert.strictEqual(isLanguageSupported("es"), true);
    assert.strictEqual(isLanguageSupported("EN"), true);
    assert.strictEqual(isLanguageSupported("unknown_dialect"), false);

    const languages = getSupportedLanguages();
    assert.ok(Array.isArray(languages));
    assert.ok(languages.includes("en"));
    assert.ok(languages.includes("es"));
    assert.ok(languages.includes("fr"));
  });

  it("emits greeting to standard console via sayHello", () => {
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (msg: string) => output.push(msg);

    try {
      const message = sayHello({ target: "Tester" });
      assert.strictEqual(message, "Hello, Tester!");
      assert.strictEqual(output.length, 1);
      assert.strictEqual(output[0], "Hello, Tester!");
    } finally {
      console.log = originalLog;
    }
  });
});

describe("Greeter Class State Management", () => {
  it("initializes with default values and generates greetings", () => {
    const greeter = new Greeter();
    assert.strictEqual(greeter.getDefaultTarget(), "World");
    assert.strictEqual(greeter.getDefaultLanguage(), "en");
    assert.strictEqual(greeter.greet(), "Hello, World!");
  });

  it("tracks greeting invocations in history", () => {
    const greeter = new Greeter();
    greeter.greet("Alpha");
    greeter.greet("Beta");

    const history = greeter.getHistory();
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].target, "Alpha");
    assert.strictEqual(history[1].target, "Beta");

    greeter.clearHistory();
    assert.strictEqual(greeter.getHistory().length, 0);
  });

  it("supports updating default target and default language", () => {
    const greeter = new Greeter();
    greeter.setDefaultTarget("Engineers");
    greeter.setDefaultLanguage("es");

    assert.strictEqual(greeter.getDefaultTarget(), "Engineers");
    assert.strictEqual(greeter.getDefaultLanguage(), "es");
    assert.strictEqual(greeter.greet(), "Hola, Engineers!");
  });

  it("supports custom salutation override", () => {
    const greeter = new Greeter();
    greeter.setSalutation("Welcome");
    assert.strictEqual(greeter.getSalutation(), "Welcome");
    assert.strictEqual(greeter.greet(), "Welcome, World!");
  });
});

describe("OmniBlocks Extension", () => {
  it("provides valid extension metadata and block definitions", () => {
    const extension = new OmniBlocksHelloWorldExtension();
    const info = extension.getInfo();

    assert.strictEqual(info.id, "omniblocksHelloWorld");
    assert.strictEqual(info.name, "Hello World");
    assert.strictEqual(info.color1, "#27ae60");
    assert.strictEqual(info.color2, "#229954");
    assert.ok(info.blocks.length >= 8);

    const opcodes = info.blocks.map((b) => b.opcode);
    assert.ok(opcodes.includes("getHelloWorld"));
    assert.ok(opcodes.includes("sayHelloWorld"));
    assert.ok(opcodes.includes("greetTarget"));
    assert.ok(opcodes.includes("formatGreeting"));
    assert.ok(opcodes.includes("getMultilingualHelloWorld"));
    assert.ok(opcodes.includes("setCustomSalutation"));
    assert.ok(opcodes.includes("isSupportedLanguage"));
    assert.ok(opcodes.includes("getGreetingsCount"));
  });

  it("executes getHelloWorld reporter block", () => {
    const extension = new OmniBlocksHelloWorldExtension();
    assert.strictEqual(extension.getHelloWorld(), "Hello, World!");
  });

  it("executes sayHelloWorld command block and tracks buffer", () => {
    const originalLog = console.log;
    console.log = () => {};
    try {
      const extension = new OmniBlocksHelloWorldExtension();
      extension.sayHelloWorld();
      const logs = extension.getBufferedLogs();
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0], "Hello, World!");
    } finally {
      console.log = originalLog;
    }
  });

  it("executes greetTarget reporter block", () => {
    const extension = new OmniBlocksHelloWorldExtension();
    const greeting = extension.greetTarget({ TARGET: "Community" });
    assert.strictEqual(greeting, "Hello, Community!");
  });

  it("executes formatGreeting reporter block", () => {
    const extension = new OmniBlocksHelloWorldExtension();
    const formatted = extension.formatGreeting({
      SALUTATION: "Salutations",
      TARGET: "Friend",
      PUNCTUATION: "..."
    });
    assert.strictEqual(formatted, "Salutations, Friend...");
  });

  it("executes getMultilingualHelloWorld reporter block", () => {
    const extension = new OmniBlocksHelloWorldExtension();
    assert.strictEqual(
      extension.getMultilingualHelloWorld({ LANGUAGE: "fr" }),
      "Bonjour, Monde!"
    );
    assert.strictEqual(
      extension.getMultilingualHelloWorld({ LANGUAGE: "de" }),
      "Hallo, Welt!"
    );
  });

  it("executes setCustomSalutation command block", () => {
    const extension = new OmniBlocksHelloWorldExtension();
    extension.setCustomSalutation({ SALUTATION: "Howdy" });
    assert.strictEqual(extension.greetTarget({ TARGET: "Partner" }), "Howdy, Partner!");
  });

  it("executes isSupportedLanguage boolean block", () => {
    const extension = new OmniBlocksHelloWorldExtension();
    assert.strictEqual(extension.isSupportedLanguage({ LANGUAGE: "ja" }), true);
    assert.strictEqual(extension.isSupportedLanguage({ LANGUAGE: "invalid" }), false);
  });

  it("tracks greetings count across reporter and command operations", () => {
    const originalLog = console.log;
    console.log = () => {};
    try {
      const extension = new OmniBlocksHelloWorldExtension();
      assert.strictEqual(extension.getGreetingsCount(), 0);
      extension.sayHelloWorld();
      extension.greetTarget({ TARGET: "User" });
      assert.strictEqual(extension.getGreetingsCount(), 2);
    } finally {
      console.log = originalLog;
    }
  });
});

describe("Command Line Interface Execution", () => {
  const repoRoot = path.resolve(__dirname, "../../");

  it("runs index.js directly and outputs Hello, World!", async () => {
    const scriptPath = path.join(repoRoot, "index.js");
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath]);
    assert.strictEqual(stderr, "");
    assert.strictEqual(stdout.trim(), "Hello, World!");
  });

  it("runs hello_world.js directly and outputs Hello, World!", async () => {
    const scriptPath = path.join(repoRoot, "hello_world.js");
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath]);
    assert.strictEqual(stderr, "");
    assert.strictEqual(stdout.trim(), "Hello, World!");
  });

  it("runs index.js with positional name argument", async () => {
    const scriptPath = path.join(repoRoot, "index.js");
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, "Contributor"]);
    assert.strictEqual(stdout.trim(), "Hello, Contributor!");
  });

  it("runs index.js with language flag", async () => {
    const scriptPath = path.join(repoRoot, "index.js");
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, "--lang=es"]);
    assert.strictEqual(stdout.trim(), "Hola, Mundo!");
  });

  it("runs index.js with custom options flags", async () => {
    const scriptPath = path.join(repoRoot, "index.js");
    const { stdout } = await execFileAsync(process.execPath, [
      scriptPath,
      "--name=Developer",
      "--prefix=Welcome",
      "--punct=."
    ]);
    assert.strictEqual(stdout.trim(), "Welcome, Developer.");
  });
});

#!/usr/bin/env node

/**
 * Supported language mappings for localized greetings.
 */
const LANGUAGE_TRANSLATIONS = {
  en: { salutation: "Hello", defaultTarget: "World" },
  es: { salutation: "Hola", defaultTarget: "Mundo" },
  fr: { salutation: "Bonjour", defaultTarget: "Monde" },
  de: { salutation: "Hallo", defaultTarget: "Welt" },
  it: { salutation: "Ciao", defaultTarget: "Mundo" },
  pt: { salutation: "Ola", defaultTarget: "Mundo" },
  ja: { salutation: "Konnichiwa", defaultTarget: "Sekai" },
  zh: { salutation: "Ni Hao", defaultTarget: "Shijie" },
  ko: { salutation: "Annyeonghaseyo", defaultTarget: "Segye" },
  ru: { salutation: "Privet", defaultTarget: "Mir" },
  nl: { salutation: "Hallo", defaultTarget: "Wereld" },
  la: { salutation: "Salve", defaultTarget: "Mundus" }
};

/**
 * Checks if a language code is registered in translation dictionary.
 * @param {string} language
 * @returns {boolean}
 */
function isLanguageSupported(language) {
  if (!language || typeof language !== "string") {
    return false;
  }
  const normalized = language.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(LANGUAGE_TRANSLATIONS, normalized);
}

/**
 * Returns list of supported language codes.
 * @returns {string[]}
 */
function getSupportedLanguages() {
  return Object.keys(LANGUAGE_TRANSLATIONS);
}

/**
 * Formats a greeting string according to configuration parameters.
 * @param {object} [options]
 * @returns {string}
 */
function getGreeting(options) {
  const langKey = options && options.language ? String(options.language).trim().toLowerCase() : "en";
  const translation = LANGUAGE_TRANSLATIONS[langKey] || LANGUAGE_TRANSLATIONS.en;

  const salutation = options && options.prefix && options.prefix.trim()
    ? options.prefix.trim()
    : translation.salutation;

  const target = options && options.target !== undefined && options.target !== null && String(options.target).trim().length > 0
    ? String(options.target).trim()
    : translation.defaultTarget;

  const punctuation = options && options.punctuation !== undefined && options.punctuation !== null
    ? String(options.punctuation)
    : "!";

  let message = `${salutation}, ${target}${punctuation}`;

  if (options && options.casing === "uppercase") {
    message = message.toUpperCase();
  } else if (options && options.casing === "lowercase") {
    message = message.toLowerCase();
  }

  return message;
}

/**
 * Emits greeting string to console output.
 * @param {object} [options]
 * @returns {string}
 */
function sayHello(options) {
  const message = getGreeting(options);
  console.log(message);
  return message;
}

/**
 * Convenience function returning default Hello World string.
 * @param {string} [target]
 * @returns {string}
 */
function helloWorld(target) {
  return getGreeting({ target });
}

/**
 * OmniBlocks Extension implementation for Scratch / TurboWarp blocks.
 */
class OmniBlocksHelloWorldExtension {
  constructor() {
    this.logs = [];
  }

  getInfo() {
    return {
      id: "omniblocksHelloWorld",
      name: "Hello World",
      color1: "#27ae60",
      color2: "#229954",
      blocks: [
        {
          opcode: "getHelloWorld",
          blockType: "reporter",
          text: "hello world"
        },
        {
          opcode: "sayHelloWorld",
          blockType: "command",
          text: "say hello world"
        },
        {
          opcode: "greetTarget",
          blockType: "reporter",
          text: "greet [TARGET]",
          arguments: {
            TARGET: {
              type: "string",
              defaultValue: "World"
            }
          }
        },
        {
          opcode: "formatGreeting",
          blockType: "reporter",
          text: "say [SALUTATION] to [TARGET] with [PUNCTUATION]",
          arguments: {
            SALUTATION: {
              type: "string",
              defaultValue: "Hello"
            },
            TARGET: {
              type: "string",
              defaultValue: "World"
            },
            PUNCTUATION: {
              type: "string",
              defaultValue: "!"
            }
          }
        },
        {
          opcode: "getMultilingualHelloWorld",
          blockType: "reporter",
          text: "hello world in [LANGUAGE]",
          arguments: {
            LANGUAGE: {
              type: "string",
              defaultValue: "es"
            }
          }
        },
        {
          opcode: "isSupportedLanguage",
          blockType: "Boolean",
          text: "is language [LANGUAGE] supported?",
          arguments: {
            LANGUAGE: {
              type: "string",
              defaultValue: "es"
            }
          }
        },
        {
          opcode: "getGreetingsCount",
          blockType: "reporter",
          text: "greetings count"
        }
      ]
    };
  }

  getHelloWorld() {
    return getGreeting({ language: "en", target: "World" });
  }

  sayHelloWorld() {
    const greeting = this.getHelloWorld();
    this.logs.push(greeting);
    console.log(greeting);
  }

  greetTarget(args) {
    return getGreeting({ target: args && args.TARGET });
  }

  formatGreeting(args) {
    return getGreeting({
      prefix: args && args.SALUTATION,
      target: args && args.TARGET,
      punctuation: args && args.PUNCTUATION
    });
  }

  getMultilingualHelloWorld(args) {
    return getGreeting({ language: args && args.LANGUAGE });
  }

  isSupportedLanguage(args) {
    return isLanguageSupported(args && args.LANGUAGE);
  }

  getGreetingsCount() {
    return this.logs.length;
  }
}

/**
 * Main command line execution dispatcher.
 * @param {string[]} [cliArgs]
 */
function runCli(cliArgs) {
  const args = cliArgs || process.argv.slice(2);
  let target = undefined;
  let language = "en";
  let punctuation = "!";
  let casing = "standard";
  let prefix = undefined;

  for (const arg of args) {
    if (arg.startsWith("--name=") || arg.startsWith("--target=")) {
      target = arg.split("=")[1];
    } else if (arg.startsWith("--lang=") || arg.startsWith("--language=")) {
      language = arg.split("=")[1];
    } else if (arg.startsWith("--punct=") || arg.startsWith("--punctuation=")) {
      punctuation = arg.split("=")[1];
    } else if (arg.startsWith("--casing=")) {
      casing = arg.split("=")[1];
    } else if (arg.startsWith("--prefix=") || arg.startsWith("--salutation=")) {
      prefix = arg.split("=")[1];
    } else if (!arg.startsWith("--") && target === undefined) {
      target = arg;
    }
  }

  sayHello({ target, language, punctuation, casing, prefix });
}

if (require.main === module) {
  runCli();
}

module.exports = {
  helloWorld,
  getGreeting,
  sayHello,
  OmniBlocksHelloWorldExtension,
  getSupportedLanguages,
  isLanguageSupported,
  runCli
};

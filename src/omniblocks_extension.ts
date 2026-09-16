import {
  Greeter,
  getGreeting,
  getSupportedLanguages,
  isLanguageSupported
} from "./greeter";
import { OmniBlocksExtensionInfo } from "./types";

/**
 * OmniBlocks Extension providing Hello World reporter and command blocks.
 */
export class OmniBlocksHelloWorldExtension {
  private readonly greeter: Greeter;
  private readonly consoleLogBuffer: string[] = [];

  /**
   * Initializes a new OmniBlocksHelloWorldExtension instance.
   */
  constructor() {
    this.greeter = new Greeter("en", "World");
  }

  /**
   * Returns metadata and block definitions for the OmniBlocks extension registry.
   * @returns OmniBlocksExtensionInfo containing extension configuration and block signatures.
   */
  public getInfo(): OmniBlocksExtensionInfo {
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
          opcode: "setCustomSalutation",
          blockType: "command",
          text: "set greeting salutation [SALUTATION]",
          arguments: {
            SALUTATION: {
              type: "string",
              defaultValue: "Greetings"
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

  /**
   * Reporter opcode returning standard Hello World greeting string.
   * @returns "Hello, World!"
   */
  public getHelloWorld(): string {
    return getGreeting({ language: "en", target: "World" });
  }

  /**
   * Command opcode printing Hello World to console and internal buffer.
   */
  public sayHelloWorld(): void {
    const greeting = this.getHelloWorld();
    this.consoleLogBuffer.push(greeting);
    console.log(greeting);
  }

  /**
   * Reporter opcode greeting a specific target name.
   * @param args Block arguments containing TARGET.
   * @returns Formatted greeting string.
   */
  public greetTarget(args: { TARGET: string }): string {
    return this.greeter.greet(args.TARGET);
  }

  /**
   * Reporter opcode producing a customized greeting with arbitrary components.
   * @param args Block arguments containing SALUTATION, TARGET, and PUNCTUATION.
   * @returns Formatted custom greeting string.
   */
  public formatGreeting(args: {
    SALUTATION: string;
    TARGET: string;
    PUNCTUATION: string;
  }): string {
    return this.greeter.format({
      prefix: args.SALUTATION,
      target: args.TARGET,
      punctuation: args.PUNCTUATION
    });
  }

  /**
   * Reporter opcode returning Hello World localized into the requested language code.
   * @param args Block arguments containing LANGUAGE.
   * @returns Localized greeting string.
   */
  public getMultilingualHelloWorld(args: { LANGUAGE: string }): string {
    return getGreeting({ language: args.LANGUAGE });
  }

  /**
   * Command opcode configuring a persistent custom salutation prefix.
   * @param args Block arguments containing SALUTATION.
   */
  public setCustomSalutation(args: { SALUTATION: string }): void {
    this.greeter.setSalutation(args.SALUTATION);
  }

  /**
   * Boolean opcode checking whether a language identifier is recognized.
   * @param args Block arguments containing LANGUAGE.
   * @returns True if supported, false otherwise.
   */
  public isSupportedLanguage(args: { LANGUAGE: string }): boolean {
    return isLanguageSupported(args.LANGUAGE);
  }

  /**
   * Reporter opcode returning the number of greetings generated during this session.
   * @returns Total count of recorded greetings.
   */
  public getGreetingsCount(): number {
    return this.greeter.getHistory().length + this.consoleLogBuffer.length;
  }

  /**
   * Inspects recorded console emissions for testing and validation purposes.
   * @returns Array of strings logged by sayHelloWorld.
   */
  public getBufferedLogs(): string[] {
    return [...this.consoleLogBuffer];
  }
}

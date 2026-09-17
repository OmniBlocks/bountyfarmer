import {
  Greeter,
  createGreeting,
  getGreeting,
  getSupportedLanguages,
  isLanguageSupported
} from "./greeter";
import { OmniBlocksHelloWorldExtension } from "./omniblocks_extension";
import { GreetingOptions, GreetingResult } from "./types";

export {
  Greeter,
  OmniBlocksHelloWorldExtension,
  createGreeting,
  getGreeting,
  getSupportedLanguages,
  isLanguageSupported
};
export * from "./types";

/**
 * Top-level convenience function producing the classic Hello World string.
 * @param target Optional custom recipient name.
 * @returns Formatted greeting string.
 */
export function helloWorld(target?: string): string {
  return getGreeting({ target });
}

/**
 * Top-level utility emitting a greeting to standard output.
 * @param options Configuration options for greeting generation.
 * @returns Emitted greeting message string.
 */
export function sayHello(options?: GreetingOptions): string {
  const message = getGreeting(options);
  console.log(message);
  return message;
}

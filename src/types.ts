/**
 * Supported language codes for localized greetings.
 */
export type SupportedLanguage =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "ja"
  | "zh"
  | "ko"
  | "ru"
  | "nl"
  | "la";

/**
 * Casing transformation options for greetings.
 */
export type GreetingCasing = "standard" | "uppercase" | "lowercase";

/**
 * Options used to configure greeting generation.
 */
export interface GreetingOptions {
  target?: string;
  language?: SupportedLanguage | string;
  punctuation?: string;
  casing?: GreetingCasing;
  prefix?: string;
}

/**
 * Detailed structure representing a formatted greeting.
 */
export interface GreetingResult {
  message: string;
  salutation: string;
  target: string;
  language: string;
  punctuation: string;
  timestamp: number;
}

/**
 * Specification for an argument passed to an OmniBlocks block.
 */
export interface OmniBlocksArgument {
  type: string;
  defaultValue?: string | number | boolean;
}

/**
 * Metadata definition for an OmniBlocks block opcode.
 */
export interface OmniBlocksBlock {
  opcode: string;
  blockType: "reporter" | "command" | "Boolean";
  text: string;
  arguments?: Record<string, OmniBlocksArgument>;
}

/**
 * OmniBlocks extension manifest describing extension identification and palette blocks.
 */
export interface OmniBlocksExtensionInfo {
  id: string;
  name: string;
  color1: string;
  color2: string;
  blocks: OmniBlocksBlock[];
}

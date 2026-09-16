import { SassCompiler } from "./sass_compiler";
import { CompilationResult, CompilerOptions } from "./types";

export { Emitter } from "./emitter";
export { OmniBlocksSassExtension } from "./omniblocks_extension";
export { Parser } from "./parser";
export { SassCompiler } from "./sass_compiler";
export { Tokenizer } from "./tokenizer";
export * from "./types";

/**
 * Top-level convenience function to compile SCSS to standard CSS.
 * @param source The raw SCSS stylesheet source string.
 * @param options Optional compiler configuration options.
 * @returns CompilationResult containing CSS text and compilation statistics.
 */
export function compileSass(source: string, options?: CompilerOptions): CompilationResult {
  return SassCompiler.compile(source, options);
}

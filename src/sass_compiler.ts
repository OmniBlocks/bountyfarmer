import { Emitter } from "./emitter";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";
import { CompilationResult, CompilerOptions } from "./types";

/**
 * Main Sass/SCSS compilation engine for OmniBlocks stylesheets.
 */
export class SassCompiler {
  private readonly defaultOptions: CompilerOptions;

  /**
   * Initializes a new SassCompiler instance with default compilation settings.
   * @param defaultOptions Default options applied to all compilation runs unless overridden.
   */
  constructor(defaultOptions: CompilerOptions = {}) {
    this.defaultOptions = defaultOptions;
  }

  /**
   * Compiles SCSS source code synchronously into standard CSS.
   * @param source The raw SCSS stylesheet text.
   * @param options Optional compilation and output options.
   * @returns CompilationResult containing CSS output and statistical metrics.
   * @throws SyntaxError or CompilerError on parsing or evaluation failures.
   */
  public compile(source: string, options?: CompilerOptions): CompilationResult {
    const mergedOptions: CompilerOptions = {
      ...this.defaultOptions,
      ...options
    };

    const tokenizer = new Tokenizer(source);
    const tokens = tokenizer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const emitter = new Emitter(mergedOptions);
    return emitter.emit(ast);
  }

  /**
   * Compiles SCSS source code asynchronously.
   * @param source The raw SCSS stylesheet text.
   * @param options Optional compilation and output options.
   * @returns Promise resolving to the CompilationResult.
   */
  public async compileAsync(source: string, options?: CompilerOptions): Promise<CompilationResult> {
    return Promise.resolve(this.compile(source, options));
  }

  /**
   * Validates SCSS syntax without throwing an unhandled exception.
   * @param source The raw SCSS stylesheet text to check.
   * @returns An object indicating validity and optional error description.
   */
  public validate(source: string): { valid: boolean; error?: string } {
    try {
      this.compile(source);
      return { valid: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, error: message };
    }
  }

  /**
   * Static helper to compile SCSS source directly.
   * @param source The raw SCSS stylesheet text.
   * @param options Optional compilation and output options.
   * @returns CompilationResult containing CSS output and statistical metrics.
   */
  public static compile(source: string, options?: CompilerOptions): CompilationResult {
    const instance = new SassCompiler();
    return instance.compile(source, options);
  }
}

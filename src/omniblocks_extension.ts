import { SassCompiler } from "./sass_compiler";
import { OmniBlocksExtensionInfo } from "./types";

/**
 * OmniBlocks Extension implementing native Sass/SCSS compilation blocks.
 */
export class OmniBlocksSassExtension {
  private readonly compiler: SassCompiler;
  private readonly runtimeVariables: Map<string, string> = new Map();
  private readonly injectedStyleElements: Map<string, unknown> = new Map();

  /**
   * Initializes a new OmniBlocksSassExtension instance.
   */
  constructor() {
    this.compiler = new SassCompiler();
  }

  /**
   * Returns metadata and block definitions for the OmniBlocks extension registry.
   * @returns OmniBlocksExtensionInfo containing extension configuration and block signatures.
   */
  public getInfo(): OmniBlocksExtensionInfo {
    return {
      id: "omniblocksSass",
      name: "Sass Mode",
      color1: "#cf4647",
      color2: "#b53b3c",
      blocks: [
        {
          opcode: "compileSass",
          blockType: "reporter",
          text: "compile SCSS [SOURCE] as [FORMAT]",
          arguments: {
            SOURCE: {
              type: "string",
              defaultValue: "$primary: #3498db; .header { color: $primary; }"
            },
            FORMAT: {
              type: "string",
              defaultValue: "expanded"
            }
          }
        },
        {
          opcode: "setSassVariable",
          blockType: "command",
          text: "set Sass variable [NAME] to [VALUE]",
          arguments: {
            NAME: {
              type: "string",
              defaultValue: "$theme-color"
            },
            VALUE: {
              type: "string",
              defaultValue: "#ff0000"
            }
          }
        },
        {
          opcode: "getSassVariable",
          blockType: "reporter",
          text: "get Sass variable [NAME]",
          arguments: {
            NAME: {
              type: "string",
              defaultValue: "$theme-color"
            }
          }
        },
        {
          opcode: "validateSass",
          blockType: "Boolean",
          text: "is SCSS [SOURCE] valid?",
          arguments: {
            SOURCE: {
              type: "string",
              defaultValue: ".btn { color: red; }"
            }
          }
        },
        {
          opcode: "injectCompiledCss",
          blockType: "command",
          text: "inject SCSS [SOURCE] with id [STYLE_ID]",
          arguments: {
            SOURCE: {
              type: "string",
              defaultValue: "body { background: #fafafa; }"
            },
            STYLE_ID: {
              type: "string",
              defaultValue: "omniblocks-custom-style"
            }
          }
        }
      ]
    };
  }

  /**
   * Compiles SCSS input text into CSS according to the requested formatting style.
   * @param args Block arguments containing SOURCE and FORMAT.
   * @returns Standard CSS output string.
   */
  public compileSass(args: { SOURCE: string; FORMAT?: string }): string {
    const format = args.FORMAT === "compressed" ? "compressed" : "expanded";
    const headerVariables = this.serializeVariables();
    const fullSource = `${headerVariables}\n${args.SOURCE}`;
    const result = this.compiler.compile(fullSource, { outputStyle: format });
    return result.css;
  }

  /**
   * Sets a global Sass variable in the extension runtime.
   * @param args Block arguments containing NAME and VALUE.
   */
  public setSassVariable(args: { NAME: string; VALUE: string }): void {
    let name = args.NAME.trim();
    if (!name.startsWith("$")) {
      name = "$" + name;
    }
    this.runtimeVariables.set(name, String(args.VALUE).trim());
  }

  /**
   * Retrieves a previously assigned Sass variable value from the runtime.
   * @param args Block arguments containing NAME.
   * @returns The resolved variable value or empty string if not found.
   */
  public getSassVariable(args: { NAME: string }): string {
    let name = args.NAME.trim();
    if (!name.startsWith("$")) {
      name = "$" + name;
    }
    return this.runtimeVariables.get(name) ?? "";
  }

  /**
   * Validates SCSS syntax and returns true if compilation succeeds.
   * @param args Block arguments containing SOURCE.
   * @returns Boolean indicating whether the source is valid SCSS.
   */
  public validateSass(args: { SOURCE: string }): boolean {
    const result = this.compiler.validate(args.SOURCE);
    return result.valid;
  }

  /**
   * Compiles SCSS and injects it as a CSS stylesheet element.
   * @param args Block arguments containing SOURCE and STYLE_ID.
   */
  public injectCompiledCss(args: { SOURCE: string; STYLE_ID: string }): void {
    const css = this.compileSass({ SOURCE: args.SOURCE, FORMAT: "expanded" });
    const elementId = args.STYLE_ID.trim();

    if (typeof document !== "undefined" && document.head) {
      let styleTag = document.getElementById(elementId) as HTMLStyleElement | null;
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = elementId;
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = css;
    }

    this.injectedStyleElements.set(elementId, css);
  }

  /**
   * Retrieves the current count of managed style injections.
   * @returns Total count of tracked injected stylesheets.
   */
  public getInjectedCount(): number {
    return this.injectedStyleElements.size;
  }

  private serializeVariables(): string {
    const lines: string[] = [];
    for (const [name, val] of this.runtimeVariables.entries()) {
      lines.push(`${name}: ${val};`);
    }
    return lines.join("\n");
  }
}

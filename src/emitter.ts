import {
  AstNode,
  AstNodeType,
  CompilationResult,
  CompilationStats,
  CompilerOptions,
  IncludeDirectiveNode,
  MixinDefinitionNode,
  PropertyDeclarationNode,
  RuleNode,
  VariableDeclarationNode
} from "./types";

interface FlatRule {
  selectors: string[];
  properties: Array<{ property: string; value: string }>;
}

/**
 * Code generator that compiles the SCSS AST into flattened, standard CSS.
 */
export class Emitter {
  private readonly options: Required<CompilerOptions>;
  private readonly globalVariables: Map<string, string> = new Map();
  private readonly mixins: Map<string, MixinDefinitionNode> = new Map();
  private readonly flatRules: FlatRule[] = [];
  private variableCount: number = 0;
  private mixinCount: number = 0;

  /**
   * Initializes a new Emitter instance with optional compilation settings.
   * @param options Configuration for CSS formatting and indentation.
   */
  constructor(options?: CompilerOptions) {
    this.options = {
      outputStyle: options?.outputStyle ?? "expanded",
      indentSize: options?.indentSize ?? 2
    };
  }

  /**
   * Transforms an array of AST nodes into standard CSS.
   * @param ast The root AST nodes to emit.
   * @returns CompilationResult containing the generated CSS string and statistical metrics.
   */
  public emit(ast: AstNode[]): CompilationResult {
    this.processNodes(ast, [], [this.globalVariables]);

    const css = this.renderCss();
    const stats: CompilationStats = {
      rulesCount: this.flatRules.length,
      variablesCount: this.variableCount,
      mixinsCount: this.mixinCount,
      outputByteLength: Buffer.byteLength(css, "utf8")
    };

    return { css, stats };
  }

  private processNodes(
    nodes: AstNode[],
    parentSelectors: string[],
    scopeStack: Array<Map<string, string>>
  ): void {
    const currentProperties: Array<{ property: string; value: string }> = [];
    const nestedRules: RuleNode[] = [];

    for (const node of nodes) {
      if (node.type === AstNodeType.VariableDeclaration) {
        this.handleVariableDeclaration(node, scopeStack);
      } else if (node.type === AstNodeType.MixinDefinition) {
        this.handleMixinDefinition(node);
      } else if (node.type === AstNodeType.IncludeDirective) {
        this.handleIncludeDirective(node, parentSelectors, scopeStack, currentProperties);
      } else if (node.type === AstNodeType.PropertyDeclaration) {
        this.handlePropertyDeclaration(node, scopeStack, currentProperties);
      } else if (node.type === AstNodeType.Rule) {
        nestedRules.push(node);
      }
    }

    if (currentProperties.length > 0 && parentSelectors.length > 0) {
      this.flatRules.push({
        selectors: parentSelectors,
        properties: currentProperties
      });
    }

    for (const nestedRule of nestedRules) {
      this.handleRule(nestedRule, parentSelectors, scopeStack);
    }
  }

  private handleVariableDeclaration(
    node: VariableDeclarationNode,
    scopeStack: Array<Map<string, string>>
  ): void {
    const resolvedValue = this.resolveValue(node.value, scopeStack);
    const currentScope = scopeStack[scopeStack.length - 1];
    currentScope.set(node.name, resolvedValue);
    this.variableCount++;
  }

  private handleMixinDefinition(node: MixinDefinitionNode): void {
    this.mixins.set(node.name, node);
    this.mixinCount++;
  }

  private handleIncludeDirective(
    node: IncludeDirectiveNode,
    parentSelectors: string[],
    scopeStack: Array<Map<string, string>>,
    currentProperties: Array<{ property: string; value: string }>
  ): void {
    const mixin = this.mixins.get(node.name);
    if (!mixin) {
      throw new Error(`UndefinedMixinError: Mixin '${node.name}' is not defined.`);
    }

    const mixinScope = new Map<string, string>();
    for (let i = 0; i < mixin.parameters.length; i++) {
      const paramName = mixin.parameters[i];
      const rawArg = node.arguments[i] ?? "";
      const resolvedArg = this.resolveValue(rawArg, scopeStack);
      mixinScope.set(paramName, resolvedArg);
    }

    const nextScopeStack = [...scopeStack, mixinScope];

    for (const child of mixin.children) {
      if (child.type === AstNodeType.PropertyDeclaration) {
        const resolvedVal = this.resolveValue(child.value, nextScopeStack);
        currentProperties.push({
          property: child.property,
          value: resolvedVal
        });
      } else if (child.type === AstNodeType.Rule) {
        this.handleRule(child, parentSelectors, nextScopeStack);
      }
    }
  }

  private handlePropertyDeclaration(
    node: PropertyDeclarationNode,
    scopeStack: Array<Map<string, string>>,
    currentProperties: Array<{ property: string; value: string }>
  ): void {
    const resolvedValue = this.resolveValue(node.value, scopeStack);
    currentProperties.push({
      property: node.property,
      value: resolvedValue
    });
  }

  private handleRule(
    node: RuleNode,
    parentSelectors: string[],
    scopeStack: Array<Map<string, string>>
  ): void {
    const resolvedSelectors = this.combineSelectors(parentSelectors, node.selectors);
    const nestedScope = new Map<string, string>();
    this.processNodes(node.children, resolvedSelectors, [...scopeStack, nestedScope]);
  }

  private combineSelectors(parents: string[], children: string[]): string[] {
    if (parents.length === 0) {
      return children;
    }

    const combined: string[] = [];
    for (const parent of parents) {
      for (const child of children) {
        if (child.includes("&")) {
          combined.push(child.replace(/&/g, parent));
        } else {
          combined.push(`${parent} ${child}`);
        }
      }
    }
    return combined;
  }

  private resolveValue(value: string, scopeStack: Array<Map<string, string>>): string {
    return value.replace(/\$[a-zA-Z0-9_-]+/g, (match) => {
      for (let i = scopeStack.length - 1; i >= 0; i--) {
        if (scopeStack[i].has(match)) {
          return scopeStack[i].get(match)!;
        }
      }
      return match;
    });
  }

  private renderCss(): string {
    if (this.options.outputStyle === "compressed") {
      return this.flatRules
        .map((rule) => {
          const sel = rule.selectors.join(",");
          const props = rule.properties.map((p) => `${p.property}:${p.value}`).join(";");
          return `${sel}{${props}}`;
        })
        .join("");
    }

    const indent = " ".repeat(this.options.indentSize);
    return (
      this.flatRules
        .map((rule) => {
          const sel = rule.selectors.join(", ");
          const props = rule.properties.map((p) => `${indent}${p.property}: ${p.value};`).join("\n");
          return `${sel} {\n${props}\n}`;
        })
        .join("\n\n") + (this.flatRules.length > 0 ? "\n" : "")
    );
  }
}

/**
 * Token types produced by the SCSS lexer.
 */
export enum TokenType {
  Identifier = "Identifier",
  Variable = "Variable",
  AtKeyword = "AtKeyword",
  StringLiteral = "StringLiteral",
  NumberLiteral = "NumberLiteral",
  Colon = "Colon",
  Semicolon = "Semicolon",
  OpenBrace = "OpenBrace",
  CloseBrace = "CloseBrace",
  OpenParen = "OpenParen",
  CloseParen = "CloseParen",
  Comma = "Comma",
  Operator = "Operator",
  Text = "Text",
  EndOfFile = "EndOfFile"
}

/**
 * Representation of a single token with positional information.
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/**
 * Discriminator for SCSS AST nodes.
 */
export enum AstNodeType {
  VariableDeclaration = "VariableDeclaration",
  PropertyDeclaration = "PropertyDeclaration",
  Rule = "Rule",
  MixinDefinition = "MixinDefinition",
  IncludeDirective = "IncludeDirective",
  Comment = "Comment"
}

/**
 * Base interface for all SCSS Abstract Syntax Tree nodes.
 */
export interface BaseAstNode {
  type: AstNodeType;
  line: number;
  column: number;
}

/**
 * SCSS variable declaration node ($name: value).
 */
export interface VariableDeclarationNode extends BaseAstNode {
  type: AstNodeType.VariableDeclaration;
  name: string;
  value: string;
}

/**
 * Standard CSS property declaration node (property: value).
 */
export interface PropertyDeclarationNode extends BaseAstNode {
  type: AstNodeType.PropertyDeclaration;
  property: string;
  value: string;
}

/**
 * SCSS rule node containing selectors and nested child nodes.
 */
export interface RuleNode extends BaseAstNode {
  type: AstNodeType.Rule;
  selectors: string[];
  children: AstNode[];
}

/**
 * SCSS mixin definition node (@mixin name(params) { ... }).
 */
export interface MixinDefinitionNode extends BaseAstNode {
  type: AstNodeType.MixinDefinition;
  name: string;
  parameters: string[];
  children: AstNode[];
}

/**
 * SCSS include directive node (@include name(args)).
 */
export interface IncludeDirectiveNode extends BaseAstNode {
  type: AstNodeType.IncludeDirective;
  name: string;
  arguments: string[];
}

/**
 * Union of all supported AST nodes.
 */
export type AstNode =
  | VariableDeclarationNode
  | PropertyDeclarationNode
  | RuleNode
  | MixinDefinitionNode
  | IncludeDirectiveNode;

/**
 * Formatting and compilation options for the Sass compiler.
 */
export interface CompilerOptions {
  outputStyle?: "expanded" | "compressed";
  indentSize?: number;
}

/**
 * Summary metrics of compilation output.
 */
export interface CompilationStats {
  rulesCount: number;
  variablesCount: number;
  mixinsCount: number;
  outputByteLength: number;
}

/**
 * Output of a Sass/SCSS compilation execution.
 */
export interface CompilationResult {
  css: string;
  stats: CompilationStats;
}

/**
 * OmniBlocks Block Argument specification.
 */
export interface OmniBlocksArgument {
  type: string;
  defaultValue?: string | number | boolean;
}

/**
 * OmniBlocks Block metadata description.
 */
export interface OmniBlocksBlock {
  opcode: string;
  blockType: "reporter" | "command" | "Boolean";
  text: string;
  arguments?: Record<string, OmniBlocksArgument>;
}

/**
 * OmniBlocks Extension manifest description.
 */
export interface OmniBlocksExtensionInfo {
  id: string;
  name: string;
  color1: string;
  color2: string;
  blocks: OmniBlocksBlock[];
}

import { Token, TokenType } from "./types";

/**
 * Tokenizer for SCSS stylesheets that transforms raw text into a sequence of structured tokens.
 */
export class Tokenizer {
  private readonly source: string;
  private index: number = 0;
  private line: number = 1;
  private column: number = 1;

  /**
   * Initializes a new Tokenizer instance.
   * @param source The raw SCSS stylesheet string.
   */
  constructor(source: string) {
    this.source = source;
  }

  /**
   * Executes lexical analysis and returns an array of tokens.
   * @returns An array of Token objects terminating with EndOfFile.
   */
  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.index < this.source.length) {
      this.skipWhitespaceAndComments();

      if (this.index >= this.source.length) {
        break;
      }

      const char = this.source[this.index];
      const startLine = this.line;
      const startColumn = this.column;

      if (char === "{") {
        this.advance();
        tokens.push({ type: TokenType.OpenBrace, value: "{", line: startLine, column: startColumn });
        continue;
      }

      if (char === "}") {
        this.advance();
        tokens.push({ type: TokenType.CloseBrace, value: "}", line: startLine, column: startColumn });
        continue;
      }

      if (char === "(") {
        this.advance();
        tokens.push({ type: TokenType.OpenParen, value: "(", line: startLine, column: startColumn });
        continue;
      }

      if (char === ")") {
        this.advance();
        tokens.push({ type: TokenType.CloseParen, value: ")", line: startLine, column: startColumn });
        continue;
      }

      if (char === ":") {
        this.advance();
        tokens.push({ type: TokenType.Colon, value: ":", line: startLine, column: startColumn });
        continue;
      }

      if (char === ";") {
        this.advance();
        tokens.push({ type: TokenType.Semicolon, value: ";", line: startLine, column: startColumn });
        continue;
      }

      if (char === ",") {
        this.advance();
        tokens.push({ type: TokenType.Comma, value: ",", line: startLine, column: startColumn });
        continue;
      }

      if (char === "$") {
        const varToken = this.readVariable();
        tokens.push(varToken);
        continue;
      }

      if (char === "@") {
        const atToken = this.readAtKeyword();
        tokens.push(atToken);
        continue;
      }

      if (char === "\"" || char === "'") {
        const strToken = this.readString();
        tokens.push(strToken);
        continue;
      }

      const textToken = this.readText();
      if (textToken.value.length > 0) {
        tokens.push(textToken);
      }
    }

    tokens.push({
      type: TokenType.EndOfFile,
      value: "",
      line: this.line,
      column: this.column
    });

    return tokens;
  }

  private advance(): string {
    const char = this.source[this.index];
    this.index++;
    if (char === "\n") {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private peek(offset: number = 0): string {
    const pos = this.index + offset;
    return pos < this.source.length ? this.source[pos] : "";
  }

  private skipWhitespaceAndComments(): void {
    while (this.index < this.source.length) {
      const char = this.source[this.index];

      if (char === " " || char === "\t" || char === "\r" || char === "\n") {
        this.advance();
        continue;
      }

      if (char === "/" && this.peek(1) === "/") {
        this.advance();
        this.advance();
        while (this.index < this.source.length && this.source[this.index] !== "\n") {
          this.advance();
        }
        continue;
      }

      if (char === "/" && this.peek(1) === "*") {
        this.advance();
        this.advance();
        while (this.index < this.source.length) {
          if (this.source[this.index] === "*" && this.peek(1) === "/") {
            this.advance();
            this.advance();
            break;
          }
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  private readVariable(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let value = this.advance();

    while (this.index < this.source.length) {
      const char = this.source[this.index];
      if (/^[a-zA-Z0-9_-]$/.test(char)) {
        value += this.advance();
      } else {
        break;
      }
    }

    return {
      type: TokenType.Variable,
      value,
      line: startLine,
      column: startColumn
    };
  }

  private readAtKeyword(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let value = this.advance();

    while (this.index < this.source.length) {
      const char = this.source[this.index];
      if (/^[a-zA-Z0-9_-]$/.test(char)) {
        value += this.advance();
      } else {
        break;
      }
    }

    return {
      type: TokenType.AtKeyword,
      value,
      line: startLine,
      column: startColumn
    };
  }

  private readString(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    const quote = this.advance();
    let value = quote;

    while (this.index < this.source.length) {
      const char = this.advance();
      value += char;
      if (char === quote && this.source[this.index - 2] !== "\\") {
        break;
      }
    }

    return {
      type: TokenType.StringLiteral,
      value,
      line: startLine,
      column: startColumn
    };
  }

  private readText(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let value = "";

    const stopChars = new Set(["{", "}", "(", ")", ":", ";", ",", "$", "@", "\"", "'"]);

    while (this.index < this.source.length) {
      const char = this.source[this.index];

      if (char === "/" && (this.peek(1) === "/" || this.peek(1) === "*")) {
        break;
      }

      if (stopChars.has(char)) {
        break;
      }

      if (char === " " || char === "\t" || char === "\r" || char === "\n") {
        if (value.length > 0 && !value.endsWith(" ")) {
          value += " ";
        }
        this.advance();
        continue;
      }

      value += this.advance();
    }

    return {
      type: TokenType.Text,
      value: value.trim(),
      line: startLine,
      column: startColumn
    };
  }
}

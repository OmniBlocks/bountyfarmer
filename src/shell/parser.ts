/**
 * Redirection descriptor for shell I/O streams.
 */
export interface Redirection {
  type: ">" | ">>" | "<" | "2>" | "2>>" | "&>";
  target: string;
}

/**
 * Individual executable command containing argument vectors and stream redirections.
 */
export interface CommandNode {
  args: string[];
  redirections: Redirection[];
  background: boolean;
}

/**
 * Pipeline structure linking multiple sequential commands with data pipes.
 */
export interface PipelineNode {
  commands: CommandNode[];
}

/**
 * High-level execution unit joined by control operators.
 */
export interface ChainedCommandNode {
  pipeline: PipelineNode;
  operator?: "&&" | "||" | ";";
}

/**
 * Abstract syntax tree representing a full shell script.
 */
export interface ScriptAST {
  nodes: ChainedCommandNode[];
}

/**
 * Parser converting raw shell command strings into structured execution pipelines.
 */
export class ShellParser {
  /**
   * Tokenizes a command line string into shell words, operators, and control symbols,
   * respecting quotes and selectively expanding variables.
   *
   * @param line - Shell command input line
   * @param env - Environment mapping for variable evaluation
   * @param lastExitCode - Return code from previous command execution
   * @param pid - Shell process ID
   * @returns Array of parsed tokens
   */
  public static tokenize(
    line: string,
    env: Map<string, string>,
    lastExitCode: number = 0,
    pid: number = 1
  ): string[] {
    const tokens: string[] = [];
    let current = "";
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let hasTokenContent = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === "\\" && !inSingleQuote) {
        if (i + 1 < line.length) {
          current += line[++i];
          hasTokenContent = true;
        }
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        hasTokenContent = true;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        hasTokenContent = true;
        continue;
      }

      if (!inSingleQuote && char === "$") {
        const nextChar = line[i + 1];
        if (nextChar === "?") {
          current += lastExitCode.toString();
          hasTokenContent = true;
          i++;
          continue;
        }
        if (nextChar === "$") {
          current += pid.toString();
          hasTokenContent = true;
          i++;
          continue;
        }
        if (nextChar === "{") {
          const closeIdx = line.indexOf("}", i + 2);
          if (closeIdx !== -1) {
            const varName = line.slice(i + 2, closeIdx);
            current += env.get(varName) ?? "";
            hasTokenContent = true;
            i = closeIdx;
            continue;
          }
        }
        if (/[A-Za-z0-9_]/.test(nextChar)) {
          let varName = "";
          let j = i + 1;
          while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) {
            varName += line[j];
            j++;
          }
          current += env.get(varName) ?? "";
          hasTokenContent = true;
          i = j - 1;
          continue;
        }
      }

      if (!inSingleQuote && !inDoubleQuote) {
        if (char === "#" && !hasTokenContent && current.length === 0) {
          break;
        }

        if (char === "&" && line[i + 1] === "&") {
          if (hasTokenContent || current.length > 0) {
            tokens.push(current);
            current = "";
            hasTokenContent = false;
          }
          tokens.push("&&");
          i++;
          continue;
        }

        if (char === "|" && line[i + 1] === "|") {
          if (hasTokenContent || current.length > 0) {
            tokens.push(current);
            current = "";
            hasTokenContent = false;
          }
          tokens.push("||");
          i++;
          continue;
        }

        if (char === ">" && line[i + 1] === ">") {
          if (hasTokenContent || current.length > 0) {
            tokens.push(current);
            current = "";
            hasTokenContent = false;
          }
          tokens.push(">>");
          i++;
          continue;
        }

        if (char === "2" && line[i + 1] === ">" && line[i + 2] === ">") {
          if (hasTokenContent || current.length > 0) {
            tokens.push(current);
            current = "";
            hasTokenContent = false;
          }
          tokens.push("2>>");
          i += 2;
          continue;
        }

        if (char === "2" && line[i + 1] === ">") {
          if (hasTokenContent || current.length > 0) {
            tokens.push(current);
            current = "";
            hasTokenContent = false;
          }
          tokens.push("2>");
          i++;
          continue;
        }

        if (char === "&" && line[i + 1] === ">") {
          if (hasTokenContent || current.length > 0) {
            tokens.push(current);
            current = "";
            hasTokenContent = false;
          }
          tokens.push("&>");
          i++;
          continue;
        }

        if (char === ";" || char === "|" || char === ">" || char === "<") {
          if (hasTokenContent || current.length > 0) {
            tokens.push(current);
            current = "";
            hasTokenContent = false;
          }
          tokens.push(char);
          continue;
        }

        if (/\s/.test(char)) {
          if (hasTokenContent || current.length > 0) {
            tokens.push(current);
            current = "";
            hasTokenContent = false;
          }
          continue;
        }
      }

      current += char;
      hasTokenContent = true;
    }

    if (hasTokenContent || current.length > 0) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Parses a shell command line or multi-line script into an executable AST.
   *
   * @param script - Raw shell script text
   * @param env - Environment variables for evaluation
   * @param lastExitCode - Preceding command status code
   * @param pid - Shell PID
   * @returns Parsed ScriptAST
   */
  public parse(
    script: string,
    env: Map<string, string>,
    lastExitCode: number = 0,
    pid: number = 1
  ): ScriptAST {
    const rawLines = script.split("\n");
    const allTokens: string[] = [];

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const lineTokens = ShellParser.tokenize(trimmed, env, lastExitCode, pid);
      if (lineTokens.length > 0) {
        if (allTokens.length > 0 && allTokens[allTokens.length - 1] !== ";") {
          allTokens.push(";");
        }
        allTokens.push(...lineTokens);
      }
    }

    const chainedNodes: ChainedCommandNode[] = [];
    let currentPipeline: PipelineNode = { commands: [] };
    let currentCommand: CommandNode = { args: [], redirections: [], background: false };

    for (let i = 0; i < allTokens.length; i++) {
      const token = allTokens[i];

      if (token === ";" || token === "&&" || token === "||") {
        if (currentCommand.args.length > 0) {
          currentPipeline.commands.push(currentCommand);
          currentCommand = { args: [], redirections: [], background: false };
        }
        if (currentPipeline.commands.length > 0) {
          chainedNodes.push({
            pipeline: currentPipeline,
            operator: token
          });
          currentPipeline = { commands: [] };
        }
        continue;
      }

      if (token === "|") {
        if (currentCommand.args.length > 0) {
          currentPipeline.commands.push(currentCommand);
          currentCommand = { args: [], redirections: [], background: false };
        }
        continue;
      }

      if (
        token === ">" ||
        token === ">>" ||
        token === "<" ||
        token === "2>" ||
        token === "2>>" ||
        token === "&>"
      ) {
        const target = allTokens[++i] ?? "";
        currentCommand.redirections.push({
          type: token as Redirection["type"],
          target
        });
        continue;
      }

      if (token === "&") {
        currentCommand.background = true;
        continue;
      }

      currentCommand.args.push(token);
    }

    if (currentCommand.args.length > 0) {
      currentPipeline.commands.push(currentCommand);
    }

    if (currentPipeline.commands.length > 0) {
      chainedNodes.push({
        pipeline: currentPipeline
      });
    }

    return { nodes: chainedNodes };
  }
}

import { VirtualFileSystem } from "../fs/vfs";
import { Kernel, Process } from "../kernel/kernel";
import { ExecutionResult } from "../types";
import { BuiltinContext, Builtins } from "./builtins";
import { CommandNode, PipelineNode, ShellParser } from "./parser";

/**
 * Shell runtime executing scripts, coordinating pipelines, resolving redirections,
 * and tracking process state and environment variables.
 */
export class Shell {
  private kernel: Kernel;
  private vfs: VirtualFileSystem;
  private currentProcess: Process;
  private lastExitCode: number;
  private historyList: string[];

  /**
   * Initializes the shell with an attached kernel and initial working environment.
   *
   * @param kernel - System kernel
   * @param cwd - Starting working directory
   */
  constructor(kernel: Kernel, cwd: string = "/home/user") {
    this.kernel = kernel;
    this.vfs = kernel.getVfs();
    this.lastExitCode = 0;
    this.historyList = [];

    this.currentProcess = this.kernel.createProcess("sh", 1, cwd, {
      PATH: "/bin:/usr/bin:/sbin:/usr/local/bin",
      USER: "user",
      HOME: "/home/user",
      SHELL: "/bin/sh",
      TERM: "xterm-256color",
      PWD: cwd
    });
  }

  /**
   * Retrieves the current working directory.
   *
   * @returns Current working directory path
   */
  public getCwd(): string {
    return this.currentProcess.cwd;
  }

  /**
   * Updates the current working directory.
   *
   * @param path - Destination path
   */
  public setCwd(path: string): void {
    const resolved = this.vfs.resolvePath(path, this.currentProcess.cwd);
    this.currentProcess.cwd = resolved;
    this.currentProcess.env.set("PWD", resolved);
  }

  /**
   * Retrieves an environment variable by key.
   *
   * @param name - Variable name
   * @returns String value or undefined
   */
  public getEnv(name: string): string | undefined {
    return this.currentProcess.env.get(name);
  }

  /**
   * Sets or modifies an environment variable.
   *
   * @param name - Variable key
   * @param value - Variable value
   */
  public setEnv(name: string, value: string): void {
    this.currentProcess.env.set(name, value);
  }

  /**
   * Returns the numeric exit code of the most recently executed command.
   *
   * @returns Exit code
   */
  public getLastExitCode(): number {
    return this.lastExitCode;
  }

  /**
   * Returns complete command invocation history.
   *
   * @returns Array of history strings
   */
  public getHistory(): string[] {
    return [...this.historyList];
  }

  /**
   * Executes a single command line string or pipeline synchronously.
   *
   * @param commandLine - Shell command string
   * @returns ExecutionResult containing exitCode, stdout, stderr, and duration
   */
  public executeSync(commandLine: string): ExecutionResult {
    const startTime = Date.now();
    const trimmed = commandLine.trim();
    if (!trimmed) {
      return { exitCode: 0, stdout: "", stderr: "", durationMs: 0 };
    }

    this.historyList.push(trimmed);
    const parser = new ShellParser();
    const ast = parser.parse(trimmed, this.currentProcess.env, this.lastExitCode);

    let globalStdout = "";
    let globalStderr = "";
    let currentCode = 0;

    for (let i = 0; i < ast.nodes.length; i++) {
      const node = ast.nodes[i];
      const prevOperator = i > 0 ? ast.nodes[i - 1].operator : undefined;

      if (prevOperator === "&&" && currentCode !== 0) {
        continue;
      }
      if (prevOperator === "||" && currentCode === 0) {
        continue;
      }

      const res = this.runPipelineSync(node.pipeline);
      currentCode = res.exitCode;
      this.lastExitCode = currentCode;
      globalStdout += res.stdout;
      globalStderr += res.stderr;
    }

    return {
      exitCode: currentCode,
      stdout: globalStdout,
      stderr: globalStderr,
      durationMs: Date.now() - startTime
    };
  }

  /**
   * Executes a command line or pipeline asynchronously.
   *
   * @param commandLine - Shell command string
   * @returns Promise resolving to ExecutionResult
   */
  public async execute(commandLine: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const trimmed = commandLine.trim();
    if (!trimmed) {
      return { exitCode: 0, stdout: "", stderr: "", durationMs: 0 };
    }

    this.historyList.push(trimmed);
    const parser = new ShellParser();
    const ast = parser.parse(trimmed, this.currentProcess.env, this.lastExitCode);

    let globalStdout = "";
    let globalStderr = "";
    let currentCode = 0;

    for (let i = 0; i < ast.nodes.length; i++) {
      const node = ast.nodes[i];
      const prevOperator = i > 0 ? ast.nodes[i - 1].operator : undefined;

      if (prevOperator === "&&" && currentCode !== 0) {
        continue;
      }
      if (prevOperator === "||" && currentCode === 0) {
        continue;
      }

      const res = await this.runPipelineAsync(node.pipeline);
      currentCode = res.exitCode;
      this.lastExitCode = currentCode;
      globalStdout += res.stdout;
      globalStderr += res.stderr;
    }

    return {
      exitCode: currentCode,
      stdout: globalStdout,
      stderr: globalStderr,
      durationMs: Date.now() - startTime
    };
  }

  /**
   * Executes an entire multi-line shell script.
   *
   * @param scriptText - Shell script content
   * @returns Promise resolving to final ExecutionResult
   */
  public async runScript(scriptText: string): Promise<ExecutionResult> {
    return this.execute(scriptText);
  }

  /**
   * Evaluates a synchronous pipeline of chained commands connected via pipes.
   *
   * @param pipeline - Pipeline node
   * @returns Aggregated output and status
   */
  private runPipelineSync(pipeline: PipelineNode): {
    exitCode: number;
    stdout: string;
    stderr: string;
  } {
    let pipeInput = "";
    let finalCode = 0;
    let finalStdout = "";
    let finalStderr = "";

    for (let i = 0; i < pipeline.commands.length; i++) {
      const cmd = pipeline.commands[i];
      const isLast = i === pipeline.commands.length - 1;

      let cmdStdout = "";
      let cmdStderr = "";

      let initialStdin = pipeInput;
      for (const redir of cmd.redirections) {
        if (redir.type === "<") {
          try {
            const resolved = this.vfs.resolvePath(redir.target, this.currentProcess.cwd);
            initialStdin = this.vfs.readTextFile(resolved);
          } catch {
            cmdStderr += `sh: ${redir.target}: No such file or directory\n`;
            finalCode = 1;
          }
        }
      }

      const context: BuiltinContext = {
        stdin: initialStdin,
        stdout: (data: string) => {
          cmdStdout += data;
        },
        stderr: (data: string) => {
          cmdStderr += data;
        },
        vfs: this.vfs,
        kernel: this.kernel,
        process: this.currentProcess,
        cwd: this.currentProcess.cwd,
        setCwd: (newCwd: string) => this.setCwd(newCwd),
        env: this.currentProcess.env
      };

      finalCode = this.dispatchCommandSync(cmd, context);

      for (const redir of cmd.redirections) {
        const resolved = this.vfs.resolvePath(redir.target, this.currentProcess.cwd);
        if (redir.type === ">") {
          this.vfs.writeFile(resolved, cmdStdout);
          cmdStdout = "";
        } else if (redir.type === ">>") {
          this.vfs.writeFile(resolved, cmdStdout, { append: true });
          cmdStdout = "";
        } else if (redir.type === "2>") {
          this.vfs.writeFile(resolved, cmdStderr);
          cmdStderr = "";
        } else if (redir.type === "2>>") {
          this.vfs.writeFile(resolved, cmdStderr, { append: true });
          cmdStderr = "";
        } else if (redir.type === "&>") {
          this.vfs.writeFile(resolved, cmdStdout + cmdStderr);
          cmdStdout = "";
          cmdStderr = "";
        }
      }

      if (isLast) {
        finalStdout += cmdStdout;
      } else {
        pipeInput = cmdStdout;
      }
      finalStderr += cmdStderr;
    }

    return { exitCode: finalCode, stdout: finalStdout, stderr: finalStderr };
  }

  /**
   * Evaluates an asynchronous pipeline of chained commands.
   *
   * @param pipeline - Pipeline node
   * @returns Aggregated output and status
   */
  private async runPipelineAsync(pipeline: PipelineNode): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    let pipeInput = "";
    let finalCode = 0;
    let finalStdout = "";
    let finalStderr = "";

    for (let i = 0; i < pipeline.commands.length; i++) {
      const cmd = pipeline.commands[i];
      const isLast = i === pipeline.commands.length - 1;

      let cmdStdout = "";
      let cmdStderr = "";

      let initialStdin = pipeInput;
      for (const redir of cmd.redirections) {
        if (redir.type === "<") {
          try {
            const resolved = this.vfs.resolvePath(redir.target, this.currentProcess.cwd);
            initialStdin = this.vfs.readTextFile(resolved);
          } catch {
            cmdStderr += `sh: ${redir.target}: No such file or directory\n`;
            finalCode = 1;
          }
        }
      }

      const context: BuiltinContext = {
        stdin: initialStdin,
        stdout: (data: string) => {
          cmdStdout += data;
        },
        stderr: (data: string) => {
          cmdStderr += data;
        },
        vfs: this.vfs,
        kernel: this.kernel,
        process: this.currentProcess,
        cwd: this.currentProcess.cwd,
        setCwd: (newCwd: string) => this.setCwd(newCwd),
        env: this.currentProcess.env
      };

      finalCode = await this.dispatchCommandAsync(cmd, context);

      for (const redir of cmd.redirections) {
        const resolved = this.vfs.resolvePath(redir.target, this.currentProcess.cwd);
        if (redir.type === ">") {
          this.vfs.writeFile(resolved, cmdStdout);
          cmdStdout = "";
        } else if (redir.type === ">>") {
          this.vfs.writeFile(resolved, cmdStdout, { append: true });
          cmdStdout = "";
        } else if (redir.type === "2>") {
          this.vfs.writeFile(resolved, cmdStderr);
          cmdStderr = "";
        } else if (redir.type === "2>>") {
          this.vfs.writeFile(resolved, cmdStderr, { append: true });
          cmdStderr = "";
        } else if (redir.type === "&>") {
          this.vfs.writeFile(resolved, cmdStdout + cmdStderr);
          cmdStdout = "";
          cmdStderr = "";
        }
      }

      if (isLast) {
        finalStdout += cmdStdout;
      } else {
        pipeInput = cmdStdout;
      }
      finalStderr += cmdStderr;
    }

    return { exitCode: finalCode, stdout: finalStdout, stderr: finalStderr };
  }

  /**
   * Dispatches command invocation to matching builtin or executable file synchronously.
   *
   * @param cmd - Command representation
   * @param context - Execution environment
   * @returns Numerical exit code
   */
  private dispatchCommandSync(cmd: CommandNode, context: BuiltinContext): number {
    if (cmd.args.length === 0) {
      return 0;
    }

    const binary = cmd.args[0];
    const args = cmd.args.slice(1);

    if (Builtins.has(binary)) {
      const handler = Builtins.get(binary)!;
      const res = handler(args, context);
      return typeof res === "number" ? res : 0;
    }

    const scriptPath = this.resolveExecutablePath(binary);
    if (scriptPath && this.vfs.exists(scriptPath) && this.vfs.isFile(scriptPath)) {
      const scriptContent = this.vfs.readTextFile(scriptPath);
      const subShell = new Shell(this.kernel, this.currentProcess.cwd);
      const subRes = subShell.executeSync(scriptContent);
      context.stdout(subRes.stdout);
      context.stderr(subRes.stderr);
      return subRes.exitCode;
    }

    context.stderr(`sh: ${binary}: command not found\n`);
    return 127;
  }

  /**
   * Dispatches command invocation to matching builtin or executable file asynchronously.
   *
   * @param cmd - Command representation
   * @param context - Execution environment
   * @returns Promise resolving to numerical exit code
   */
  private async dispatchCommandAsync(cmd: CommandNode, context: BuiltinContext): Promise<number> {
    if (cmd.args.length === 0) {
      return 0;
    }

    const binary = cmd.args[0];
    const args = cmd.args.slice(1);

    if (Builtins.has(binary)) {
      const handler = Builtins.get(binary)!;
      return await handler(args, context);
    }

    const scriptPath = this.resolveExecutablePath(binary);
    if (scriptPath && this.vfs.exists(scriptPath) && this.vfs.isFile(scriptPath)) {
      const scriptContent = this.vfs.readTextFile(scriptPath);
      const subShell = new Shell(this.kernel, this.currentProcess.cwd);
      const subRes = await subShell.execute(scriptContent);
      context.stdout(subRes.stdout);
      context.stderr(subRes.stderr);
      return subRes.exitCode;
    }

    context.stderr(`sh: ${binary}: command not found\n`);
    return 127;
  }

  /**
   * Searches the PATH directories for matching executable scripts.
   *
   * @param binary - Target name or relative path
   * @returns Resolved path or null
   */
  private resolveExecutablePath(binary: string): string | null {
    if (binary.startsWith("/") || binary.startsWith("./") || binary.startsWith("../")) {
      return this.vfs.resolvePath(binary, this.currentProcess.cwd);
    }

    const pathEnv = this.currentProcess.env.get("PATH") || "/bin:/usr/bin";
    const dirs = pathEnv.split(":");

    for (const dir of dirs) {
      const candidate = `${dir}/${binary}`;
      if (this.vfs.exists(candidate) && this.vfs.isFile(candidate)) {
        return candidate;
      }
    }

    return null;
  }
}

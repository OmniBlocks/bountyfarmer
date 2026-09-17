import { VirtualFileSystem } from "./fs/vfs";
import { Kernel } from "./kernel/kernel";
import { Shell } from "./shell/shell";
import { Terminal } from "./terminal/terminal";
import { ExecutionResult } from "./types";

/**
 * Top-level Linux subsystem coordinator integrating the virtual filesystem,
 * kernel process manager, POSIX shell interpreter, and terminal screen buffer.
 */
export class LinuxEmulator {
  private vfs: VirtualFileSystem;
  private kernel: Kernel;
  private shell: Shell;
  private terminal: Terminal;

  /**
   * Initializes a fresh instance of the Linux emulator subsystem.
   */
  constructor() {
    this.vfs = new VirtualFileSystem();
    this.kernel = new Kernel(this.vfs);
    this.shell = new Shell(this.kernel);
    this.terminal = new Terminal();
  }

  /**
   * Executes a shell command string asynchronously and updates the terminal buffer.
   *
   * @param command - Command string or pipeline
   * @returns Promise resolving to ExecutionResult
   */
  public async execute(command: string): Promise<ExecutionResult> {
    const result = await this.shell.execute(command);
    if (result.stdout) {
      this.terminal.write(result.stdout);
    }
    if (result.stderr) {
      this.terminal.write(result.stderr);
    }
    return result;
  }

  /**
   * Executes a shell command synchronously and updates the terminal buffer.
   *
   * @param command - Command string or pipeline
   * @returns ExecutionResult
   */
  public executeSync(command: string): ExecutionResult {
    const result = this.shell.executeSync(command);
    if (result.stdout) {
      this.terminal.write(result.stdout);
    }
    if (result.stderr) {
      this.terminal.write(result.stderr);
    }
    return result;
  }

  /**
   * Executes a multi-line shell script asynchronously.
   *
   * @param script - Script text content
   * @returns Promise resolving to final ExecutionResult
   */
  public async runScript(script: string): Promise<ExecutionResult> {
    const result = await this.shell.runScript(script);
    if (result.stdout) {
      this.terminal.write(result.stdout);
    }
    if (result.stderr) {
      this.terminal.write(result.stderr);
    }
    return result;
  }

  /**
   * Provides direct access to the underlying virtual filesystem.
   *
   * @returns VirtualFileSystem instance
   */
  public getFileSystem(): VirtualFileSystem {
    return this.vfs;
  }

  /**
   * Provides direct access to the kernel process manager.
   *
   * @returns Kernel instance
   */
  public getKernel(): Kernel {
    return this.kernel;
  }

  /**
   * Provides access to the active shell interpreter.
   *
   * @returns Shell instance
   */
  public getShell(): Shell {
    return this.shell;
  }

  /**
   * Provides access to the virtual terminal emulator.
   *
   * @returns Terminal instance
   */
  public getTerminal(): Terminal {
    return this.terminal;
  }

  /**
   * Returns current shell working directory.
   *
   * @returns Absolute path string
   */
  public getCwd(): string {
    return this.shell.getCwd();
  }

  /**
   * Updates current shell working directory.
   *
   * @param path - Target directory
   */
  public setCwd(path: string): void {
    this.shell.setCwd(path);
  }

  /**
   * Looks up an environment variable value.
   *
   * @param name - Variable key
   * @returns Value or undefined
   */
  public getEnv(name: string): string | undefined {
    return this.shell.getEnv(name);
  }

  /**
   * Modifies or defines an environment variable.
   *
   * @param name - Variable key
   * @param value - Variable value
   */
  public setEnv(name: string, value: string): void {
    this.shell.setEnv(name, value);
  }

  /**
   * Retrieves exit code of the last evaluated command.
   *
   * @returns Exit code
   */
  public getLastExitCode(): number {
    return this.shell.getLastExitCode();
  }

  /**
   * Re-initializes all subsystem state, recreating filesystem, kernel, shell, and terminal.
   */
  public reboot(): void {
    this.vfs = new VirtualFileSystem();
    this.kernel = new Kernel(this.vfs);
    this.shell = new Shell(this.kernel);
    this.terminal = new Terminal();
  }
}

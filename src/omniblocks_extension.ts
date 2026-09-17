import { LinuxEmulator } from "./emulator";
import { OmniBlocksExtensionInfo } from "./types";

/**
 * OmniBlocks extension connecting the block programming environment to the Linux subsystem.
 */
export class OmniBlocksLinuxExtension {
  private emulator: LinuxEmulator;

  /**
   * Initializes the OmniBlocks extension and boots the underlying emulator.
   */
  constructor() {
    this.emulator = new LinuxEmulator();
  }

  /**
   * Returns the extension manifest declaring block opcodes, types, labels, and parameters.
   *
   * @returns OmniBlocksExtensionInfo descriptor
   */
  public getInfo(): OmniBlocksExtensionInfo {
    return {
      id: "omniblocksLinux",
      name: "Linux Emulator",
      color1: "#2c3e50",
      color2: "#1a252f",
      blocks: [
        {
          opcode: "runCommand",
          blockType: "reporter",
          text: "run Linux command [COMMAND]",
          arguments: {
            COMMAND: {
              type: "string",
              defaultValue: "uname -a"
            }
          }
        },
        {
          opcode: "getExitCode",
          blockType: "reporter",
          text: "last command exit code"
        },
        {
          opcode: "executeScript",
          blockType: "command",
          text: "execute shell script [SCRIPT]",
          arguments: {
            SCRIPT: {
              type: "string",
              defaultValue: "echo hello world"
            }
          }
        },
        {
          opcode: "readFile",
          blockType: "reporter",
          text: "read file [PATH]",
          arguments: {
            PATH: {
              type: "string",
              defaultValue: "/etc/os-release"
            }
          }
        },
        {
          opcode: "writeFile",
          blockType: "command",
          text: "write [CONTENT] to file [PATH]",
          arguments: {
            CONTENT: {
              type: "string",
              defaultValue: "Hello OmniBlocks!"
            },
            PATH: {
              type: "string",
              defaultValue: "/tmp/hello.txt"
            }
          }
        },
        {
          opcode: "fileExists",
          blockType: "Boolean",
          text: "file exists [PATH]?",
          arguments: {
            PATH: {
              type: "string",
              defaultValue: "/etc/passwd"
            }
          }
        },
        {
          opcode: "isDirectory",
          blockType: "Boolean",
          text: "is directory [PATH]?",
          arguments: {
            PATH: {
              type: "string",
              defaultValue: "/bin"
            }
          }
        },
        {
          opcode: "getWorkingDirectory",
          blockType: "reporter",
          text: "working directory"
        },
        {
          opcode: "changeDirectory",
          blockType: "command",
          text: "cd to [PATH]",
          arguments: {
            PATH: {
              type: "string",
              defaultValue: "/tmp"
            }
          }
        },
        {
          opcode: "getTerminalOutput",
          blockType: "reporter",
          text: "terminal output"
        },
        {
          opcode: "clearTerminal",
          blockType: "command",
          text: "clear terminal"
        },
        {
          opcode: "getProcessList",
          blockType: "reporter",
          text: "running processes"
        },
        {
          opcode: "getSystemInfo",
          blockType: "reporter",
          text: "system info [FIELD]",
          arguments: {
            FIELD: {
              type: "string",
              defaultValue: "release"
            }
          }
        },
        {
          opcode: "reboot",
          blockType: "command",
          text: "reboot Linux system"
        }
      ]
    };
  }

  /**
   * Executes a shell command line and returns the resulting standard output.
   *
   * @param args - Parameter container with COMMAND string
   * @returns Promise resolving to stdout string
   */
  public async runCommand(args: { COMMAND: string }): Promise<string> {
    const res = await this.emulator.execute(args.COMMAND);
    return res.stdout || res.stderr;
  }

  /**
   * Returns the status return code of the last evaluated shell command.
   *
   * @returns Exit code
   */
  public getExitCode(): number {
    return this.emulator.getLastExitCode();
  }

  /**
   * Runs a multi-line shell script and returns standard output.
   *
   * @param args - Parameter container with SCRIPT string
   * @returns Promise resolving to script stdout
   */
  public async executeScript(args: { SCRIPT: string }): Promise<string> {
    const res = await this.emulator.runScript(args.SCRIPT);
    return res.stdout || res.stderr;
  }

  /**
   * Reads UTF-8 file content at a specified path.
   *
   * @param args - Parameter container with PATH string
   * @returns Text contents or empty string on error
   */
  public readFile(args: { PATH: string }): string {
    try {
      const resolved = this.emulator.getFileSystem().resolvePath(args.PATH, this.emulator.getCwd());
      return this.emulator.getFileSystem().readTextFile(resolved);
    } catch {
      return "";
    }
  }

  /**
   * Writes UTF-8 text content into a file at a specified path.
   *
   * @param args - Parameter container with PATH and CONTENT strings
   */
  public writeFile(args: { PATH: string; CONTENT: string }): void {
    const resolved = this.emulator.getFileSystem().resolvePath(args.PATH, this.emulator.getCwd());
    this.emulator.getFileSystem().writeFile(resolved, args.CONTENT);
  }

  /**
   * Checks if an inode exists at the designated path.
   *
   * @param args - Parameter container with PATH string
   * @returns True if path exists
   */
  public fileExists(args: { PATH: string }): boolean {
    const resolved = this.emulator.getFileSystem().resolvePath(args.PATH, this.emulator.getCwd());
    return this.emulator.getFileSystem().exists(resolved);
  }

  /**
   * Checks if a target path exists and is a directory.
   *
   * @param args - Parameter container with PATH string
   * @returns True if directory
   */
  public isDirectory(args: { PATH: string }): boolean {
    const resolved = this.emulator.getFileSystem().resolvePath(args.PATH, this.emulator.getCwd());
    return this.emulator.getFileSystem().isDirectory(resolved);
  }

  /**
   * Retrieves the current shell working directory path.
   *
   * @returns Absolute path string
   */
  public getWorkingDirectory(): string {
    return this.emulator.getCwd();
  }

  /**
   * Updates the shell working directory.
   *
   * @param args - Parameter container with PATH string
   */
  public changeDirectory(args: { PATH: string }): void {
    this.emulator.setCwd(args.PATH);
  }

  /**
   * Retrieves the complete aggregated terminal output.
   *
   * @returns Screen buffer output string
   */
  public getTerminalOutput(): string {
    return this.emulator.getTerminal().getOutput();
  }

  /**
   * Clears the terminal screen buffer.
   */
  public clearTerminal(): void {
    this.emulator.getTerminal().clear();
  }

  /**
   * Returns a formatted snapshot table of currently active processes.
   *
   * @returns Process listing string
   */
  public getProcessList(): string {
    const procs = this.emulator.getKernel().listProcesses();
    let out = "PID\tPPID\tUSER\tCOMMAND\n";
    for (const p of procs) {
      out += `${p.pid}\t${p.ppid}\t${p.uid}\t${p.name}\n`;
    }
    return out;
  }

  /**
   * Queries system properties such as sysname, release, machine, or uptime.
   *
   * @param args - Parameter container with FIELD identifier
   * @returns Property string value
   */
  public getSystemInfo(args: { FIELD: string }): string {
    const info = this.emulator.getKernel().uname();
    const field = args.FIELD.toLowerCase();
    switch (field) {
      case "sysname":
        return info.sysname;
      case "nodename":
        return info.nodename;
      case "release":
        return info.release;
      case "version":
        return info.version;
      case "machine":
        return info.machine;
      case "uptime":
        return info.uptimeSeconds.toFixed(1);
      default:
        return `${info.sysname} ${info.release} ${info.machine}`;
    }
  }

  /**
   * Reboots the Linux subsystem, restoring initial state.
   */
  public reboot(): void {
    this.emulator.reboot();
  }

  /**
   * Returns the underlying LinuxEmulator subsystem reference.
   *
   * @returns LinuxEmulator instance
   */
  public getEmulator(): LinuxEmulator {
    return this.emulator;
  }
}

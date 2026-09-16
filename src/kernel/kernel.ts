import { VirtualFileSystem } from "../fs/vfs";
import { FileDescriptor, ProcessInfo, ProcessStatus, SystemInfo } from "../types";

/**
 * Process descriptor maintaining memory, execution context, environment, and open descriptors.
 */
export class Process {
  public pid: number;
  public ppid: number;
  public name: string;
  public status: ProcessStatus;
  public cwd: string;
  public env: Map<string, string>;
  public fds: Map<number, FileDescriptor>;
  public uid: number;
  public gid: number;
  public exitCode: number | null;
  public startTime: number;
  public command: string;

  /**
   * Initializes a process execution context.
   *
   * @param pid - Numerical process identifier
   * @param ppid - Parent process identifier
   * @param name - Executable process binary name
   * @param cwd - Working directory for path resolution
   * @param uid - User identifier
   * @param gid - Group identifier
   * @param initialEnv - Optional dictionary of environment variables
   */
  constructor(
    pid: number,
    ppid: number,
    name: string,
    cwd: string = "/home/user",
    uid: number = 1000,
    gid: number = 1000,
    initialEnv: Record<string, string> = {}
  ) {
    this.pid = pid;
    this.ppid = ppid;
    this.name = name;
    this.command = name;
    this.status = ProcessStatus.RUNNING;
    this.cwd = cwd;
    this.uid = uid;
    this.gid = gid;
    this.exitCode = null;
    this.startTime = Date.now();
    this.fds = new Map<number, FileDescriptor>();
    this.env = new Map<string, string>(Object.entries(initialEnv));

    if (!this.env.has("PATH")) {
      this.env.set("PATH", "/bin:/usr/bin:/sbin:/usr/local/bin");
    }
    if (!this.env.has("USER")) {
      this.env.set("USER", uid === 0 ? "root" : "user");
    }
    if (!this.env.has("HOME")) {
      this.env.set("HOME", uid === 0 ? "/root" : "/home/user");
    }
    if (!this.env.has("SHELL")) {
      this.env.set("SHELL", "/bin/sh");
    }
    if (!this.env.has("TERM")) {
      this.env.set("TERM", "xterm-256color");
    }
    if (!this.env.has("PWD")) {
      this.env.set("PWD", cwd);
    }
  }

  /**
   * Converts internal process representation into public serializable ProcessInfo.
   *
   * @returns ProcessInfo structure
   */
  public toInfo(): ProcessInfo {
    return {
      pid: this.pid,
      ppid: this.ppid,
      name: this.name,
      status: this.status,
      cwd: this.cwd,
      uid: this.uid,
      gid: this.gid,
      startTime: this.startTime,
      command: this.command
    };
  }
}

/**
 * Kernel coordinator managing process scheduling, system calls, timekeeping, and system properties.
 */
export class Kernel {
  private processes: Map<number, Process>;
  private nextPid: number;
  private bootTime: number;
  private vfs: VirtualFileSystem;

  /**
   * Boots the virtual kernel and spawns PID 1 and core daemons.
   *
   * @param vfs - Bound virtual filesystem instance
   */
  constructor(vfs: VirtualFileSystem) {
    this.vfs = vfs;
    this.processes = new Map<number, Process>();
    this.nextPid = 1;
    this.bootTime = Date.now();

    this.bootstrapInitProcess();
  }

  /**
   * Initializes PID 1 (systemd) and kernel worker threads.
   */
  private bootstrapInitProcess(): void {
    const init = new Process(1, 0, "systemd", "/", 0, 0, {
      PATH: "/bin:/usr/bin:/sbin",
      USER: "root",
      HOME: "/root"
    });
    this.processes.set(1, init);

    const kthreadd = new Process(2, 0, "kthreadd", "/", 0, 0, {});
    kthreadd.status = ProcessStatus.SLEEPING;
    this.processes.set(2, kthreadd);

    this.nextPid = 3;
  }

  /**
   * Spawns a child process and registers it in the process table.
   *
   * @param name - Executable process name
   * @param ppid - Parent PID
   * @param cwd - Working directory
   * @param env - Environment variables
   * @param uid - User ID
   * @param gid - Group ID
   * @returns Newly allocated Process
   */
  public createProcess(
    name: string,
    ppid: number,
    cwd: string = "/home/user",
    env: Record<string, string> = {},
    uid: number = 1000,
    gid: number = 1000
  ): Process {
    const pid = this.nextPid++;
    const process = new Process(pid, ppid, name, cwd, uid, gid, env);
    this.processes.set(pid, process);
    return process;
  }

  /**
   * Terminates a process, recording its exit code and changing state to ZOMBIE or removing it.
   *
   * @param pid - Process identifier
   * @param exitCode - Numerical return code
   */
  public terminateProcess(pid: number, exitCode: number = 0): void {
    const process = this.processes.get(pid);
    if (!process) {
      return;
    }
    process.status = ProcessStatus.ZOMBIE;
    process.exitCode = exitCode;
    if (pid > 2) {
      this.processes.delete(pid);
    }
  }

  /**
   * Dispatches a signal to a process by PID.
   *
   * @param pid - Target process PID
   * @param signal - Signal number
   * @returns True if target was found and signaled
   */
  public kill(pid: number, signal: number = 15): boolean {
    const process = this.processes.get(pid);
    if (!process) {
      return false;
    }
    if (pid <= 2) {
      return false;
    }
    if (signal === 9 || signal === 15) {
      this.terminateProcess(pid, 128 + signal);
    }
    return true;
  }

  /**
   * Looks up an active process by its identifier.
   *
   * @param pid - Process identifier
   * @returns Process reference or undefined
   */
  public getProcess(pid: number): Process | undefined {
    return this.processes.get(pid);
  }

  /**
   * Returns a snapshot list of all active processes.
   *
   * @returns Array of ProcessInfo
   */
  public listProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values()).map((p) => p.toInfo());
  }

  /**
   * Computes elapsed seconds since kernel boot.
   *
   * @returns Elapsed time in seconds
   */
  public getUptimeSeconds(): number {
    return (Date.now() - this.bootTime) / 1000;
  }

  /**
   * Returns system and architecture specifications.
   *
   * @returns SystemInfo structure
   */
  public uname(): SystemInfo {
    return {
      sysname: "Linux",
      nodename: "omniblocks",
      release: "6.8.0-omniblocks",
      version: "#1 SMP PREEMPT_DYNAMIC OmniBlocks 2026",
      machine: "x86_64",
      uptimeSeconds: this.getUptimeSeconds(),
      totalMemoryBytes: 16 * 1024 * 1024 * 1024,
      freeMemoryBytes: 8 * 1024 * 1024 * 1024
    };
  }

  /**
   * Returns reference to the active virtual filesystem.
   *
   * @returns VirtualFileSystem
   */
  public getVfs(): VirtualFileSystem {
    return this.vfs;
  }
}

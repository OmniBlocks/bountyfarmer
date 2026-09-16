/**
 * Filesystem node classifications supported by the virtual filesystem.
 */
export enum INodeType {
  FILE = "file",
  DIRECTORY = "directory",
  SYMLINK = "symlink",
  DEVICE = "device"
}

/**
 * Character and pseudo device classifications available in /dev.
 */
export enum DeviceType {
  NULL = "null",
  ZERO = "zero",
  RANDOM = "random",
  URANDOM = "urandom",
  TTY = "tty",
  STDIN = "stdin",
  STDOUT = "stdout",
  STDERR = "stderr"
}

/**
 * Metadata attributes corresponding to POSIX file stat structures.
 */
export interface FileStat {
  inode: number;
  type: INodeType;
  mode: number;
  size: number;
  uid: number;
  gid: number;
  atime: Date;
  mtime: Date;
  ctime: Date;
  nlink: number;
}

/**
 * Open file handle tracking an active file descriptor.
 */
export interface FileDescriptor {
  fd: number;
  path: string;
  offset: number;
  flags: number;
  inode: number;
}

/**
 * Lifecycle execution states for kernel processes.
 */
export enum ProcessStatus {
  RUNNING = "running",
  SLEEPING = "sleeping",
  STOPPED = "stopped",
  ZOMBIE = "zombie"
}

/**
 * Public observable metadata for a running or terminated process.
 */
export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  status: ProcessStatus;
  cwd: string;
  uid: number;
  gid: number;
  startTime: number;
  command: string;
}

/**
 * Output payload returned from shell command or script evaluation.
 */
export interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

/**
 * Operating system metrics and machine identification.
 */
export interface SystemInfo {
  sysname: string;
  nodename: string;
  release: string;
  version: string;
  machine: string;
  uptimeSeconds: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
}

/**
 * Parameter definition for an OmniBlocks block signature.
 */
export interface OmniBlocksArgument {
  type: "string" | "number" | "boolean";
  defaultValue: string | number | boolean;
}

/**
 * Block specification for OmniBlocks visual programming extensions.
 */
export interface OmniBlocksBlock {
  opcode: string;
  blockType: "reporter" | "command" | "Boolean";
  text: string;
  arguments?: Record<string, OmniBlocksArgument>;
}

/**
 * Extension manifest metadata consumed by the OmniBlocks engine.
 */
export interface OmniBlocksExtensionInfo {
  id: string;
  name: string;
  color1: string;
  color2: string;
  blocks: OmniBlocksBlock[];
}

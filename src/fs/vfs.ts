import { DeviceType, FileStat, INodeType } from "../types";
import { INode } from "./inode";

/**
 * In-memory POSIX-compliant virtual filesystem supporting hierarchical directories,
 * regular files, device abstractions, symbolic links, and dynamic proc entries.
 */
export class VirtualFileSystem {
  private inodes: Map<number, INode>;
  private nextInodeId: number;
  private rootInodeId: number;
  private bootTimestamp: number;

  /**
   * Initializes the filesystem layout and registers default system directories.
   */
  constructor() {
    this.inodes = new Map<number, INode>();
    this.nextInodeId = 1;
    this.bootTimestamp = Date.now();

    const rootInode = this.allocateInode(INodeType.DIRECTORY, 0o755, 0, 0);
    this.rootInodeId = rootInode.id;

    this.initializeStandardHierarchy();
    this.initializeDeviceNodes();
    this.initializeConfigurationFiles();
    this.initializeProcFilesystem();
  }

  /**
   * Allocates a new inode with an incremented unique numerical identifier.
   *
   * @param type - Inode file classification
   * @param mode - POSIX permission bitmask
   * @param uid - Owner user identifier
   * @param gid - Owner group identifier
   * @returns Newly instantiated INode
   */
  private allocateInode(
    type: INodeType,
    mode: number,
    uid: number,
    gid: number
  ): INode {
    const inode = new INode(this.nextInodeId++, type, mode, uid, gid);
    this.inodes.set(inode.id, inode);
    return inode;
  }

  /**
   * Constructs the base directory structure expected in POSIX systems.
   */
  private initializeStandardHierarchy(): void {
    const directories = [
      "/bin",
      "/sbin",
      "/usr",
      "/usr/bin",
      "/usr/sbin",
      "/usr/lib",
      "/usr/local",
      "/usr/local/bin",
      "/etc",
      "/home",
      "/home/user",
      "/root",
      "/tmp",
      "/var",
      "/var/log",
      "/var/tmp",
      "/proc",
      "/dev"
    ];

    for (const dir of directories) {
      this.mkdir(dir, 0o755, true);
    }

    this.chmod("/tmp", 0o1777);
  }

  /**
   * Registers character devices and standard file descriptor targets in /dev.
   */
  private initializeDeviceNodes(): void {
    this.createDeviceNode("/dev/null", DeviceType.NULL, () => new Uint8Array(0), (data) => data.length);
    this.createDeviceNode(
      "/dev/zero",
      DeviceType.ZERO,
      (length) => new Uint8Array(length),
      (data) => data.length
    );
    this.createDeviceNode(
      "/dev/random",
      DeviceType.RANDOM,
      (length) => {
        const buffer = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          buffer[i] = Math.floor(Math.random() * 256);
        }
        return buffer;
      },
      (data) => data.length
    );
    this.createDeviceNode(
      "/dev/urandom",
      DeviceType.URANDOM,
      (length) => {
        const buffer = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          buffer[i] = Math.floor(Math.random() * 256);
        }
        return buffer;
      },
      (data) => data.length
    );
    this.createDeviceNode("/dev/tty", DeviceType.TTY, () => new Uint8Array(0), (data) => data.length);
  }

  /**
   * Writes standard system configuration and password files into /etc.
   */
  private initializeConfigurationFiles(): void {
    this.createFile(
      "/etc/passwd",
      "root:x:0:0:root:/root:/bin/sh\nuser:x:1000:1000:user:/home/user:/bin/sh\n",
      0o644
    );
    this.createFile("/etc/group", "root:x:0:\nuser:x:1000:\nwheel:x:10:\n", 0o644);
    this.createFile("/etc/hostname", "omniblocks\n", 0o644);
    this.createFile(
      "/etc/os-release",
      'NAME="OmniBlocks Linux"\nVERSION="1.0"\nID=omniblocks\nID_LIKE=debian\nPRETTY_NAME="OmniBlocks Linux 1.0 (GNU/Linux)"\n',
      0o644
    );
    this.createFile("/etc/resolv.conf", "nameserver 1.1.1.1\nnameserver 8.8.8.8\n", 0o644);
    this.createFile(
      "/etc/motd",
      "Welcome to OmniBlocks Linux\nType 'help' to see available commands.\n",
      0o644
    );
    this.createFile(
      "/etc/profile",
      "export PATH=/bin:/usr/bin:/sbin\nexport USER=user\nexport HOME=/home/user\nexport TERM=xterm-256color\n",
      0o644
    );
  }

  /**
   * Registers dynamic pseudo-files in /proc for hardware, kernel, and process reporting.
   */
  private initializeProcFilesystem(): void {
    this.createDeviceNode(
      "/proc/version",
      DeviceType.NULL,
      () => new TextEncoder().encode("Linux version 6.8.0-omniblocks (gcc 13.2.0) #1 SMP PREEMPT_DYNAMIC OmniBlocks 2026\n"),
      () => 0
    );
    this.createDeviceNode(
      "/proc/uptime",
      DeviceType.NULL,
      () => {
        const uptimeSeconds = (Date.now() - this.bootTimestamp) / 1000;
        return new TextEncoder().encode(`${uptimeSeconds.toFixed(2)} ${(uptimeSeconds * 0.95).toFixed(2)}\n`);
      },
      () => 0
    );
    this.createDeviceNode(
      "/proc/meminfo",
      DeviceType.NULL,
      () => {
        const content =
          "MemTotal:        16384000 kB\n" +
          "MemFree:          8192000 kB\n" +
          "MemAvailable:    12288000 kB\n" +
          "Buffers:           256000 kB\n" +
          "Cached:           4096000 kB\n" +
          "SwapTotal:        4194304 kB\n" +
          "SwapFree:         4194304 kB\n";
        return new TextEncoder().encode(content);
      },
      () => 0
    );
    this.createDeviceNode(
      "/proc/cpuinfo",
      DeviceType.NULL,
      () => {
        const content =
          "processor\t: 0\n" +
          "vendor_id\t: GenuineIntel\n" +
          "cpu family\t: 6\n" +
          "model name\t: Virtual CPU @ 3.00GHz\n" +
          "cpu MHz\t\t: 3000.000\n" +
          "cache size\t: 16384 KB\n";
        return new TextEncoder().encode(content);
      },
      () => 0
    );
    this.createDeviceNode(
      "/proc/mounts",
      DeviceType.NULL,
      () => {
        const content =
          "rootfs / rootfs rw 0 0\n" +
          "/dev/root / ext4 rw,relatime 0 0\n" +
          "proc /proc proc rw,relatime 0 0\n" +
          "devtmpfs /dev devtmpfs rw,relatime 0 0\n" +
          "tmpfs /tmp tmpfs rw,relatime 0 0\n";
        return new TextEncoder().encode(content);
      },
      () => 0
    );
    this.createDeviceNode(
      "/proc/loadavg",
      DeviceType.NULL,
      () => new TextEncoder().encode("0.08 0.05 0.01 1/64 1234\n"),
      () => 0
    );
  }

  /**
   * Creates a special character device node bound to read and write callbacks.
   *
   * @param path - Filesystem destination path
   * @param deviceType - Classification of the virtual device
   * @param readHandler - Generator function returning byte content on read
   * @param writeHandler - Sink function accepting bytes on write
   */
  public createDeviceNode(
    path: string,
    deviceType: DeviceType,
    readHandler: (length: number) => Uint8Array,
    writeHandler: (data: Uint8Array) => number
  ): void {
    const parentPath = this.dirname(path);
    const fileName = this.basename(path);
    const parentInode = this.getInodeByPath(parentPath);

    if (!parentInode || parentInode.type !== INodeType.DIRECTORY) {
      throw new Error(`ENOTDIR: Parent directory does not exist for device ${path}`);
    }

    const inode = this.allocateInode(INodeType.DEVICE, 0o666, 0, 0);
    inode.deviceType = deviceType;
    inode.readHandler = readHandler;
    inode.writeHandler = writeHandler;
    parentInode.entries.set(fileName, inode.id);
  }

  /**
   * Resolves relative path segments and canonicalizes a path string against a working directory.
   *
   * @param targetPath - Absolute or relative path string
   * @param cwd - Current working directory context
   * @param followSymlinks - Whether trailing symbolic links should be resolved
   * @returns Fully normalized absolute canonical path
   */
  public resolvePath(targetPath: string, cwd: string = "/", followSymlinks: boolean = true): string {
    let combined = targetPath.startsWith("/") ? targetPath : `${cwd}/${targetPath}`;
    const rawSegments = combined.split("/");
    const normalizedSegments: string[] = [];

    for (const segment of rawSegments) {
      if (!segment || segment === ".") {
        continue;
      }
      if (segment === "..") {
        if (normalizedSegments.length > 0) {
          normalizedSegments.pop();
        }
      } else {
        normalizedSegments.push(segment);
      }
    }

    let canonical = `/${normalizedSegments.join("/")}`;

    if (!followSymlinks) {
      return canonical;
    }

    let hops = 0;
    while (hops < 40) {
      const inode = this.getInodeByPath(canonical, false);
      if (!inode || inode.type !== INodeType.SYMLINK) {
        break;
      }
      hops++;
      const target = inode.target;
      if (target.startsWith("/")) {
        canonical = this.resolvePath(target, "/", false);
      } else {
        const parent = this.dirname(canonical);
        canonical = this.resolvePath(`${parent}/${target}`, "/", false);
      }
    }

    if (hops >= 40) {
      throw new Error(`ELOOP: Too many levels of symbolic links: ${targetPath}`);
    }

    return canonical;
  }

  /**
   * Extracts the directory portion of a canonical path.
   *
   * @param path - Filesystem path
   * @returns Directory prefix
   */
  public dirname(path: string): string {
    const normalized = path.replace(/\/+$/, "");
    const lastSlash = normalized.lastIndexOf("/");
    if (lastSlash === -1) {
      return ".";
    }
    if (lastSlash === 0) {
      return "/";
    }
    return normalized.substring(0, lastSlash);
  }

  /**
   * Extracts the file or directory base name from a path.
   *
   * @param path - Filesystem path
   * @returns Terminal segment of path
   */
  public basename(path: string): string {
    const normalized = path.replace(/\/+$/, "");
    const lastSlash = normalized.lastIndexOf("/");
    if (lastSlash === -1) {
      return normalized;
    }
    return normalized.substring(lastSlash + 1);
  }

  /**
   * Retrieves an inode reference by traversing the directory hierarchy.
   *
   * @param path - Absolute target path
   * @param followSymlinks - Whether symbolic link pointers should be traversed
   * @returns Matching INode instance or undefined if not found
   */
  public getInodeByPath(path: string, followSymlinks: boolean = true): INode | undefined {
    const canonical = this.resolvePath(path, "/", followSymlinks);
    if (canonical === "/") {
      return this.inodes.get(this.rootInodeId);
    }

    const segments = canonical.split("/").filter(Boolean);
    let currentInode = this.inodes.get(this.rootInodeId);

    for (let i = 0; i < segments.length; i++) {
      if (!currentInode || currentInode.type !== INodeType.DIRECTORY) {
        return undefined;
      }

      const segment = segments[i];
      const nextInodeId = currentInode.entries.get(segment);
      if (nextInodeId === undefined) {
        return undefined;
      }

      const nextInode = this.inodes.get(nextInodeId);
      if (!nextInode) {
        return undefined;
      }

      const isLastSegment = i === segments.length - 1;
      if (nextInode.type === INodeType.SYMLINK && (followSymlinks || !isLastSegment)) {
        const resolvedLinkPath = this.resolvePath(nextInode.target, this.dirname(canonical), true);
        currentInode = this.getInodeByPath(resolvedLinkPath, true);
      } else {
        currentInode = nextInode;
      }
    }

    return currentInode;
  }

  /**
   * Creates a directory node at the designated path.
   *
   * @param path - Filesystem path
   * @param mode - Directory permissions
   * @param recursive - Whether to create non-existent parent directories
   */
  public mkdir(path: string, mode: number = 0o755, recursive: boolean = false): void {
    const canonical = this.resolvePath(path, "/", false);
    if (canonical === "/") {
      return;
    }

    const segments = canonical.split("/").filter(Boolean);
    let current = this.inodes.get(this.rootInodeId)!;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const childId = current.entries.get(segment);

      if (childId !== undefined) {
        const childInode = this.inodes.get(childId);
        if (!childInode || childInode.type !== INodeType.DIRECTORY) {
          throw new Error(`ENOTDIR: Not a directory: ${segment}`);
        }
        current = childInode;
      } else {
        if (!recursive && i < segments.length - 1) {
          throw new Error(`ENOENT: No such file or directory: ${path}`);
        }
        const newDir = this.allocateInode(INodeType.DIRECTORY, mode, 0, 0);
        current.entries.set(segment, newDir.id);
        current.touch();
        current = newDir;
      }
    }
  }

  /**
   * Creates a regular file with initial content and metadata.
   *
   * @param path - Destination file path
   * @param content - Initial data payload
   * @param mode - POSIX permission bitmask
   * @param uid - Owner user ID
   * @param gid - Owner group ID
   * @returns Assigned inode identifier
   */
  public createFile(
    path: string,
    content: string | Uint8Array = "",
    mode: number = 0o644,
    uid: number = 0,
    gid: number = 0
  ): number {
    const canonical = this.resolvePath(path, "/", false);
    const parentPath = this.dirname(canonical);
    const fileName = this.basename(canonical);
    const parentInode = this.getInodeByPath(parentPath);

    if (!parentInode || parentInode.type !== INodeType.DIRECTORY) {
      throw new Error(`ENOENT: No such directory: ${parentPath}`);
    }

    if (parentInode.entries.has(fileName)) {
      throw new Error(`EEXIST: File already exists: ${path}`);
    }

    const inode = this.allocateInode(INodeType.FILE, mode, uid, gid);
    const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
    inode.content = bytes;
    inode.size = bytes.length;
    inode.touch();

    parentInode.entries.set(fileName, inode.id);
    parentInode.touch();
    return inode.id;
  }

  /**
   * Reads raw bytes from a regular file or character device.
   *
   * @param path - Filesystem path
   * @returns File content as Uint8Array
   */
  public readFile(path: string): Uint8Array {
    const inode = this.getInodeByPath(path);
    if (!inode) {
      throw new Error(`ENOENT: No such file: ${path}`);
    }

    if (inode.type === INodeType.DIRECTORY) {
      throw new Error(`EISDIR: Illegal operation on directory: ${path}`);
    }

    if (inode.type === INodeType.DEVICE && inode.readHandler) {
      return inode.readHandler(4096);
    }

    inode.atime = new Date();
    return inode.content;
  }

  /**
   * Reads UTF-8 text contents from a file or device.
   *
   * @param path - Filesystem path
   * @returns Decoded text string
   */
  public readTextFile(path: string): string {
    const bytes = this.readFile(path);
    return new TextDecoder().decode(bytes);
  }

  /**
   * Writes raw bytes or string content to a file, creating it if absent.
   *
   * @param path - Target path
   * @param content - Data to write
   * @param options - Append or truncate write options
   */
  public writeFile(
    path: string,
    content: string | Uint8Array,
    options: { append?: boolean } = {}
  ): void {
    const canonical = this.resolvePath(path, "/", true);
    const existing = this.getInodeByPath(canonical);
    const data = typeof content === "string" ? new TextEncoder().encode(content) : content;

    if (existing) {
      if (existing.type === INodeType.DIRECTORY) {
        throw new Error(`EISDIR: Is a directory: ${path}`);
      }

      if (existing.type === INodeType.DEVICE && existing.writeHandler) {
        existing.writeHandler(data);
        return;
      }

      if (options.append) {
        const combined = new Uint8Array(existing.content.length + data.length);
        combined.set(existing.content, 0);
        combined.set(data, existing.content.length);
        existing.content = combined;
      } else {
        existing.content = new Uint8Array(data);
      }
      existing.size = existing.content.length;
      existing.touch();
      return;
    }

    this.createFile(canonical, data);
  }

  /**
   * Queries metadata attributes for an inode, following symbolic links.
   *
   * @param path - Filesystem path
   * @returns FileStat structure
   */
  public stat(path: string): FileStat {
    const inode = this.getInodeByPath(path, true);
    if (!inode) {
      throw new Error(`ENOENT: No such file or directory: ${path}`);
    }
    return {
      inode: inode.id,
      type: inode.type,
      mode: inode.mode,
      size: inode.size,
      uid: inode.uid,
      gid: inode.gid,
      atime: inode.atime,
      mtime: inode.mtime,
      ctime: inode.ctime,
      nlink: inode.nlink
    };
  }

  /**
   * Queries metadata attributes for an inode without resolving trailing symbolic links.
   *
   * @param path - Filesystem path
   * @returns FileStat structure
   */
  public lstat(path: string): FileStat {
    const inode = this.getInodeByPath(path, false);
    if (!inode) {
      throw new Error(`ENOENT: No such file or directory: ${path}`);
    }
    return {
      inode: inode.id,
      type: inode.type,
      mode: inode.mode,
      size: inode.size,
      uid: inode.uid,
      gid: inode.gid,
      atime: inode.atime,
      mtime: inode.mtime,
      ctime: inode.ctime,
      nlink: inode.nlink
    };
  }

  /**
   * Removes a directory entry referencing a file, device, or symbolic link.
   *
   * @param path - Target path to remove
   */
  public unlink(path: string): void {
    const canonical = this.resolvePath(path, "/", false);
    const parentPath = this.dirname(canonical);
    const name = this.basename(canonical);
    const parent = this.getInodeByPath(parentPath);

    if (!parent || parent.type !== INodeType.DIRECTORY) {
      throw new Error(`ENOENT: No such directory: ${parentPath}`);
    }

    const childId = parent.entries.get(name);
    if (childId === undefined) {
      throw new Error(`ENOENT: No such file: ${name}`);
    }

    const childInode = this.inodes.get(childId);
    if (childInode && childInode.type === INodeType.DIRECTORY) {
      throw new Error(`EPERM: Operation not permitted on directory: ${path}`);
    }

    parent.entries.delete(name);
    parent.touch();
    if (childInode) {
      childInode.nlink--;
      if (childInode.nlink <= 0) {
        this.inodes.delete(childId);
      }
    }
  }

  /**
   * Removes an empty directory node.
   *
   * @param path - Directory path
   * @param recursive - Whether to remove nested children recursively
   */
  public rmdir(path: string, recursive: boolean = false): void {
    const canonical = this.resolvePath(path, "/", false);
    if (canonical === "/") {
      throw new Error("EBUSY: Cannot remove root filesystem");
    }

    const inode = this.getInodeByPath(canonical, false);
    if (!inode || inode.type !== INodeType.DIRECTORY) {
      throw new Error(`ENOTDIR: Not a directory: ${path}`);
    }

    if (inode.entries.size > 0) {
      if (!recursive) {
        throw new Error(`ENOTEMPTY: Directory not empty: ${path}`);
      }
      for (const [childName, childId] of inode.entries) {
        const childInode = this.inodes.get(childId);
        const childPath = `${canonical}/${childName}`;
        if (childInode && childInode.type === INodeType.DIRECTORY) {
          this.rmdir(childPath, true);
        } else {
          this.unlink(childPath);
        }
      }
    }

    const parent = this.getInodeByPath(this.dirname(canonical));
    if (parent) {
      parent.entries.delete(this.basename(canonical));
      parent.touch();
    }
    this.inodes.delete(inode.id);
  }

  /**
   * Lists names of all directory entries contained in a directory path.
   *
   * @param path - Directory path
   * @returns Array of file and directory names
   */
  public readdir(path: string): string[] {
    const inode = this.getInodeByPath(path, true);
    if (!inode) {
      throw new Error(`ENOENT: No such directory: ${path}`);
    }
    if (inode.type !== INodeType.DIRECTORY) {
      throw new Error(`ENOTDIR: Not a directory: ${path}`);
    }
    return Array.from(inode.entries.keys()).sort();
  }

  /**
   * Atomically renames or relocates a filesystem node.
   *
   * @param sourcePath - Original location
   * @param destinationPath - New location
   */
  public rename(sourcePath: string, destinationPath: string): void {
    const srcCanonical = this.resolvePath(sourcePath, "/", false);
    const destCanonical = this.resolvePath(destinationPath, "/", false);

    const srcParent = this.getInodeByPath(this.dirname(srcCanonical));
    const srcName = this.basename(srcCanonical);
    if (!srcParent || !srcParent.entries.has(srcName)) {
      throw new Error(`ENOENT: Source does not exist: ${sourcePath}`);
    }

    const inodeId = srcParent.entries.get(srcName)!;
    const destParent = this.getInodeByPath(this.dirname(destCanonical));
    const destName = this.basename(destCanonical);

    if (!destParent || destParent.type !== INodeType.DIRECTORY) {
      throw new Error(`ENOENT: Destination directory does not exist: ${destinationPath}`);
    }

    srcParent.entries.delete(srcName);
    srcParent.touch();
    destParent.entries.set(destName, inodeId);
    destParent.touch();
  }

  /**
   * Modifies the POSIX permission mode of an inode.
   *
   * @param path - Filesystem path
   * @param mode - Numerical permission bitmask
   */
  public chmod(path: string, mode: number): void {
    const inode = this.getInodeByPath(path, true);
    if (!inode) {
      throw new Error(`ENOENT: No such file or directory: ${path}`);
    }
    inode.mode = mode;
    inode.ctime = new Date();
  }

  /**
   * Modifies owner UID and group GID for an inode.
   *
   * @param path - Filesystem path
   * @param uid - User ID
   * @param gid - Group ID
   */
  public chown(path: string, uid: number, gid: number): void {
    const inode = this.getInodeByPath(path, true);
    if (!inode) {
      throw new Error(`ENOENT: No such file or directory: ${path}`);
    }
    inode.uid = uid;
    inode.gid = gid;
    inode.ctime = new Date();
  }

  /**
   * Creates a symbolic link referencing a target path.
   *
   * @param target - Reference destination string
   * @param linkPath - Location of the symlink node
   */
  public symlink(target: string, linkPath: string): void {
    const canonical = this.resolvePath(linkPath, "/", false);
    const parentPath = this.dirname(canonical);
    const name = this.basename(canonical);
    const parent = this.getInodeByPath(parentPath);

    if (!parent || parent.type !== INodeType.DIRECTORY) {
      throw new Error(`ENOENT: Directory does not exist: ${parentPath}`);
    }

    if (parent.entries.has(name)) {
      throw new Error(`EEXIST: Link path already exists: ${linkPath}`);
    }

    const inode = this.allocateInode(INodeType.SYMLINK, 0o777, 0, 0);
    inode.target = target;
    inode.size = target.length;
    parent.entries.set(name, inode.id);
    parent.touch();
  }

  /**
   * Reads the destination target stored within a symbolic link.
   *
   * @param linkPath - Symbolic link path
   * @returns Unresolved target string
   */
  public readlink(linkPath: string): string {
    const inode = this.getInodeByPath(linkPath, false);
    if (!inode) {
      throw new Error(`ENOENT: No such file: ${linkPath}`);
    }
    if (inode.type !== INodeType.SYMLINK) {
      throw new Error(`EINVAL: Invalid argument, not a symlink: ${linkPath}`);
    }
    return inode.target;
  }

  /**
   * Checks whether a path resolves to an existing inode.
   *
   * @param path - Filesystem path
   * @returns True if node exists
   */
  public exists(path: string): boolean {
    return this.getInodeByPath(path, true) !== undefined;
  }

  /**
   * Verifies whether an existing path points to a directory.
   *
   * @param path - Filesystem path
   * @returns True if node exists and is a directory
   */
  public isDirectory(path: string): boolean {
    const inode = this.getInodeByPath(path, true);
    return inode !== undefined && inode.type === INodeType.DIRECTORY;
  }

  /**
   * Verifies whether an existing path points to a regular file.
   *
   * @param path - Filesystem path
   * @returns True if node exists and is a regular file
   */
  public isFile(path: string): boolean {
    const inode = this.getInodeByPath(path, true);
    return inode !== undefined && inode.type === INodeType.FILE;
  }
}

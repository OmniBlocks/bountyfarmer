import { VirtualFileSystem } from "../fs/vfs";
import { Kernel, Process } from "../kernel/kernel";
import { INodeType } from "../types";

/**
 * Execution context provided to all builtin command handlers.
 */
export interface BuiltinContext {
  stdin: string;
  stdout: (data: string) => void;
  stderr: (data: string) => void;
  vfs: VirtualFileSystem;
  kernel: Kernel;
  process: Process;
  cwd: string;
  setCwd: (newCwd: string) => void;
  env: Map<string, string>;
}

/**
 * Functional interface implemented by all shell builtin utilities.
 */
export type BuiltinHandler = (
  args: string[],
  context: BuiltinContext
) => Promise<number> | number;

/**
 * Standard POSIX command collection implemented natively for the emulator environment.
 */
export class Builtins {
  private static handlers: Map<string, BuiltinHandler> = new Map();

  static {
    Builtins.register("echo", Builtins.echo);
    Builtins.register("cat", Builtins.cat);
    Builtins.register("ls", Builtins.ls);
    Builtins.register("cd", Builtins.cd);
    Builtins.register("pwd", Builtins.pwd);
    Builtins.register("mkdir", Builtins.mkdir);
    Builtins.register("rm", Builtins.rm);
    Builtins.register("cp", Builtins.cp);
    Builtins.register("mv", Builtins.mv);
    Builtins.register("touch", Builtins.touch);
    Builtins.register("grep", Builtins.grep);
    Builtins.register("head", Builtins.head);
    Builtins.register("tail", Builtins.tail);
    Builtins.register("wc", Builtins.wc);
    Builtins.register("uname", Builtins.uname);
    Builtins.register("whoami", Builtins.whoami);
    Builtins.register("id", Builtins.id);
    Builtins.register("date", Builtins.date);
    Builtins.register("uptime", Builtins.uptime);
    Builtins.register("env", Builtins.env);
    Builtins.register("export", Builtins.export);
    Builtins.register("unset", Builtins.unset);
    Builtins.register("find", Builtins.find);
    Builtins.register("ps", Builtins.ps);
    Builtins.register("kill", Builtins.kill);
    Builtins.register("sleep", Builtins.sleep);
    Builtins.register("true", Builtins.true);
    Builtins.register("false", Builtins.false);
    Builtins.register("sort", Builtins.sort);
    Builtins.register("uniq", Builtins.uniq);
    Builtins.register("seq", Builtins.seq);
    Builtins.register("base64", Builtins.base64);
    Builtins.register("chmod", Builtins.chmod);
    Builtins.register("chown", Builtins.chown);
    Builtins.register("clear", Builtins.clear);
    Builtins.register("help", Builtins.help);
  }

  /**
   * Registers a builtin handler for an invocation name.
   *
   * @param name - Executable name
   * @param handler - Function callback
   */
  public static register(name: string, handler: BuiltinHandler): void {
    Builtins.handlers.set(name, handler);
  }

  /**
   * Looks up a builtin handler by command name.
   *
   * @param name - Command binary name
   * @returns BuiltinHandler or undefined
   */
  public static get(name: string): BuiltinHandler | undefined {
    return Builtins.handlers.get(name);
  }

  /**
   * Checks if a command name is handled as a builtin.
   *
   * @param name - Command name
   * @returns True if builtin exists
   */
  public static has(name: string): boolean {
    return Builtins.handlers.has(name);
  }

  /**
   * Prints arguments to standard output.
   *
   * @param args - Arguments including options
   * @param context - Execution environment
   * @returns Exit code
   */
  public static echo(args: string[], context: BuiltinContext): number {
    let omitNewline = false;
    let interpretEscapes = false;
    let startIndex = 0;

    while (startIndex < args.length && args[startIndex].startsWith("-")) {
      const opt = args[startIndex];
      if (opt === "-n") {
        omitNewline = true;
        startIndex++;
      } else if (opt === "-e") {
        interpretEscapes = true;
        startIndex++;
      } else {
        break;
      }
    }

    let text = args.slice(startIndex).join(" ");
    if (interpretEscapes) {
      text = text
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\\\/g, "\\");
    }

    context.stdout(text + (omitNewline ? "" : "\n"));
    return 0;
  }

  /**
   * Concatenates and prints file contents or standard input.
   *
   * @param args - File paths
   * @param context - Execution environment
   * @returns Exit code
   */
  public static cat(args: string[], context: BuiltinContext): number {
    let numberLines = false;
    const files: string[] = [];

    for (const arg of args) {
      if (arg === "-n") {
        numberLines = true;
      } else {
        files.push(arg);
      }
    }

    const printContent = (content: string) => {
      if (!numberLines) {
        context.stdout(content);
        return;
      }
      const lines = content.split("\n");
      const formatted = lines
        .map((line, idx) => (idx === lines.length - 1 && line === "" ? "" : `     ${idx + 1}  ${line}`))
        .join("\n");
      context.stdout(formatted);
    };

    if (files.length === 0 || (files.length === 1 && files[0] === "-")) {
      printContent(context.stdin);
      return 0;
    }

    let hasError = false;
    for (const file of files) {
      if (file === "-") {
        printContent(context.stdin);
        continue;
      }
      try {
        const resolved = context.vfs.resolvePath(file, context.cwd);
        const text = context.vfs.readTextFile(resolved);
        printContent(text);
      } catch (err: unknown) {
        context.stderr(`cat: ${file}: No such file or directory\n`);
        hasError = true;
      }
    }

    return hasError ? 1 : 0;
  }

  /**
   * Lists directory contents with permissions, owner, size, and timestamps.
   *
   * @param args - Options and target paths
   * @param context - Execution environment
   * @returns Exit code
   */
  public static ls(args: string[], context: BuiltinContext): number {
    let showAll = false;
    let longFormat = false;
    let humanReadable = false;
    const targets: string[] = [];

    for (const arg of args) {
      if (arg.startsWith("-") && arg.length > 1) {
        for (let i = 1; i < arg.length; i++) {
          const opt = arg[i];
          if (opt === "a") showAll = true;
          else if (opt === "l") longFormat = true;
          else if (opt === "h") humanReadable = true;
        }
      } else {
        targets.push(arg);
      }
    }

    if (targets.length === 0) {
      targets.push(".");
    }

    let exitCode = 0;
    for (const target of targets) {
      const resolved = context.vfs.resolvePath(target, context.cwd);
      if (!context.vfs.exists(resolved)) {
        context.stderr(`ls: cannot access '${target}': No such file or directory\n`);
        exitCode = 1;
        continue;
      }

      if (context.vfs.isFile(resolved)) {
        if (longFormat) {
          const st = context.vfs.stat(resolved);
          const sizeStr = humanReadable ? Builtins.formatSize(st.size) : st.size.toString();
          context.stdout(`-rw-r--r-- 1 user user ${sizeStr.padStart(8)} ${target}\n`);
        } else {
          context.stdout(`${target}\n`);
        }
        continue;
      }

      const entries = context.vfs.readdir(resolved);
      const allEntries = showAll ? [".", "..", ...entries] : entries.filter((e) => !e.startsWith("."));

      if (longFormat) {
        let output = `total ${allEntries.length * 4}\n`;
        for (const entry of allEntries) {
          const entryPath = entry === "." || entry === ".." ? resolved : `${resolved}/${entry}`;
          try {
            const st = context.vfs.stat(entryPath);
            const isDir = st.type === INodeType.DIRECTORY;
            const permPrefix = isDir ? "d" : "-";
            const perms = `${permPrefix}rwxr-xr-x`;
            const sizeStr = humanReadable ? Builtins.formatSize(st.size) : st.size.toString();
            output += `${perms} 1 user user ${sizeStr.padStart(8)} ${entry}\n`;
          } catch {
            output += `-rw-r--r-- 1 user user        0 ${entry}\n`;
          }
        }
        context.stdout(output);
      } else {
        context.stdout(allEntries.join("  ") + (allEntries.length > 0 ? "\n" : ""));
      }
    }

    return exitCode;
  }

  /**
   * Formats a byte size into human readable magnitude strings.
   *
   * @param bytes - Numerical bytes
   * @returns Formatted string
   */
  private static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;
  }

  /**
   * Changes current working directory.
   *
   * @param args - Target path
   * @param context - Execution environment
   * @returns Exit code
   */
  public static cd(args: string[], context: BuiltinContext): number {
    const target = args[0] || context.env.get("HOME") || "/home/user";
    let destination = target;

    if (target === "~") {
      destination = context.env.get("HOME") || "/home/user";
    } else if (target === "-") {
      destination = context.env.get("OLDPWD") || context.cwd;
      context.stdout(`${destination}\n`);
    }

    const resolved = context.vfs.resolvePath(destination, context.cwd);
    if (!context.vfs.exists(resolved)) {
      context.stderr(`cd: ${target}: No such file or directory\n`);
      return 1;
    }
    if (!context.vfs.isDirectory(resolved)) {
      context.stderr(`cd: ${target}: Not a directory\n`);
      return 1;
    }

    context.env.set("OLDPWD", context.cwd);
    context.setCwd(resolved);
    context.env.set("PWD", resolved);
    return 0;
  }

  /**
   * Prints current working directory.
   *
   * @param _args - Unused
   * @param context - Execution environment
   * @returns Exit code
   */
  public static pwd(_args: string[], context: BuiltinContext): number {
    context.stdout(`${context.cwd}\n`);
    return 0;
  }

  /**
   * Creates directories at specified locations.
   *
   * @param args - Directory paths and options
   * @param context - Execution environment
   * @returns Exit code
   */
  public static mkdir(args: string[], context: BuiltinContext): number {
    let recursive = false;
    const paths: string[] = [];

    for (const arg of args) {
      if (arg === "-p") {
        recursive = true;
      } else {
        paths.push(arg);
      }
    }

    if (paths.length === 0) {
      context.stderr("mkdir: missing operand\n");
      return 1;
    }

    for (const p of paths) {
      try {
        const resolved = context.vfs.resolvePath(p, context.cwd);
        context.vfs.mkdir(resolved, 0o755, recursive);
      } catch (err: unknown) {
        context.stderr(`mkdir: cannot create directory '${p}': ${(err as Error).message}\n`);
        return 1;
      }
    }

    return 0;
  }

  /**
   * Deletes files or directories.
   *
   * @param args - Targets and flags
   * @param context - Execution environment
   * @returns Exit code
   */
  public static rm(args: string[], context: BuiltinContext): number {
    let recursive = false;
    let force = false;
    const targets: string[] = [];

    for (const arg of args) {
      if (arg.startsWith("-")) {
        if (arg.includes("r") || arg.includes("R")) recursive = true;
        if (arg.includes("f")) force = true;
      } else {
        targets.push(arg);
      }
    }

    if (targets.length === 0) {
      if (!force) context.stderr("rm: missing operand\n");
      return force ? 0 : 1;
    }

    for (const target of targets) {
      const resolved = context.vfs.resolvePath(target, context.cwd);
      if (!context.vfs.exists(resolved)) {
        if (!force) {
          context.stderr(`rm: cannot remove '${target}': No such file or directory\n`);
          return 1;
        }
        continue;
      }

      if (context.vfs.isDirectory(resolved)) {
        if (!recursive) {
          context.stderr(`rm: cannot remove '${target}': Is a directory\n`);
          return 1;
        }
        context.vfs.rmdir(resolved, true);
      } else {
        context.vfs.unlink(resolved);
      }
    }

    return 0;
  }

  /**
   * Copies source files to target destination.
   *
   * @param args - Source and destination
   * @param context - Execution environment
   * @returns Exit code
   */
  public static cp(args: string[], context: BuiltinContext): number {
    let recursive = false;
    const paths: string[] = [];

    for (const arg of args) {
      if (arg === "-r" || arg === "-R") {
        recursive = true;
      } else {
        paths.push(arg);
      }
    }

    if (paths.length < 2) {
      context.stderr("cp: missing file operand\n");
      return 1;
    }

    const src = paths[0];
    const dest = paths[1];
    const resolvedSrc = context.vfs.resolvePath(src, context.cwd);
    const resolvedDest = context.vfs.resolvePath(dest, context.cwd);

    if (!context.vfs.exists(resolvedSrc)) {
      context.stderr(`cp: cannot stat '${src}': No such file or directory\n`);
      return 1;
    }

    if (context.vfs.isDirectory(resolvedSrc)) {
      if (!recursive) {
        context.stderr(`cp: -r not specified; omitting directory '${src}'\n`);
        return 1;
      }
      Builtins.copyDirectoryRecursive(context.vfs, resolvedSrc, resolvedDest);
    } else {
      const finalDest = context.vfs.isDirectory(resolvedDest)
        ? `${resolvedDest}/${context.vfs.basename(resolvedSrc)}`
        : resolvedDest;
      const data = context.vfs.readFile(resolvedSrc);
      context.vfs.writeFile(finalDest, data);
    }

    return 0;
  }

  /**
   * Recursively copies a directory tree to another path.
   *
   * @param vfs - Filesystem
   * @param src - Source directory
   * @param dest - Target directory
   */
  private static copyDirectoryRecursive(
    vfs: VirtualFileSystem,
    src: string,
    dest: string
  ): void {
    vfs.mkdir(dest, 0o755, true);
    const entries = vfs.readdir(src);
    for (const entry of entries) {
      const srcChild = `${src}/${entry}`;
      const destChild = `${dest}/${entry}`;
      if (vfs.isDirectory(srcChild)) {
        Builtins.copyDirectoryRecursive(vfs, srcChild, destChild);
      } else {
        const content = vfs.readFile(srcChild);
        vfs.writeFile(destChild, content);
      }
    }
  }

  /**
   * Moves or renames filesystem nodes.
   *
   * @param args - Source and destination
   * @param context - Execution environment
   * @returns Exit code
   */
  public static mv(args: string[], context: BuiltinContext): number {
    if (args.length < 2) {
      context.stderr("mv: missing file operand\n");
      return 1;
    }

    const src = context.vfs.resolvePath(args[0], context.cwd);
    let dest = context.vfs.resolvePath(args[1], context.cwd);

    if (!context.vfs.exists(src)) {
      context.stderr(`mv: cannot stat '${args[0]}': No such file or directory\n`);
      return 1;
    }

    if (context.vfs.isDirectory(dest)) {
      dest = `${dest}/${context.vfs.basename(src)}`;
    }

    try {
      context.vfs.rename(src, dest);
    } catch (err: unknown) {
      context.stderr(`mv: error moving '${args[0]}': ${(err as Error).message}\n`);
      return 1;
    }

    return 0;
  }

  /**
   * Updates file modification timestamp or creates empty file.
   *
   * @param args - File paths
   * @param context - Execution environment
   * @returns Exit code
   */
  public static touch(args: string[], context: BuiltinContext): number {
    if (args.length === 0) {
      context.stderr("touch: missing file operand\n");
      return 1;
    }

    for (const p of args) {
      const resolved = context.vfs.resolvePath(p, context.cwd);
      if (context.vfs.exists(resolved)) {
        const inode = context.vfs.getInodeByPath(resolved);
        if (inode) inode.touch();
      } else {
        context.vfs.createFile(resolved, "");
      }
    }

    return 0;
  }

  /**
   * Searches for lines matching regular expression patterns.
   *
   * @param args - Flags, pattern, and file inputs
   * @param context - Execution environment
   * @returns Exit code
   */
  public static grep(args: string[], context: BuiltinContext): number {
    let ignoreCase = false;
    let invertMatch = false;
    let numberLines = false;
    let countOnly = false;
    let pattern = "";
    const files: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith("-") && arg.length > 1 && !pattern) {
        if (arg.includes("i")) ignoreCase = true;
        if (arg.includes("v")) invertMatch = true;
        if (arg.includes("n")) numberLines = true;
        if (arg.includes("c")) countOnly = true;
      } else if (!pattern) {
        pattern = arg;
      } else {
        files.push(arg);
      }
    }

    if (!pattern) {
      context.stderr("grep: missing pattern\n");
      return 2;
    }

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, ignoreCase ? "i" : "");
    } catch {
      regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), ignoreCase ? "i" : "");
    }

    const processText = (text: string, prefix: string = ""): { matchCount: number } => {
      const lines = text.split("\n");
      let count = 0;
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        if (idx === lines.length - 1 && line === "") continue;
        const matched = regex.test(line);
        const shouldOutput = invertMatch ? !matched : matched;
        if (shouldOutput) {
          count++;
          if (!countOnly) {
            let out = prefix;
            if (numberLines) out += `${idx + 1}:`;
            out += line + "\n";
            context.stdout(out);
          }
        }
      }
      return { matchCount: count };
    };

    if (files.length === 0) {
      const { matchCount } = processText(context.stdin);
      if (countOnly) context.stdout(`${matchCount}\n`);
      return matchCount > 0 ? 0 : 1;
    }

    let totalMatches = 0;
    for (const file of files) {
      try {
        const resolved = context.vfs.resolvePath(file, context.cwd);
        const text = context.vfs.readTextFile(resolved);
        const prefix = files.length > 1 ? `${file}:` : "";
        const { matchCount } = processText(text, prefix);
        totalMatches += matchCount;
        if (countOnly) {
          context.stdout(`${prefix}${matchCount}\n`);
        }
      } catch {
        context.stderr(`grep: ${file}: No such file or directory\n`);
      }
    }

    return totalMatches > 0 ? 0 : 1;
  }

  /**
   * Outputs the first N lines of text streams.
   *
   * @param args - Options and files
   * @param context - Execution environment
   * @returns Exit code
   */
  public static head(args: string[], context: BuiltinContext): number {
    let lineCount = 10;
    const files: string[] = [];

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-n" && args[i + 1]) {
        lineCount = parseInt(args[++i], 10) || 10;
      } else if (args[i].startsWith("-") && /^\-\d+$/.test(args[i])) {
        lineCount = parseInt(args[i].slice(1), 10) || 10;
      } else {
        files.push(args[i]);
      }
    }

    const processText = (text: string) => {
      const lines = text.split("\n");
      const selected = lines.slice(0, lineCount);
      context.stdout(selected.join("\n") + (selected.length > 0 ? "\n" : ""));
    };

    if (files.length === 0) {
      processText(context.stdin);
      return 0;
    }

    for (const file of files) {
      try {
        const resolved = context.vfs.resolvePath(file, context.cwd);
        const text = context.vfs.readTextFile(resolved);
        processText(text);
      } catch {
        context.stderr(`head: cannot open '${file}' for reading: No such file or directory\n`);
        return 1;
      }
    }

    return 0;
  }

  /**
   * Outputs the last N lines of text streams.
   *
   * @param args - Options and files
   * @param context - Execution environment
   * @returns Exit code
   */
  public static tail(args: string[], context: BuiltinContext): number {
    let lineCount = 10;
    const files: string[] = [];

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-n" && args[i + 1]) {
        lineCount = parseInt(args[++i], 10) || 10;
      } else if (args[i].startsWith("-") && /^\-\d+$/.test(args[i])) {
        lineCount = parseInt(args[i].slice(1), 10) || 10;
      } else {
        files.push(args[i]);
      }
    }

    const processText = (text: string) => {
      const lines = text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n");
      const selected = lines.slice(Math.max(0, lines.length - lineCount));
      context.stdout(selected.join("\n") + (selected.length > 0 ? "\n" : ""));
    };

    if (files.length === 0) {
      processText(context.stdin);
      return 0;
    }

    for (const file of files) {
      try {
        const resolved = context.vfs.resolvePath(file, context.cwd);
        const text = context.vfs.readTextFile(resolved);
        processText(text);
      } catch {
        context.stderr(`tail: cannot open '${file}' for reading: No such file or directory\n`);
        return 1;
      }
    }

    return 0;
  }

  /**
   * Calculates newline, word, and byte counts for text streams.
   *
   * @param args - Flags and files
   * @param context - Execution environment
   * @returns Exit code
   */
  public static wc(args: string[], context: BuiltinContext): number {
    let countLines = false;
    let countWords = false;
    let countBytes = false;
    const files: string[] = [];

    for (const arg of args) {
      if (arg.startsWith("-")) {
        if (arg.includes("l")) countLines = true;
        if (arg.includes("w")) countWords = true;
        if (arg.includes("c") || arg.includes("m")) countBytes = true;
      } else {
        files.push(arg);
      }
    }

    if (!countLines && !countWords && !countBytes) {
      countLines = true;
      countWords = true;
      countBytes = true;
    }

    const measure = (text: string) => {
      const lines = (text.match(/\n/g) || []).length;
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const bytes = new TextEncoder().encode(text).length;
      return { lines, words, bytes };
    };

    if (files.length === 0) {
      const m = measure(context.stdin);
      let out = "";
      if (countLines) out += `${m.lines.toString().padStart(8)} `;
      if (countWords) out += `${m.words.toString().padStart(8)} `;
      if (countBytes) out += `${m.bytes.toString().padStart(8)} `;
      context.stdout(out.trimEnd() + "\n");
      return 0;
    }

    for (const file of files) {
      try {
        const resolved = context.vfs.resolvePath(file, context.cwd);
        const text = context.vfs.readTextFile(resolved);
        const m = measure(text);
        let out = "";
        if (countLines) out += `${m.lines.toString().padStart(8)} `;
        if (countWords) out += `${m.words.toString().padStart(8)} `;
        if (countBytes) out += `${m.bytes.toString().padStart(8)} `;
        out += file;
        context.stdout(out + "\n");
      } catch {
        context.stderr(`wc: ${file}: No such file or directory\n`);
      }
    }

    return 0;
  }

  /**
   * Reports system kernel and hardware architecture details.
   *
   * @param args - Flags
   * @param context - Execution environment
   * @returns Exit code
   */
  public static uname(args: string[], context: BuiltinContext): number {
    const info = context.kernel.uname();
    const showAll = args.includes("-a");

    if (showAll) {
      context.stdout(
        `${info.sysname} ${info.nodename} ${info.release} ${info.version} ${info.machine} GNU/Linux\n`
      );
      return 0;
    }

    const parts: string[] = [];
    if (args.includes("-s") || args.length === 0) parts.push(info.sysname);
    if (args.includes("-n")) parts.push(info.nodename);
    if (args.includes("-r")) parts.push(info.release);
    if (args.includes("-v")) parts.push(info.version);
    if (args.includes("-m")) parts.push(info.machine);
    if (args.includes("-o")) parts.push("GNU/Linux");

    context.stdout(parts.join(" ") + "\n");
    return 0;
  }

  /**
   * Prints the user name associated with current execution context.
   *
   * @param _args - Unused
   * @param context - Execution environment
   * @returns Exit code
   */
  public static whoami(_args: string[], context: BuiltinContext): number {
    context.stdout(`${context.env.get("USER") || "user"}\n`);
    return 0;
  }

  /**
   * Prints UID and GID identity details.
   *
   * @param _args - Unused
   * @param context - Execution environment
   * @returns Exit code
   */
  public static id(_args: string[], context: BuiltinContext): number {
    const user = context.env.get("USER") || "user";
    const uid = context.process.uid;
    const gid = context.process.gid;
    context.stdout(`uid=${uid}(${user}) gid=${gid}(${user}) groups=${gid}(${user}),10(wheel)\n`);
    return 0;
  }

  /**
   * Prints system date and time.
   *
   * @param _args - Unused
   * @param context - Execution environment
   * @returns Exit code
   */
  public static date(_args: string[], context: BuiltinContext): number {
    context.stdout(`${new Date().toUTCString()}\n`);
    return 0;
  }

  /**
   * Reports system uptime and load average.
   *
   * @param _args - Unused
   * @param context - Execution environment
   * @returns Exit code
   */
  public static uptime(_args: string[], context: BuiltinContext): number {
    const sec = Math.floor(context.kernel.getUptimeSeconds());
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    context.stdout(`up ${hours}:${mins.toString().padStart(2, "0")}, 1 user, load average: 0.08, 0.05, 0.01\n`);
    return 0;
  }

  /**
   * Dumps active environment variables to standard output.
   *
   * @param _args - Unused
   * @param context - Execution environment
   * @returns Exit code
   */
  public static env(_args: string[], context: BuiltinContext): number {
    for (const [k, v] of context.env.entries()) {
      context.stdout(`${k}=${v}\n`);
    }
    return 0;
  }

  /**
   * Sets environment variables into shell state.
   *
   * @param args - Assignment expressions
   * @param context - Execution environment
   * @returns Exit code
   */
  public static export(args: string[], context: BuiltinContext): number {
    for (const arg of args) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        const key = arg.slice(0, eqIdx);
        const val = arg.slice(eqIdx + 1);
        context.env.set(key, val);
      }
    }
    return 0;
  }

  /**
   * Unsets environment variables from shell state.
   *
   * @param args - Variable names
   * @param context - Execution environment
   * @returns Exit code
   */
  public static unset(args: string[], context: BuiltinContext): number {
    for (const arg of args) {
      context.env.delete(arg);
    }
    return 0;
  }

  /**
   * Recursively finds files matching criteria.
   *
   * @param args - Start path and filter arguments
   * @param context - Execution environment
   * @returns Exit code
   */
  public static find(args: string[], context: BuiltinContext): number {
    const startPath = args[0] && !args[0].startsWith("-") ? args[0] : ".";
    let namePattern: RegExp | null = null;
    let typeFilter: "f" | "d" | null = null;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-name" && args[i + 1]) {
        const pat = args[++i].replace(/\./g, "\\.").replace(/\*/g, ".*");
        namePattern = new RegExp(`^${pat}$`);
      } else if (args[i] === "-type" && args[i + 1]) {
        typeFilter = args[++i] as "f" | "d";
      }
    }

    const resolved = context.vfs.resolvePath(startPath, context.cwd);
    const search = (current: string, display: string) => {
      const basename = context.vfs.basename(current);
      const isDir = context.vfs.isDirectory(current);

      let matches = true;
      if (namePattern && !namePattern.test(basename)) matches = false;
      if (typeFilter === "f" && isDir) matches = false;
      if (typeFilter === "d" && !isDir) matches = false;

      if (matches) context.stdout(`${display}\n`);

      if (isDir) {
        const entries = context.vfs.readdir(current);
        for (const entry of entries) {
          search(`${current}/${entry}`, `${display}/${entry}`);
        }
      }
    };

    search(resolved, startPath);
    return 0;
  }

  /**
   * Lists process snapshot table.
   *
   * @param _args - Unused
   * @param context - Execution environment
   * @returns Exit code
   */
  public static ps(_args: string[], context: BuiltinContext): number {
    const list = context.kernel.listProcesses();
    let out = "  PID TTY          TIME CMD\n";
    for (const p of list) {
      out += `${p.pid.toString().padStart(5)} ?        00:00:00 ${p.name}\n`;
    }
    context.stdout(out);
    return 0;
  }

  /**
   * Dispatches signal to process by PID.
   *
   * @param args - Process ID and signal options
   * @param context - Execution environment
   * @returns Exit code
   */
  public static kill(args: string[], context: BuiltinContext): number {
    if (args.length === 0) {
      context.stderr("kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]\n");
      return 1;
    }

    let signal = 15;
    let pidArg = args[0];

    if (args[0].startsWith("-") && args.length > 1) {
      signal = parseInt(args[0].slice(1), 10) || 15;
      pidArg = args[1];
    }

    const pid = parseInt(pidArg, 10);
    if (isNaN(pid)) {
      context.stderr(`kill: ${pidArg}: arguments must be process or job IDs\n`);
      return 1;
    }

    const ok = context.kernel.kill(pid, signal);
    if (!ok) {
      context.stderr(`kill: (${pid}) - No such process\n`);
      return 1;
    }

    return 0;
  }

  /**
   * Simulates execution pause for designated duration.
   *
   * @param args - Duration in seconds
   * @param context - Execution environment
   * @returns Exit code
   */
  public static async sleep(args: string[], context: BuiltinContext): Promise<number> {
    const seconds = parseFloat(args[0] || "0");
    if (isNaN(seconds)) {
      context.stderr(`sleep: invalid time interval '${args[0]}'\n`);
      return 1;
    }
    const ms = Math.min(Math.max(0, seconds * 1000), 500);
    if (ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
    return 0;
  }

  /**
   * Always succeeds with return code 0.
   *
   * @returns 0
   */
  public static true(): number {
    return 0;
  }

  /**
   * Always fails with return code 1.
   *
   * @returns 1
   */
  public static false(): number {
    return 1;
  }

  /**
   * Sorts lines of text streams.
   *
   * @param args - Flags and file paths
   * @param context - Execution environment
   * @returns Exit code
   */
  public static sort(args: string[], context: BuiltinContext): number {
    let reverse = false;
    let numeric = false;
    const files: string[] = [];

    for (const arg of args) {
      if (arg.startsWith("-")) {
        if (arg.includes("r")) reverse = true;
        if (arg.includes("n")) numeric = true;
      } else {
        files.push(arg);
      }
    }

    let text = context.stdin;
    if (files.length > 0) {
      try {
        const resolved = context.vfs.resolvePath(files[0], context.cwd);
        text = context.vfs.readTextFile(resolved);
      } catch {
        context.stderr(`sort: cannot read: ${files[0]}\n`);
        return 1;
      }
    }

    const lines = text.split("\n").filter((l, i, arr) => i < arr.length - 1 || l !== "");
    lines.sort((a, b) => {
      if (numeric) {
        return (parseFloat(a) || 0) - (parseFloat(b) || 0);
      }
      return a.localeCompare(b);
    });

    if (reverse) lines.reverse();
    context.stdout(lines.join("\n") + (lines.length > 0 ? "\n" : ""));
    return 0;
  }

  /**
   * Filters adjacent duplicate lines.
   *
   * @param args - Flags
   * @param context - Execution environment
   * @returns Exit code
   */
  public static uniq(args: string[], context: BuiltinContext): number {
    let countOnly = false;
    let ignoreCase = false;

    for (const arg of args) {
      if (arg.includes("c")) countOnly = true;
      if (arg.includes("i")) ignoreCase = true;
    }

    const lines = context.stdin.split("\n").filter((l, i, arr) => i < arr.length - 1 || l !== "");
    let lastLine: string | null = null;
    let count = 0;

    for (const line of lines) {
      const compareCurrent = ignoreCase ? line.toLowerCase() : line;
      const compareLast = lastLine !== null && ignoreCase ? lastLine.toLowerCase() : lastLine;

      if (compareCurrent === compareLast) {
        count++;
      } else {
        if (lastLine !== null) {
          context.stdout(countOnly ? `      ${count} ${lastLine}\n` : `${lastLine}\n`);
        }
        lastLine = line;
        count = 1;
      }
    }

    if (lastLine !== null) {
      context.stdout(countOnly ? `      ${count} ${lastLine}\n` : `${lastLine}\n`);
    }

    return 0;
  }

  /**
   * Generates integer sequences.
   *
   * @param args - Boundary integers
   * @param context - Execution environment
   * @returns Exit code
   */
  public static seq(args: string[], context: BuiltinContext): number {
    if (args.length === 0) {
      context.stderr("seq: missing operand\n");
      return 1;
    }

    let start = 1;
    let step = 1;
    let end = 1;

    if (args.length === 1) {
      end = parseInt(args[0], 10);
    } else if (args.length === 2) {
      start = parseInt(args[0], 10);
      end = parseInt(args[1], 10);
    } else {
      start = parseInt(args[0], 10);
      step = parseInt(args[1], 10);
      end = parseInt(args[2], 10);
    }

    const out: number[] = [];
    if (step > 0) {
      for (let i = start; i <= end; i += step) out.push(i);
    } else if (step < 0) {
      for (let i = start; i >= end; i += step) out.push(i);
    }

    context.stdout(out.join("\n") + (out.length > 0 ? "\n" : ""));
    return 0;
  }

  /**
   * Encodes or decodes Base64 data.
   *
   * @param args - Flags and file
   * @param context - Execution environment
   * @returns Exit code
   */
  public static base64(args: string[], context: BuiltinContext): number {
    const decode = args.includes("-d") || args.includes("--decode");
    const file = args.find((a) => !a.startsWith("-"));

    let input = context.stdin;
    if (file) {
      try {
        const resolved = context.vfs.resolvePath(file, context.cwd);
        input = context.vfs.readTextFile(resolved);
      } catch {
        context.stderr(`base64: ${file}: No such file or directory\n`);
        return 1;
      }
    }

    try {
      if (decode) {
        const decoded = Buffer.from(input.trim(), "base64").toString("utf-8");
        context.stdout(decoded);
      } else {
        const encoded = Buffer.from(input).toString("base64");
        context.stdout(`${encoded}\n`);
      }
    } catch (err: unknown) {
      context.stderr(`base64: invalid input: ${(err as Error).message}\n`);
      return 1;
    }

    return 0;
  }

  /**
   * Changes file permission mode.
   *
   * @param args - Mode and path
   * @param context - Execution environment
   * @returns Exit code
   */
  public static chmod(args: string[], context: BuiltinContext): number {
    if (args.length < 2) {
      context.stderr("chmod: missing operand\n");
      return 1;
    }
    const mode = parseInt(args[0], 8);
    const resolved = context.vfs.resolvePath(args[1], context.cwd);
    try {
      context.vfs.chmod(resolved, mode);
    } catch {
      context.stderr(`chmod: cannot access '${args[1]}': No such file or directory\n`);
      return 1;
    }
    return 0;
  }

  /**
   * Changes file ownership identifiers.
   *
   * @param args - User/group specifier and path
   * @param context - Execution environment
   * @returns Exit code
   */
  public static chown(args: string[], context: BuiltinContext): number {
    if (args.length < 2) {
      context.stderr("chown: missing operand\n");
      return 1;
    }
    const spec = args[0].split(":");
    const uid = spec[0] === "root" ? 0 : 1000;
    const gid = spec[1] === "root" ? 0 : 1000;
    const resolved = context.vfs.resolvePath(args[1], context.cwd);
    try {
      context.vfs.chown(resolved, uid, gid);
    } catch {
      context.stderr(`chown: cannot access '${args[1]}': No such file or directory\n`);
      return 1;
    }
    return 0;
  }

  /**
   * Emits ANSI clear screen control sequence.
   *
   * @param _args - Unused
   * @param context - Execution environment
   * @returns Exit code
   */
  public static clear(_args: string[], context: BuiltinContext): number {
    context.stdout("\x1b[2J\x1b[H");
    return 0;
  }

  /**
   * Lists available built-in commands and utilities.
   *
   * @param _args - Unused
   * @param context - Execution environment
   * @returns Exit code
   */
  public static help(_args: string[], context: BuiltinContext): number {
    const list = Array.from(Builtins.handlers.keys()).sort().join(", ");
    context.stdout(`OmniBlocks Linux Shell. Builtin utilities:\n${list}\n`);
    return 0;
  }
}

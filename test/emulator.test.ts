import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LinuxEmulator } from "../src/emulator";
import { VirtualFileSystem } from "../src/fs/vfs";
import { Kernel } from "../src/kernel/kernel";
import { OmniBlocksLinuxExtension } from "../src/omniblocks_extension";
import { ShellParser } from "../src/shell/parser";
import { Shell } from "../src/shell/shell";
import { INodeType, ProcessStatus } from "../src/types";

describe("VirtualFileSystem (VFS)", () => {
  it("initializes standard POSIX filesystem hierarchy", () => {
    const vfs = new VirtualFileSystem();

    assert.equal(vfs.exists("/"), true);
    assert.equal(vfs.isDirectory("/bin"), true);
    assert.equal(vfs.isDirectory("/etc"), true);
    assert.equal(vfs.isDirectory("/home/user"), true);
    assert.equal(vfs.isDirectory("/root"), true);
    assert.equal(vfs.isDirectory("/tmp"), true);
    assert.equal(vfs.isDirectory("/var/log"), true);
    assert.equal(vfs.isDirectory("/proc"), true);
    assert.equal(vfs.isDirectory("/dev"), true);
  });

  it("creates, reads, appends, and unlinks regular files", () => {
    const vfs = new VirtualFileSystem();

    vfs.createFile("/tmp/hello.txt", "Initial content\n");
    assert.equal(vfs.exists("/tmp/hello.txt"), true);
    assert.equal(vfs.isFile("/tmp/hello.txt"), true);
    assert.equal(vfs.readTextFile("/tmp/hello.txt"), "Initial content\n");

    vfs.writeFile("/tmp/hello.txt", "Appended content\n", { append: true });
    assert.equal(vfs.readTextFile("/tmp/hello.txt"), "Initial content\nAppended content\n");

    vfs.unlink("/tmp/hello.txt");
    assert.equal(vfs.exists("/tmp/hello.txt"), false);
  });

  it("handles directory creation and recursive deletion", () => {
    const vfs = new VirtualFileSystem();

    vfs.mkdir("/tmp/a/b/c", 0o755, true);
    assert.equal(vfs.isDirectory("/tmp/a/b/c"), true);

    vfs.createFile("/tmp/a/b/c/file.txt", "data");
    assert.equal(vfs.exists("/tmp/a/b/c/file.txt"), true);

    vfs.rmdir("/tmp/a", true);
    assert.equal(vfs.exists("/tmp/a"), false);
  });

  it("creates and resolves symbolic links", () => {
    const vfs = new VirtualFileSystem();

    vfs.createFile("/etc/target.conf", "configuration=active\n");
    vfs.symlink("/etc/target.conf", "/tmp/link.conf");

    assert.equal(vfs.readlink("/tmp/link.conf"), "/etc/target.conf");
    assert.equal(vfs.readTextFile("/tmp/link.conf"), "configuration=active\n");

    const stat = vfs.lstat("/tmp/link.conf");
    assert.equal(stat.type, INodeType.SYMLINK);
  });

  it("provides functional device nodes in /dev", () => {
    const vfs = new VirtualFileSystem();

    const nullBytes = vfs.readFile("/dev/null");
    assert.equal(nullBytes.length, 0);

    const zeroBytes = vfs.readFile("/dev/zero");
    assert.equal(zeroBytes.length, 4096);
    assert.equal(zeroBytes[0], 0);

    const randomBytes = vfs.readFile("/dev/urandom");
    assert.equal(randomBytes.length, 4096);
  });

  it("generates dynamic content for virtual /proc files", () => {
    const vfs = new VirtualFileSystem();

    const version = vfs.readTextFile("/proc/version");
    assert.ok(version.includes("Linux version 6.8.0-omniblocks"));

    const uptime = vfs.readTextFile("/proc/uptime");
    assert.ok(/^\d+\.\d+ \d+\.\d+/.test(uptime));

    const meminfo = vfs.readTextFile("/proc/meminfo");
    assert.ok(meminfo.includes("MemTotal:"));
    assert.ok(meminfo.includes("MemFree:"));

    const cpuinfo = vfs.readTextFile("/proc/cpuinfo");
    assert.ok(cpuinfo.includes("model name"));
  });
});

describe("Kernel & Process Manager", () => {
  it("boots with PID 1 and initial daemons", () => {
    const vfs = new VirtualFileSystem();
    const kernel = new Kernel(vfs);

    const init = kernel.getProcess(1);
    assert.ok(init);
    assert.equal(init.name, "systemd");
    assert.equal(init.uid, 0);

    const procs = kernel.listProcesses();
    assert.ok(procs.length >= 2);
    assert.ok(procs.some((p) => p.name === "systemd"));
  });

  it("allocates and terminates processes properly", () => {
    const vfs = new VirtualFileSystem();
    const kernel = new Kernel(vfs);

    const worker = kernel.createProcess("worker", 1, "/tmp");
    assert.ok(worker.pid >= 3);
    assert.equal(worker.status, ProcessStatus.RUNNING);

    kernel.kill(worker.pid, 9);
    assert.equal(kernel.getProcess(worker.pid), undefined);
  });

  it("reports accurate uname system specs", () => {
    const vfs = new VirtualFileSystem();
    const kernel = new Kernel(vfs);
    const info = kernel.uname();

    assert.equal(info.sysname, "Linux");
    assert.equal(info.nodename, "omniblocks");
    assert.equal(info.release, "6.8.0-omniblocks");
    assert.equal(info.machine, "x86_64");
  });
});

describe("Shell Parser & Lexer", () => {
  it("parses single and double quoted arguments with variable expansion", () => {
    const env = new Map<string, string>([
      ["GREETING", "hello"],
      ["NAME", "world"]
    ]);

    const tokens = ShellParser.tokenize('echo "$GREETING \'$NAME\'" \'$GREETING\'', env, 0);
    assert.equal(tokens.length, 3);
    assert.equal(tokens[0], "echo");
    assert.equal(tokens[1], "hello 'world'");
    assert.equal(tokens[2], "$GREETING");
  });

  it("parses pipelines and operators into abstract syntax trees", () => {
    const parser = new ShellParser();
    const env = new Map<string, string>();
    const ast = parser.parse("echo foo | grep bar && ls -la ; pwd", env, 0);

    assert.equal(ast.nodes.length, 3);
    assert.equal(ast.nodes[0].pipeline.commands.length, 2);
    assert.equal(ast.nodes[0].operator, "&&");
    assert.equal(ast.nodes[1].pipeline.commands.length, 1);
    assert.equal(ast.nodes[1].operator, ";");
    assert.equal(ast.nodes[2].pipeline.commands.length, 1);
  });
});

describe("POSIX Builtins & Command Execution", () => {
  it("executes echo, pwd, and directory changes", () => {
    const vfs = new VirtualFileSystem();
    const kernel = new Kernel(vfs);
    const shell = new Shell(kernel, "/home/user");

    const echoRes = shell.executeSync("echo -n 'hello posix'");
    assert.equal(echoRes.exitCode, 0);
    assert.equal(echoRes.stdout, "hello posix");

    const pwdRes = shell.executeSync("pwd");
    assert.equal(pwdRes.exitCode, 0);
    assert.equal(pwdRes.stdout.trim(), "/home/user");

    shell.executeSync("cd /tmp");
    assert.equal(shell.getCwd(), "/tmp");

    shell.executeSync("cd -");
    assert.equal(shell.getCwd(), "/home/user");
  });

  it("handles file manipulation with touch, cat, cp, mv, and rm", () => {
    const vfs = new VirtualFileSystem();
    const kernel = new Kernel(vfs);
    const shell = new Shell(kernel, "/tmp");

    shell.executeSync("touch note.txt");
    assert.equal(vfs.exists("/tmp/note.txt"), true);

    shell.executeSync("echo 'line 1' > note.txt");
    shell.executeSync("echo 'line 2' >> note.txt");

    const catRes = shell.executeSync("cat note.txt");
    assert.equal(catRes.stdout, "line 1\nline 2\n");

    shell.executeSync("cp note.txt copy.txt");
    assert.equal(vfs.readTextFile("/tmp/copy.txt"), "line 1\nline 2\n");

    shell.executeSync("mv copy.txt moved.txt");
    assert.equal(vfs.exists("/tmp/copy.txt"), false);
    assert.equal(vfs.exists("/tmp/moved.txt"), true);

    shell.executeSync("rm note.txt moved.txt");
    assert.equal(vfs.exists("/tmp/note.txt"), false);
    assert.equal(vfs.exists("/tmp/moved.txt"), false);
  });

  it("filters and counts lines using grep, head, tail, and wc", () => {
    const vfs = new VirtualFileSystem();
    const kernel = new Kernel(vfs);
    const shell = new Shell(kernel, "/tmp");

    shell.executeSync("seq 1 10 > numbers.txt");

    const headRes = shell.executeSync("head -n 3 numbers.txt");
    assert.equal(headRes.stdout, "1\n2\n3\n");

    const tailRes = shell.executeSync("tail -n 3 numbers.txt");
    assert.equal(tailRes.stdout, "8\n9\n10\n");

    const wcRes = shell.executeSync("wc -l numbers.txt");
    assert.ok(wcRes.stdout.includes("10"));

    const grepRes = shell.executeSync("grep -c '5' numbers.txt");
    assert.equal(grepRes.stdout.trim(), "1");
  });

  it("sorts, deduplicates, and encodes streams", () => {
    const vfs = new VirtualFileSystem();
    const kernel = new Kernel(vfs);
    const shell = new Shell(kernel, "/tmp");

    const sortRes = shell.executeSync("echo -e 'beta\\nalpha\\nalpha' | sort | uniq -c");
    assert.ok(sortRes.stdout.includes("2 alpha"));
    assert.ok(sortRes.stdout.includes("1 beta"));

    const b64Res = shell.executeSync("echo -n 'hello' | base64");
    assert.equal(b64Res.stdout.trim(), "aGVsbG8=");

    const decodeRes = shell.executeSync("echo -n 'aGVsbG8=' | base64 -d");
    assert.equal(decodeRes.stdout, "hello");
  });

  it("handles pipelines and conditional execution", () => {
    const vfs = new VirtualFileSystem();
    const kernel = new Kernel(vfs);
    const shell = new Shell(kernel, "/tmp");

    const pipeRes = shell.executeSync("echo -e 'one\\ntwo\\nthree' | grep 't'");
    assert.equal(pipeRes.stdout, "two\nthree\n");

    const andRes = shell.executeSync("true && echo success");
    assert.equal(andRes.stdout.trim(), "success");

    const orRes = shell.executeSync("false || echo fallback");
    assert.equal(orRes.stdout.trim(), "fallback");
  });

  it("manages environment variables and exit codes", () => {
    const vfs = new VirtualFileSystem();
    const kernel = new Kernel(vfs);
    const shell = new Shell(kernel, "/tmp");

    shell.executeSync("export FOO=bar");
    assert.equal(shell.getEnv("FOO"), "bar");

    const expandRes = shell.executeSync("echo $FOO");
    assert.equal(expandRes.stdout.trim(), "bar");

    shell.executeSync("false");
    const codeRes = shell.executeSync("echo $?");
    assert.equal(codeRes.stdout.trim(), "1");
  });
});

describe("LinuxEmulator Subsystem Integration", () => {
  const emulator = new LinuxEmulator();

  it("executes async commands and updates terminal screen buffer", async () => {
    const res = await emulator.execute("uname -a");
    assert.equal(res.exitCode, 0);
    assert.ok(res.stdout.includes("6.8.0-omniblocks"));

    const termOutput = emulator.getTerminal().getOutput();
    assert.ok(termOutput.includes("6.8.0-omniblocks"));
  });

  it("runs multi-line shell scripts with variable state persistence", async () => {
    const script = `
      mkdir -p /tmp/scripts
      cd /tmp/scripts
      echo "val1" > data.txt
      echo "val2" >> data.txt
      cat data.txt
    `;
    const res = await emulator.runScript(script);
    assert.equal(res.exitCode, 0);
    assert.equal(res.stdout, "val1\nval2\n");
    assert.equal(emulator.getCwd(), "/tmp/scripts");
  });

  it("supports system reboot", () => {
    emulator.setCwd("/tmp");
    emulator.reboot();
    assert.equal(emulator.getCwd(), "/home/user");
  });
});

describe("OmniBlocks Extension", () => {
  const extension = new OmniBlocksLinuxExtension();

  it("provides valid OmniBlocks extension manifest", () => {
    const info = extension.getInfo();
    assert.equal(info.id, "omniblocksLinux");
    assert.equal(info.name, "Linux Emulator");
    assert.ok(info.blocks.length >= 12);

    const opcodes = info.blocks.map((b) => b.opcode);
    assert.ok(opcodes.includes("runCommand"));
    assert.ok(opcodes.includes("getExitCode"));
    assert.ok(opcodes.includes("executeScript"));
    assert.ok(opcodes.includes("readFile"));
    assert.ok(opcodes.includes("writeFile"));
    assert.ok(opcodes.includes("fileExists"));
    assert.ok(opcodes.includes("isDirectory"));
    assert.ok(opcodes.includes("getWorkingDirectory"));
    assert.ok(opcodes.includes("changeDirectory"));
    assert.ok(opcodes.includes("getTerminalOutput"));
    assert.ok(opcodes.includes("clearTerminal"));
    assert.ok(opcodes.includes("getProcessList"));
    assert.ok(opcodes.includes("getSystemInfo"));
    assert.ok(opcodes.includes("reboot"));
  });

  it("executes runCommand block", async () => {
    const output = await extension.runCommand({ COMMAND: "echo 'OmniBlocks Linux'" });
    assert.equal(output.trim(), "OmniBlocks Linux");
    assert.equal(extension.getExitCode(), 0);
  });

  it("executes script via executeScript block", async () => {
    const script = `
      mkdir -p /tmp/test-ext
      echo "extension active" > /tmp/test-ext/status.txt
      cat /tmp/test-ext/status.txt
    `;
    const output = await extension.executeScript({ SCRIPT: script });
    assert.equal(output.trim(), "extension active");
  });

  it("operates filesystem blocks: writeFile, readFile, fileExists, isDirectory", () => {
    extension.writeFile({ PATH: "/tmp/block-file.txt", CONTENT: "block content" });
    assert.equal(extension.fileExists({ PATH: "/tmp/block-file.txt" }), true);
    assert.equal(extension.isDirectory({ PATH: "/tmp/block-file.txt" }), false);
    assert.equal(extension.readFile({ PATH: "/tmp/block-file.txt" }), "block content");
  });

  it("handles directory navigation and terminal control", () => {
    extension.changeDirectory({ PATH: "/tmp" });
    assert.equal(extension.getWorkingDirectory(), "/tmp");

    assert.ok(extension.getTerminalOutput().length > 0);
    extension.clearTerminal();
    assert.equal(extension.getTerminalOutput(), "");
  });

  it("queries process snapshot and system information blocks", () => {
    const procList = extension.getProcessList();
    assert.ok(procList.includes("systemd"));

    const release = extension.getSystemInfo({ FIELD: "release" });
    assert.equal(release, "6.8.0-omniblocks");

    const machine = extension.getSystemInfo({ FIELD: "machine" });
    assert.equal(machine, "x86_64");
  });

  it("reboots extension emulator subsystem", () => {
    extension.changeDirectory({ PATH: "/var/log" });
    extension.reboot();
    assert.equal(extension.getWorkingDirectory(), "/home/user");
  });
});

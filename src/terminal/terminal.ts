/**
 * Virtual terminal console managing standard stream screen buffers, ANSI formatting,
 * and prompt generation for interactive sessions.
 */
export class Terminal {
  private buffer: string[];
  private maxLines: number;

  /**
   * Initializes the terminal buffer with configurable maximum line limits.
   *
   * @param maxLines - Maximum history lines retained in buffer
   */
  constructor(maxLines: number = 1000) {
    this.buffer = [];
    this.maxLines = maxLines;
  }

  /**
   * Writes raw text characters or chunks to the terminal screen buffer.
   *
   * @param text - Character stream
   */
  public write(text: string): void {
    if (text.includes("\x1b[2J") || text.includes("\x1b[H")) {
      this.clear();
      text = text.replace(/\x1b\[2J/g, "").replace(/\x1b\[H/g, "");
    }

    const lines = text.split("\n");
    if (this.buffer.length === 0) {
      this.buffer.push(lines[0]);
    } else {
      this.buffer[this.buffer.length - 1] += lines[0];
    }

    for (let i = 1; i < lines.length; i++) {
      this.buffer.push(lines[i]);
    }

    if (this.buffer.length > this.maxLines) {
      this.buffer = this.buffer.slice(this.buffer.length - this.maxLines);
    }
  }

  /**
   * Writes a line of text followed by a newline delimiter.
   *
   * @param line - Line content
   */
  public writeLine(line: string): void {
    this.write(`${line}\n`);
  }

  /**
   * Clears all content currently retained in the screen buffer.
   */
  public clear(): void {
    this.buffer = [];
  }

  /**
   * Returns aggregated screen buffer content as a unified string.
   *
   * @returns Complete terminal output
   */
  public getOutput(): string {
    return this.buffer.join("\n");
  }

  /**
   * Returns line array representation of current screen buffer.
   *
   * @returns Array of line strings
   */
  public getLines(): string[] {
    return [...this.buffer];
  }

  /**
   * Generates a POSIX standard user prompt string.
   *
   * @param user - User name
   * @param host - Host name
   * @param cwd - Working directory
   * @returns Formatted prompt
   */
  public getPrompt(user: string = "user", host: string = "omniblocks", cwd: string = "/home/user"): string {
    const isRoot = user === "root";
    const symbol = isRoot ? "#" : "$";
    const displayPath = cwd === `/home/${user}` ? "~" : cwd;
    return `${user}@${host}:${displayPath}${symbol} `;
  }
}

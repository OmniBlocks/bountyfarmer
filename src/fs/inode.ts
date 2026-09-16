import { DeviceType, INodeType } from "../types";

/**
 * Internal representation of a filesystem index node storing content or directory entries.
 */
export class INode {
  public id: number;
  public type: INodeType;
  public mode: number;
  public uid: number;
  public gid: number;
  public size: number;
  public atime: Date;
  public mtime: Date;
  public ctime: Date;
  public nlink: number;
  public content: Uint8Array;
  public entries: Map<string, number>;
  public target: string;
  public deviceType?: DeviceType;
  public readHandler?: (length: number) => Uint8Array;
  public writeHandler?: (data: Uint8Array) => number;

  /**
   * Initializes a new inode instance.
   *
   * @param id - Unique numerical inode identifier
   * @param type - Inode file classification
   * @param mode - POSIX permission bitmask
   * @param uid - Owner user identifier
   * @param gid - Owner group identifier
   */
  constructor(
    id: number,
    type: INodeType,
    mode: number = 0o644,
    uid: number = 0,
    gid: number = 0
  ) {
    this.id = id;
    this.type = type;
    this.mode = mode;
    this.uid = uid;
    this.gid = gid;
    this.size = 0;
    this.atime = new Date();
    this.mtime = new Date();
    this.ctime = new Date();
    this.nlink = type === INodeType.DIRECTORY ? 2 : 1;
    this.content = new Uint8Array(0);
    this.entries = new Map<string, number>();
    this.target = "";
  }

  /**
   * Updates access and modification timestamps to the current system time.
   */
  public touch(): void {
    const now = new Date();
    this.atime = now;
    this.mtime = now;
  }
}

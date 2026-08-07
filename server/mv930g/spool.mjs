import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export class PermissionRestrictedSpool {
  constructor(directory) {
    if (!path.isAbsolute(directory)) throw new TypeError("MV930G spool path must be absolute.");
    this.directory = directory;
  }

  async initialize() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await chmod(this.directory, 0o700);
  }

  async write(payload) {
    const file = path.join(this.directory, `${Date.now()}-${randomUUID()}.json`);
    await writeFile(file, JSON.stringify(payload), { encoding: "utf8", mode: 0o600, flag: "wx" });
    await chmod(file, 0o600);
    return file;
  }

  async read(file) {
    this.#assertOwnedPath(file);
    return JSON.parse(await readFile(file, "utf8"));
  }

  async remove(file) {
    this.#assertOwnedPath(file);
    await unlink(file);
  }

  #assertOwnedPath(file) {
    const relative = path.relative(this.directory, file);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Invalid MV930G spool file path.");
    }
  }
}

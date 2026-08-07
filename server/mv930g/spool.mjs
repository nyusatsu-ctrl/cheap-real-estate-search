import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAXIMUM_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAXIMUM_FILES = 10_000;

export class PermissionRestrictedSpool {
  constructor(directory, options = {}) {
    if (!path.isAbsolute(directory)) throw new TypeError("MV930G spool path must be absolute.");
    this.directory = directory;
    this.maximumBytes = positiveInteger(options.maximumBytes, DEFAULT_MAXIMUM_BYTES);
    this.maximumFiles = positiveInteger(options.maximumFiles, DEFAULT_MAXIMUM_FILES);
    this.currentBytes = 0;
    this.currentFiles = 0;
    this.operation = Promise.resolve();
  }

  async initialize() {
    await this.#serialize(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      await chmod(this.directory, 0o700);
      const entries = await readdir(this.directory, { withFileTypes: true });
      let bytes = 0;
      let files = 0;
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
        const metadata = await stat(path.join(this.directory, entry.name));
        bytes += metadata.size;
        files += 1;
      }
      this.currentBytes = bytes;
      this.currentFiles = files;
    });
  }

  async write(payload) {
    const content = JSON.stringify(payload);
    const contentBytes = Buffer.byteLength(content);
    return this.#serialize(async () => {
      if (
        this.currentFiles >= this.maximumFiles
        || this.currentBytes + contentBytes > this.maximumBytes
      ) {
        throw new SpoolCapacityError();
      }
      const file = path.join(this.directory, `${Date.now()}-${randomUUID()}.json`);
      await writeFile(file, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
      await chmod(file, 0o600);
      this.currentBytes += contentBytes;
      this.currentFiles += 1;
      return file;
    });
  }

  async read(file) {
    this.#assertOwnedPath(file);
    return JSON.parse(await readFile(file, "utf8"));
  }

  async remove(file) {
    this.#assertOwnedPath(file);
    await this.#serialize(async () => {
      const metadata = await stat(file);
      await unlink(file);
      this.currentBytes = Math.max(0, this.currentBytes - metadata.size);
      this.currentFiles = Math.max(0, this.currentFiles - 1);
    });
  }

  #serialize(operation) {
    const result = this.operation.then(operation, operation);
    this.operation = result.catch(() => {});
    return result;
  }

  #assertOwnedPath(file) {
    const relative = path.relative(this.directory, file);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Invalid MV930G spool file path.");
    }
  }
}

export class SpoolCapacityError extends Error {
  constructor() {
    super("MV930G spool capacity exceeded.");
    this.name = "SpoolCapacityError";
    this.code = "spool_capacity_exceeded";
  }
}

function positiveInteger(value, fallback) {
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new TypeError("Invalid MV930G spool capacity.");
  }
  return parsed;
}

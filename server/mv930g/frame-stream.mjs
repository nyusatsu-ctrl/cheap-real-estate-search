import { JT808_DELIMITER, JT808_MAX_FRAME_BYTES } from "./jt808.mjs";

export const JT808_MAX_CONNECTION_BUFFER_BYTES = 16 * 1024;

export class Jt808FrameStream {
  #buffer = Buffer.alloc(0);

  constructor(options = {}) {
    this.maximumFrameBytes = options.maximumFrameBytes ?? JT808_MAX_FRAME_BYTES;
    this.maximumBufferBytes = options.maximumBufferBytes ?? JT808_MAX_CONNECTION_BUFFER_BYTES;
    if (this.maximumFrameBytes < 15 || this.maximumBufferBytes < this.maximumFrameBytes) {
      throw new TypeError("Invalid JT/T 808 stream limits.");
    }
  }

  get bufferedBytes() {
    return this.#buffer.length;
  }

  push(chunk) {
    if (!Buffer.isBuffer(chunk) && !(chunk instanceof Uint8Array)) {
      throw new TypeError("JT/T 808 stream chunks must be bytes.");
    }

    this.#buffer = Buffer.concat([this.#buffer, Buffer.from(chunk)]);
    const frames = [];
    const errors = [];

    while (this.#buffer.length > 0) {
      const start = this.#buffer.indexOf(JT808_DELIMITER);
      if (start < 0) {
        if (this.#buffer.length > this.maximumBufferBytes) {
          this.#buffer = Buffer.alloc(0);
          errors.push({ code: "connection_buffer_overflow" });
        }
        break;
      }

      if (start > 0) {
        this.#buffer = this.#buffer.subarray(start);
        errors.push({ code: "leading_noise_discarded" });
      }

      const end = this.#buffer.indexOf(JT808_DELIMITER, 1);
      if (end < 0) {
        if (this.#buffer.length > this.maximumFrameBytes) {
          this.#buffer = Buffer.from([JT808_DELIMITER]);
          errors.push({ code: "frame_too_large" });
        }
        break;
      }

      if (end === 1) {
        this.#buffer = this.#buffer.subarray(1);
        continue;
      }

      const frame = Buffer.from(this.#buffer.subarray(0, end + 1));
      this.#buffer = this.#buffer.subarray(end);
      if (frame.length > this.maximumFrameBytes) errors.push({ code: "frame_too_large" });
      else frames.push(frame);
    }

    if (this.#buffer.length > this.maximumBufferBytes) {
      this.#buffer = Buffer.alloc(0);
      errors.push({ code: "connection_buffer_overflow" });
    }

    return { frames, errors };
  }

  reset() {
    this.#buffer = Buffer.alloc(0);
  }
}

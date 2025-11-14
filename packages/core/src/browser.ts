installBufferShim();

export * from "./index";

function installBufferShim() {
  const globalRef = globalThis as typeof globalThis & { Buffer?: BufferConstructor };

  if (typeof globalRef.Buffer !== "undefined") {
    return;
  }

  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  class BrowserBuffer extends Uint8Array {
    constructor(value: number | ArrayBufferLike | ArrayBufferView | ArrayLike<number>) {
      if (typeof value === "number") {
        super(value);
        return;
      }

      if (isArrayBufferLike(value)) {
        super(new Uint8Array(value));
        return;
      }

      if (ArrayBuffer.isView(value)) {
        super(
          new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength))
        );
        return;
      }

      super(Array.from(value));
    }

    override toString(encoding: BufferEncoding = "utf-8") {
      if (encoding !== "utf-8" && encoding !== "utf8") {
        throw new Error(`Unsupported encoding '${encoding}' in browser Buffer shim`);
      }
      return textDecoder.decode(this);
    }
  }

  const from = (value: string | ArrayLike<number> | BufferSource, encoding: BufferEncoding = "utf-8") => {
    if (typeof value === "string") {
      if (encoding !== "utf-8" && encoding !== "utf8") {
        throw new Error(`Unsupported encoding '${encoding}' in browser Buffer shim`);
      }
      return new BrowserBuffer(textEncoder.encode(value));
    }

    if (isArrayBufferLike(value)) {
      return new BrowserBuffer(new Uint8Array(value));
    }

    if (ArrayBuffer.isView(value)) {
      return new BrowserBuffer(value);
    }

    if (typeof (value as ArrayLike<number>).length === "number") {
      return new BrowserBuffer(Array.from(value as ArrayLike<number>));
    }

    throw new TypeError("Unsupported input passed to Buffer.from in browser shim");
  };

  const alloc = (size: number, fill?: number | string) => {
    if (size < 0) {
      throw new RangeError("Invalid Buffer size");
    }
    const buffer = new BrowserBuffer(size);
    if (typeof fill === "number") {
      buffer.fill(fill);
    } else if (typeof fill === "string") {
      if (!fill.length) {
        buffer.fill(0);
      } else {
        const pattern = textEncoder.encode(fill);
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = pattern[i % pattern.length];
        }
      }
    } else {
      buffer.fill(0);
    }
    return buffer;
  };

  const concat = (buffers: ArrayLike<Uint8Array>, totalLength?: number) => {
    const sanitized = Array.from(buffers, (buffer) =>
      buffer instanceof BrowserBuffer ? buffer : new BrowserBuffer(buffer)
    );
    const length = totalLength ?? sanitized.reduce((acc, current) => acc + current.length, 0);
    const result = new BrowserBuffer(length);
    let offset = 0;
    for (const buffer of sanitized) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    return result;
  };

  const byteLength = (value: string | ArrayBuffer | ArrayBufferView) => {
    if (typeof value === "string") {
      return textEncoder.encode(value).length;
    }
    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }
    if (ArrayBuffer.isView(value)) {
      return value.byteLength;
    }
    throw new TypeError("Unable to determine byte length for provided value");
  };

  Object.defineProperties(BrowserBuffer, {
    from: { value: from },
    isBuffer: { value: (candidate: unknown) => candidate instanceof BrowserBuffer },
    alloc: { value: alloc },
    concat: { value: concat },
    byteLength: { value: byteLength }
  });

  BrowserBuffer.prototype.valueOf = function valueOf() {
    return this;
  };

  globalRef.Buffer = BrowserBuffer as unknown as BufferConstructor;

  if (typeof window !== "undefined" && typeof (window as typeof globalThis).Buffer === "undefined") {
    (window as typeof globalThis & { Buffer?: BufferConstructor }).Buffer = globalRef.Buffer;
  }
}

function isArrayBufferLike(value: unknown): value is ArrayBufferLike {
  if (value instanceof ArrayBuffer) {
    return true;
  }
  return typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
}

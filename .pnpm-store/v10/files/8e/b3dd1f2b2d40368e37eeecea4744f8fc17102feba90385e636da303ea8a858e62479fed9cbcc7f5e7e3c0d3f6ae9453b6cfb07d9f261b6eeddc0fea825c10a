import { join, dirname } from "pathe";
import { joinRelativeURL } from "ufo";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { randomUUID } from "uncrypto";
import { getContentType } from "../utils.mjs";
const META_EXTENSION = ".$meta.json";
export function createDriver(options) {
  const dir = options.dir;
  const ensureBase = async () => {
    try {
      await fsp.mkdir(dir, { recursive: true });
    } catch {
    }
  };
  const getFullPath = (pathname) => {
    return join(dir, pathname);
  };
  const getMetaPath = (pathname) => {
    return getFullPath(pathname) + META_EXTENSION;
  };
  const readMeta = async (pathname) => {
    try {
      const metaPath = getMetaPath(pathname);
      const content = await fsp.readFile(metaPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return {};
    }
  };
  const writeMeta = async (pathname, meta) => {
    const metaPath = getMetaPath(pathname);
    await fsp.mkdir(dirname(metaPath), { recursive: true });
    await fsp.writeFile(metaPath, JSON.stringify(meta));
  };
  const deleteMeta = async (pathname) => {
    try {
      await fsp.unlink(getMetaPath(pathname));
    } catch {
    }
  };
  const walkDir = async (dir2, prefix = "") => {
    const files = [];
    try {
      const entries = await fsp.readdir(dir2, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir2, entry.name);
        const relativePath = prefix ? joinRelativeURL(prefix, entry.name) : entry.name;
        if (entry.isDirectory()) {
          const subFiles = await walkDir(fullPath, relativePath);
          files.push(...subFiles);
        } else if (!entry.name.endsWith(META_EXTENSION)) {
          files.push(relativePath);
        }
      }
    } catch {
    }
    return files;
  };
  return {
    name: "fs",
    options,
    async list(listOptions) {
      await ensureBase();
      const prefix = listOptions?.prefix || "";
      const searchDir = prefix ? join(dir, prefix) : dir;
      let files;
      const folders = [];
      if (listOptions?.folded) {
        try {
          const entries = await fsp.readdir(searchDir, { withFileTypes: true });
          files = [];
          for (const entry of entries) {
            if (entry.name.endsWith(META_EXTENSION)) continue;
            const relativePath = prefix ? joinRelativeURL(prefix, entry.name) : entry.name;
            if (entry.isDirectory()) {
              folders.push(joinRelativeURL(relativePath, "/"));
            } else {
              files.push(relativePath);
            }
          }
        } catch {
          files = [];
        }
      } else {
        files = await walkDir(searchDir, prefix);
      }
      const blobs = await Promise.all(
        files.map(async (pathname) => {
          const fullPath = getFullPath(pathname);
          try {
            const stat = await fsp.stat(fullPath);
            const meta = await readMeta(pathname);
            return {
              pathname,
              contentType: meta?.contentType || getContentType(pathname),
              size: stat.size,
              httpEtag: `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`,
              uploadedAt: stat.mtime,
              httpMetadata: {},
              customMetadata: meta?.customMetadata || {}
            };
          } catch {
            return {
              pathname,
              contentType: getContentType(pathname),
              size: 0,
              httpEtag: "",
              uploadedAt: /* @__PURE__ */ new Date(),
              httpMetadata: {},
              customMetadata: {}
            };
          }
        })
      );
      return {
        blobs,
        hasMore: false,
        cursor: void 0,
        folders: listOptions?.folded ? folders : void 0
      };
    },
    async get(pathname) {
      const fullPath = getFullPath(decodeURIComponent(pathname));
      try {
        const buffer = await fsp.readFile(fullPath);
        const meta = await readMeta(pathname);
        return new Blob([buffer], {
          type: meta?.contentType || getContentType(pathname)
        });
      } catch {
        return null;
      }
    },
    async getArrayBuffer(pathname) {
      const fullPath = getFullPath(decodeURIComponent(pathname));
      try {
        const buffer = await fsp.readFile(fullPath);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      } catch {
        return null;
      }
    },
    async put(pathname, body, options2) {
      await ensureBase();
      const fullPath = getFullPath(pathname);
      await fsp.mkdir(dirname(fullPath), { recursive: true });
      const contentType = options2?.contentType || (body instanceof Blob ? body.type : void 0) || getContentType(pathname);
      let buffer;
      if (typeof body === "string") {
        buffer = Buffer.from(body);
      } else if (body instanceof Blob) {
        buffer = Buffer.from(await body.arrayBuffer());
      } else if (body instanceof ArrayBuffer) {
        buffer = Buffer.from(body);
      } else if (ArrayBuffer.isView(body)) {
        buffer = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
      } else if (body instanceof ReadableStream) {
        const chunks = [];
        const reader = body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        buffer = Buffer.concat(chunks);
      } else {
        buffer = Buffer.from(body);
      }
      await fsp.writeFile(fullPath, buffer);
      const meta = {
        contentType,
        size: buffer.length,
        mtime: /* @__PURE__ */ new Date(),
        customMetadata: options2?.customMetadata
      };
      await writeMeta(pathname, meta);
      return {
        pathname,
        contentType,
        size: buffer.length,
        httpEtag: `"${Date.now().toString(16)}-${buffer.length.toString(16)}"`,
        uploadedAt: /* @__PURE__ */ new Date(),
        httpMetadata: {},
        customMetadata: options2?.customMetadata || {}
      };
    },
    async head(pathname) {
      const fullPath = getFullPath(decodeURIComponent(pathname));
      try {
        const stat = await fsp.stat(fullPath);
        const meta = await readMeta(pathname);
        return {
          pathname,
          contentType: meta?.contentType || getContentType(pathname),
          size: stat.size,
          httpEtag: `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`,
          uploadedAt: stat.mtime,
          httpMetadata: {},
          customMetadata: meta?.customMetadata || {}
        };
      } catch {
        return null;
      }
    },
    async hasItem(pathname) {
      const fullPath = getFullPath(decodeURIComponent(pathname));
      try {
        await fsp.access(fullPath);
        return true;
      } catch {
        return false;
      }
    },
    async delete(pathnames) {
      const paths = Array.isArray(pathnames) ? pathnames : [pathnames];
      await Promise.all(
        paths.map(async (p) => {
          const fullPath = getFullPath(decodeURIComponent(p));
          try {
            await fsp.unlink(fullPath);
            await deleteMeta(p);
          } catch {
          }
        })
      );
    },
    async createMultipartUpload(pathname, options2) {
      await ensureBase();
      const uploadId = randomUUID();
      return createOrResumeMultipartUpload(dir, pathname, uploadId, options2);
    },
    async resumeMultipartUpload(pathname, uploadId) {
      return createOrResumeMultipartUpload(dir, pathname, uploadId);
    }
  };
}
async function createOrResumeMultipartUpload(dir, pathname, uploadId, options) {
  const metaPath = join(dir, `${pathname}.mpu.${uploadId}.json`);
  const partsDir = join(dir, `.mpu.${uploadId}`);
  let metadata;
  if (options) {
    metadata = {
      pathname,
      uploadId,
      contentType: options.contentType || getContentType(pathname),
      customMetadata: options.customMetadata || {},
      parts: []
    };
    await fsp.mkdir(dirname(metaPath), { recursive: true });
    await fsp.writeFile(metaPath, JSON.stringify(metadata));
    await fsp.mkdir(partsDir, { recursive: true });
  } else {
    try {
      const content = await fsp.readFile(metaPath, "utf-8");
      metadata = JSON.parse(content);
    } catch {
      throw new Error("Multipart upload not found");
    }
  }
  const parts = new Map(metadata.parts);
  const saveMeta = async () => {
    metadata.parts = Array.from(parts.entries());
    await fsp.writeFile(metaPath, JSON.stringify(metadata));
  };
  return {
    pathname,
    uploadId,
    async uploadPart(partNumber, value) {
      let buffer;
      if (typeof value === "string") {
        buffer = Buffer.from(value);
      } else if (value instanceof Blob) {
        buffer = Buffer.from(await value.arrayBuffer());
      } else if (value instanceof ArrayBuffer) {
        buffer = Buffer.from(value);
      } else if (ArrayBuffer.isView(value)) {
        buffer = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
      } else if (value instanceof ReadableStream) {
        const chunks = [];
        const reader = value.getReader();
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          chunks.push(chunk);
        }
        buffer = Buffer.concat(chunks);
      } else {
        buffer = Buffer.from(value);
      }
      const partPath = join(partsDir, partNumber.toString().padStart(10, "0"));
      await fsp.writeFile(partPath, buffer);
      const uploadedPart = {
        partNumber,
        etag: `"${randomUUID()}"`
      };
      parts.set(partNumber, uploadedPart);
      await saveMeta();
      return uploadedPart;
    },
    async complete(uploadedParts) {
      if (uploadedParts.length === 0) {
        throw new Error("No parts provided for completion");
      }
      const sortedParts = [...uploadedParts].sort((a, b) => a.partNumber - b.partNumber);
      const expectedPartNumbers = Array.from({ length: sortedParts.length }, (_, i) => i + 1);
      for (const expectedPart of expectedPartNumbers) {
        if (!sortedParts.find((p) => p.partNumber === expectedPart)) {
          throw new Error(`Missing part ${expectedPart}`);
        }
      }
      const fullPath = join(dir, pathname);
      await fsp.mkdir(dirname(fullPath), { recursive: true });
      const writeStream = fs.createWriteStream(fullPath);
      for (const part of sortedParts) {
        const partPath = join(partsDir, part.partNumber.toString().padStart(10, "0"));
        await new Promise((resolve, reject) => {
          const readStream = fs.createReadStream(partPath);
          readStream.pipe(writeStream, { end: false });
          readStream.on("error", reject);
          readStream.on("end", () => resolve());
        });
      }
      await new Promise((resolve, reject) => {
        writeStream.end();
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
      const stat = await fsp.stat(fullPath);
      const blobMeta = {
        contentType: metadata.contentType,
        size: stat.size,
        mtime: /* @__PURE__ */ new Date(),
        customMetadata: metadata.customMetadata
      };
      await fsp.writeFile(fullPath + META_EXTENSION, JSON.stringify(blobMeta));
      await fsp.rm(partsDir, { recursive: true, force: true });
      await fsp.unlink(metaPath).catch(() => {
      });
      return {
        pathname,
        contentType: metadata.contentType,
        size: stat.size,
        httpEtag: `"${randomUUID()}"`,
        uploadedAt: /* @__PURE__ */ new Date(),
        httpMetadata: {
          contentType: metadata.contentType
        },
        customMetadata: metadata.customMetadata
      };
    },
    async abort() {
      await fsp.rm(partsDir, { recursive: true, force: true });
      await fsp.unlink(metaPath).catch(() => {
      });
    }
  };
}

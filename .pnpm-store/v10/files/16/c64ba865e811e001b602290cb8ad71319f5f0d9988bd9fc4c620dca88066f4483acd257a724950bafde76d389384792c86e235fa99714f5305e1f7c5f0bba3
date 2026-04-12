import { getContentType } from "../utils.mjs";
function mapR2ObjectToBlob(object) {
  return {
    pathname: object.key,
    contentType: object.httpMetadata?.contentType || getContentType(object.key),
    size: object.size,
    httpEtag: object.httpEtag,
    uploadedAt: object.uploaded,
    httpMetadata: object.httpMetadata || {},
    customMetadata: object.customMetadata || {}
  };
}
export function createDriver(options) {
  const getBucket = () => {
    const binding = options.binding || "BLOB";
    const bucket = globalThis[binding] || globalThis.__env__?.[binding] || process.env[binding];
    if (!bucket) {
      throw new Error(`R2 binding "${options.binding}" not found`);
    }
    return bucket;
  };
  return {
    name: "cloudflare-r2",
    options,
    async list(listOptions) {
      const bucket = getBucket();
      const r2Options = {
        limit: listOptions?.limit ?? 1e3,
        prefix: listOptions?.prefix,
        cursor: listOptions?.cursor,
        delimiter: listOptions?.folded ? "/" : void 0,
        include: ["httpMetadata", "customMetadata"]
      };
      const result = await bucket.list(r2Options);
      const blobs = result.objects.map(mapR2ObjectToBlob);
      return {
        blobs,
        hasMore: result.truncated,
        cursor: result.truncated ? result.cursor : void 0,
        folders: listOptions?.folded ? result.delimitedPrefixes : void 0
      };
    },
    async get(pathname) {
      const bucket = getBucket();
      const object = await bucket.get(decodeURIComponent(pathname));
      if (!object) {
        return null;
      }
      const arrayBuffer = await object.arrayBuffer();
      return new Blob([arrayBuffer], {
        type: object.httpMetadata?.contentType || getContentType(pathname)
      });
    },
    async getArrayBuffer(pathname) {
      const bucket = getBucket();
      const object = await bucket.get(decodeURIComponent(pathname));
      if (!object) {
        return null;
      }
      return object.arrayBuffer();
    },
    async put(pathname, body, options2) {
      const bucket = getBucket();
      const contentType = options2?.contentType || (body instanceof Blob ? body.type : void 0) || getContentType(pathname);
      if (options2?.access) {
        console.warn("Setting access level for blob in Cloudflare R2 is not supported, it will be ignored");
      }
      const r2Object = await bucket.put(pathname, body, {
        httpMetadata: {
          contentType
        },
        customMetadata: options2?.customMetadata
      });
      return mapR2ObjectToBlob(r2Object);
    },
    async head(pathname) {
      const bucket = getBucket();
      const object = await bucket.head(decodeURIComponent(pathname));
      if (!object) {
        return null;
      }
      return mapR2ObjectToBlob(object);
    },
    async hasItem(pathname) {
      const bucket = getBucket();
      const object = await bucket.head(decodeURIComponent(pathname));
      return object !== null;
    },
    async delete(pathnames) {
      const bucket = getBucket();
      const paths = Array.isArray(pathnames) ? pathnames : [pathnames];
      await Promise.all(
        paths.map((p) => bucket.delete(decodeURIComponent(p)))
      );
    },
    async createMultipartUpload(pathname, options2) {
      const bucket = getBucket();
      const mpu = await bucket.createMultipartUpload(pathname, {
        httpMetadata: {
          contentType: options2?.contentType || getContentType(pathname)
        },
        customMetadata: options2?.customMetadata || {}
      });
      return {
        pathname,
        uploadId: mpu.uploadId,
        uploadPart(partNumber, value) {
          return mpu.uploadPart(partNumber, value);
        },
        async abort() {
          await mpu.abort();
        },
        async complete(uploadedParts) {
          const r2Object = await mpu.complete(uploadedParts);
          return mapR2ObjectToBlob(r2Object);
        }
      };
    },
    async resumeMultipartUpload(pathname, uploadId) {
      const bucket = getBucket();
      const mpu = bucket.resumeMultipartUpload(pathname, uploadId);
      return {
        pathname,
        uploadId: mpu.uploadId,
        uploadPart(partNumber, value) {
          return mpu.uploadPart(partNumber, value);
        },
        async abort() {
          await mpu.abort();
        },
        async complete(uploadedParts) {
          const r2Object = await mpu.complete(uploadedParts);
          return mapR2ObjectToBlob(r2Object);
        }
      };
    }
  };
}

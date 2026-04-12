import { put as vercelPut, del as vercelDel, head as vercelHead, list as vercelList, createMultipartUpload as vercelCreateMultipartUpload, uploadPart as vercelUploadPart, completeMultipartUpload as vercelCompleteMultipartUpload } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import { createError, readBody } from "h3";
import { getContentType } from "../utils.mjs";
function mapVercelBlobToBlob(blob) {
  return {
    pathname: blob.pathname,
    contentType: ("contentType" in blob ? blob.contentType : void 0) || getContentType(blob.pathname),
    size: "size" in blob ? blob.size : void 0,
    httpEtag: void 0,
    uploadedAt: "uploadedAt" in blob ? blob.uploadedAt : /* @__PURE__ */ new Date(),
    httpMetadata: {},
    customMetadata: {},
    url: blob.url
  };
}
export function createDriver(options = {}) {
  const token = options.token || process.env.BLOB_READ_WRITE_TOKEN;
  const access = options.access || "public";
  return {
    name: "vercel-blob",
    options,
    async list(listOptions) {
      const result = await vercelList({
        token,
        limit: listOptions?.limit ?? 1e3,
        prefix: listOptions?.prefix,
        cursor: listOptions?.cursor,
        mode: listOptions?.folded ? "folded" : "expanded"
      });
      return {
        blobs: result.blobs.map(mapVercelBlobToBlob),
        hasMore: result.hasMore,
        cursor: result.cursor,
        folders: "folders" in result ? result.folders : void 0
      };
    },
    async get(pathname) {
      try {
        const headResult = await vercelHead(decodeURIComponent(pathname), { token });
        if (!headResult) return null;
        const res = await fetch(headResult.url);
        if (!res.ok) return null;
        return res.blob();
      } catch {
        return null;
      }
    },
    async getArrayBuffer(pathname) {
      try {
        const headResult = await vercelHead(decodeURIComponent(pathname), { token });
        if (!headResult) return null;
        const res = await fetch(headResult.url);
        if (!res.ok) return null;
        return res.arrayBuffer();
      } catch {
        return null;
      }
    },
    async put(pathname, body, putOptions) {
      const contentType = putOptions?.contentType || (body instanceof Blob ? body.type : void 0) || getContentType(pathname);
      if (putOptions?.access === "private") {
        throw createError({
          statusCode: 400,
          statusMessage: "Private access is not yet supported for Vercel Blob"
        });
      }
      const result = await vercelPut(pathname, body, {
        token,
        access,
        contentType
        // Note: Vercel Blob doesn't support custom metadata in the same way
      });
      return mapVercelBlobToBlob(result);
    },
    async head(pathname) {
      try {
        const result = await vercelHead(decodeURIComponent(pathname), { token });
        if (!result) return null;
        return mapVercelBlobToBlob(result);
      } catch {
        return null;
      }
    },
    async hasItem(pathname) {
      try {
        const result = await vercelHead(decodeURIComponent(pathname), { token });
        return result !== null;
      } catch {
        return false;
      }
    },
    async delete(pathnames) {
      const paths = Array.isArray(pathnames) ? pathnames : [pathnames];
      for (const pathname of paths) {
        try {
          const headResult = await vercelHead(decodeURIComponent(pathname), { token });
          if (headResult) {
            await vercelDel(headResult.url, { token });
          }
        } catch {
        }
      }
    },
    async createMultipartUpload(pathname, mpuOptions) {
      const { key, uploadId } = await vercelCreateMultipartUpload(pathname, {
        access,
        token,
        contentType: mpuOptions?.contentType || getContentType(pathname)
      });
      return {
        pathname,
        uploadId,
        async uploadPart(partNumber, value) {
          return vercelUploadPart(pathname, value, {
            access,
            token,
            contentType: mpuOptions?.contentType || getContentType(pathname),
            uploadId,
            key,
            partNumber
          });
        },
        async abort() {
        },
        async complete(uploadedParts) {
          const result = await vercelCompleteMultipartUpload(pathname, uploadedParts, {
            access,
            token,
            contentType: mpuOptions?.contentType || getContentType(pathname),
            uploadId,
            key
          });
          return mapVercelBlobToBlob(result);
        }
      };
    },
    async resumeMultipartUpload(pathname, uploadId) {
      return {
        pathname,
        uploadId,
        async uploadPart(partNumber, value) {
          return vercelUploadPart(pathname, value, {
            access,
            token,
            uploadId,
            partNumber,
            key: pathname
          });
        },
        async abort() {
        },
        async complete(uploadedParts) {
          const result = await vercelCompleteMultipartUpload(pathname, uploadedParts, {
            access,
            token,
            uploadId,
            key: pathname
          });
          return mapVercelBlobToBlob(result);
        }
      };
    },
    /**
     * Vercel-specific multipart upload handler using @vercel/blob/client
     */
    async handleMultipartUpload(event, mpuOptions) {
      const body = await readBody(event);
      if (!body || typeof body.type !== "string") {
        throw createError({ statusCode: 400, message: "Invalid multipart upload request body" });
      }
      const json = await handleUpload({
        body,
        request: event.node.req,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const result = mpuOptions?.onBeforeGenerateToken ? mpuOptions?.onBeforeGenerateToken?.(pathname, clientPayload) : {};
          return { ...mpuOptions, ...result };
        },
        onUploadCompleted: mpuOptions?.onUploadCompleted || void 0
      });
      return json;
    }
  };
}

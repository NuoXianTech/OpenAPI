import defu from "defu";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { readonly, ref } from "vue";
import { useRuntimeConfig } from "#imports";
export function useMultipartUpload(baseURL, options) {
  const {
    partSize,
    concurrent,
    maxRetry,
    fetchOptions,
    prefix
  } = defu(options, {
    partSize: 10 * 1024 * 1024,
    // 10MB
    concurrent: 1,
    // no concurrent upload by default
    maxRetry: 3
  });
  const _fetch = ofetch.create({ baseURL, ...fetchOptions });
  const queryOptions = options?.fetchOptions?.query || {};
  const create = (file) => _fetch(prefix ? joinURL("/create", prefix, file.name) : joinURL("/create", file.name), {
    method: "POST",
    headers: {
      "x-nuxthub-file-content-type": file.type
    }
  });
  const upload = ({ partNumber, chunkBody }, { pathname, uploadId }) => _fetch(`/upload/${pathname}`, {
    method: "PUT",
    query: {
      ...queryOptions,
      uploadId,
      partNumber
    },
    body: chunkBody
  });
  const complete = (parts, { pathname, uploadId }) => _fetch(
    `/complete/${pathname}`,
    {
      method: "POST",
      query: {
        ...queryOptions,
        uploadId
      },
      body: { parts }
    }
  );
  const abort = async ({ pathname, uploadId }) => {
    await _fetch(`/abort/${pathname}`, {
      method: "DELETE",
      query: {
        ...queryOptions,
        uploadId
      }
    });
  };
  return (file) => {
    const data = create(file);
    const chunks = Math.ceil(file.size / partSize);
    const queue = Array.from({ length: chunks }, (_, i) => i + 1);
    const parts = [];
    const progress = ref(0);
    const errors = [];
    let canceled = false;
    const cancel = async () => {
      if (canceled) {
        return;
      }
      canceled = true;
      queue.splice(0, queue.length);
      if (abort) {
        await abort(await data);
      }
    };
    const prepare = (partNumber) => {
      const start2 = (partNumber - 1) * partSize;
      const end = Math.min(start2 + partSize, file.size);
      const chunkBody = file.slice(start2, end);
      return { partNumber, chunkBody };
    };
    const process = async (partNumber) => {
      const prepared = prepare(partNumber);
      try {
        const part = await upload(prepared, await data);
        progress.value = parts.length / chunks * 100;
        parts.push(part);
      } catch (e) {
        errors.push(e);
        queue.push(partNumber);
        if (errors.length >= maxRetry) {
          cancel();
          throw new Error("Upload failed");
        }
      }
      const next = queue.shift();
      if (next) {
        await process(next);
      }
    };
    const start = async () => {
      const hub = useRuntimeConfig().public.hub;
      if (hub.blobProvider === "vercel-blob") {
        return import("@vercel/blob/client").then(({ upload: upload2 }) => {
          return upload2(file.name, file, {
            access: "public",
            multipart: true,
            handleUploadUrl: joinURL(baseURL, "multipart", file.name || ""),
            onUploadProgress: (uploadProgress) => {
              progress.value = uploadProgress.percentage;
            }
          });
        });
      }
      try {
        await Promise.all(Array.from({ length: concurrent }).map(() => {
          const partNumber = queue.shift();
          if (partNumber) {
            return process(partNumber);
          }
        }));
      } catch (error) {
        return;
      }
      if (canceled || parts.length < chunks) {
        return;
      }
      return complete(parts, await data);
    };
    return {
      completed: start(),
      progress: readonly(progress),
      abort: cancel
    };
  };
}

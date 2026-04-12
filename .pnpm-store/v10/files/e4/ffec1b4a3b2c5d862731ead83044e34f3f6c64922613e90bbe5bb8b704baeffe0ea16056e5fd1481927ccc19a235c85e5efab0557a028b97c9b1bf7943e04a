import { createError } from "h3";
export function useUpload(apiBase, options = {}) {
  const { formKey = "files", multiple = true, method, ...fetchOptions } = options || {};
  async function upload(data) {
    let files = Array.isArray(data) ? data : [];
    if (String(data?.files).includes("FileList")) {
      files = Array.from(data.files);
    }
    if (data instanceof File) {
      files = [data];
    }
    if (typeof FileList !== "undefined" && data instanceof FileList) {
      files = Array.from(data);
    }
    if (!files || !files.length) {
      throw createError({ statusCode: 400, message: "Missing files" });
    }
    const formData = new FormData();
    if (multiple) {
      for (const file of files) {
        formData.append(formKey, file);
      }
    } else {
      formData.append(formKey, files[0]);
    }
    return $fetch(apiBase, {
      ...fetchOptions,
      method: method || "POST",
      body: formData
    }).then((result) => multiple === false || data instanceof File ? result[0] : result);
  }
  return upload;
}

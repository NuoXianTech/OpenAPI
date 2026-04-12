import type { FetchOptions } from 'ofetch';
import type { BlobObject } from '@nuxthub/core/blob';
interface UploadOptions extends FetchOptions {
    /**
     * The key to add the file/files to the request form.
     * @default 'files'
     */
    formKey?: string;
    /**
     * Whether to allow multiple files to be uploaded.
     * @default true
     */
    multiple?: boolean;
}
/**
 * Upload a file or files to the server using FormData.
 * @param apiBase the base URL of the API to handle the upload.
 * @param options the options to use for the upload.
 * @see https://hub.nuxt.com/docs/blob/upload#useupload
 */
export declare function useUpload(apiBase: string, options?: UploadOptions & {
    multiple: false;
}): (data: FileList | HTMLInputElement | File[] | File) => Promise<BlobObject>;
export declare function useUpload(apiBase: string, options?: UploadOptions): ((data: File) => Promise<BlobObject>) & ((data: FileList | HTMLInputElement | File[]) => Promise<BlobObject[]>);
export {};

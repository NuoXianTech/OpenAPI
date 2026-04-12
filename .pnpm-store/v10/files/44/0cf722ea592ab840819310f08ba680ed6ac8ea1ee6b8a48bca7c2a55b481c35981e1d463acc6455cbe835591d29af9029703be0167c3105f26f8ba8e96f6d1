import { type FetchOptions } from 'ofetch';
import { type Ref } from 'vue';
import type { SerializeObject } from 'nitropack';
import type { BlobObject } from '@nuxthub/core/blob';
/**
 * Create a multipart uploader.
 */
export declare function useMultipartUpload(baseURL: string, options?: UseMultipartUploadOptions): MultipartUploader;
export interface UseMultipartUploadOptions {
    /**
     * The size of each part of the file to be uploaded.
     * @default 10 * 1024 * 1024
     */
    partSize?: number;
    /**
     * The maximum number of concurrent uploads.
     * @default 1
     */
    concurrent?: number;
    /**
     * The maximum number of retry attempts for the whole upload.
     * @default 3
     */
    maxRetry?: number;
    /**
     * The prefix to use for the blob pathname.
     */
    prefix?: string;
    /**
     * Override the ofetch options.
     * The query and headers will be merged with the options provided by the uploader.
     */
    fetchOptions?: Omit<FetchOptions, 'method' | 'baseURL' | 'body' | 'parseResponse' | 'responseType'>;
}
export type MultipartUploader = (file: File) => {
    /**
     * The promise that resolves to the complete response or undefined if the upload is canceled or failed.
     */
    completed: Promise<SerializeObject<BlobObject> | undefined>;
    /**
     * The progress of the upload as a number between 0 and 100.
     */
    progress: Readonly<Ref<number>>;
    /**
     * Abort the upload.
     */
    abort: () => Promise<void>;
};

import { type ClientUploadedFileData } from "uploadthing/types";

export interface UploadedFile<T = unknown> extends ClientUploadedFileData<T> {}

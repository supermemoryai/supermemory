import { useFetcher } from "@remix-run/react";
import { useFetcherWithPromise } from "./use-fetcher-with-promise";

export function useUploadFile() {
	const fetcher = useFetcherWithPromise<{ url: string, error?: string }>();

	const uploadFile = async (file: File) => {
		const formData = new FormData();
		formData.append("file", file);
		formData.append("name", file.name);
		const response = await fetcher.submit(formData, {
			method: "post",
			action: "/action/upload",
			encType: "multipart/form-data",
		})

		return {
			url: response?.url,
			error: response?.error,
		};
	};

	const isUploading = fetcher.state === "submitting" || fetcher.state === "loading";

	return {
		uploadFile,
		isUploading,
		...fetcher,
	};
}

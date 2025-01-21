import type { NavigateFunction } from "@remix-run/react";

import { NotionIcon } from "../components/icons/IntegrationIcons";
import { getChromeExtensionId } from "./util";

export type IntegrationStatus = "idle" | "loading" | "success" | "error";

export interface IntegrationProgress {
	progress: number;
	message: string;
}

export interface IntegrationConfig {
	id: string;
	name: string;
	description: string;
	icon?: React.ComponentType<{ className?: string }>;
	buttonClassName?: string;
	iconClassName?: string;

	requiresChromeExtension?: {
		extensionId: string;
		installUrl?: string;
	};

	getAuthUrl?: (env: Record<string, string>) => string;
	handleConnection?: (env: Record<string, string>, navigate: NavigateFunction) => void;

	importData?: {
		url?: string;
		method?: "GET" | "POST";
		withCredentials?: boolean;
		parseProgress?: (data: any) => IntegrationProgress;
		onSuccess?: (navigate: NavigateFunction) => void;
		onError?: (error: Error) => void;
	};
}

export const getIntegrations = (
	env: Record<string, string>,
): Record<string, IntegrationConfig> => ({
	notion: {
		id: "notion",
		name: "Notion",
		description: "Import your Notion pages and databases",
		icon: NotionIcon,
		buttonClassName: "bg-neutral-800 hover:bg-neutral-700",
		iconClassName: "w-6 h-6",

		getAuthUrl: (env) => {
			const params = new URLSearchParams({
				client_id: env.NOTION_CLIENT_ID || "",
				redirect_uri:
					env.NODE_ENV === "development"
						? "http://localhost:3000/auth/notion/callback"
						: "https://supermemory.ai/auth/notion/callback",
				response_type: "code",
				owner: "user",
			});

			return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
		},

		importData: {
			url: `/backend/api/integrations/notion/import`,
			withCredentials: true,
			parseProgress: (data) => ({
				progress: data.progress,
				message: `Importing from Notion: ${data.progress}%`,
			}),
			onSuccess: (navigate) => {
				setTimeout(() => navigate("/"), 1500);
			},
		},
	},

	xBookmarks: {
		id: "xBookmarks",
		name: "X Bookmarks",
		description: "Import your saved tweets and threads",
		iconClassName: "w-6 h-6",
		buttonClassName: "bg-blue-500 hover:bg-blue-600",

		requiresChromeExtension: {
			extensionId: getChromeExtensionId(),
			installUrl:
				"https://chrome.google.com/webstore/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc",
		},

		handleConnection: async (env, navigate) => {
			console.log("Sending message to extension");
			console.log(window.chrome?.runtime);
			await window.chrome?.runtime.sendMessage(
				getChromeExtensionId(),
				{ action: "exportBookmarks" },
				(response: any) => {
					// Handle the response and show progress
					console.log("Response:", response);
				},
			);
			console.log("Message sent");
		},

		importData: {
			parseProgress: (data) => ({
				progress: data.progress,
				message: `Importing from X: ${data.progress}%`,
			}),
			onSuccess: (navigate) => {
				setTimeout(() => navigate("/bookmarks"), 1500);
			},
		},

		icon: (props) => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="1em"
				height="1em"
				fill="none"
				viewBox="0 0 1200 1227"
				{...props}
			>
				<path
					fill="currentColor"
					d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z"
				/>
			</svg>
		),
	},

	chromeBookmarks: {
		id: "chromeBookmarks",
		name: "Chrome Bookmarks",
		description: "Import your Chrome bookmarks",
		iconClassName: "w-6 h-6",
		buttonClassName: "bg-yellow-500 hover:bg-yellow-600",

		requiresChromeExtension: {
			extensionId: getChromeExtensionId(),
			installUrl:
				"https://chrome.google.com/webstore/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc",
		},

		handleConnection: (env, navigate) => {
			window.chrome?.runtime.sendMessage(
				getChromeExtensionId(),
				{ action: "importBookmarks" },
				(response: any) => {
					console.log("Response:", response);
				},
			);
		},

		importData: {
			parseProgress: (data) => ({
				progress: data.progress,
				message: `Importing Chrome bookmarks: ${data.progress}%`,
			}),
			onSuccess: (navigate) => {
				setTimeout(() => navigate("/bookmarks"), 1500);
			},
		},

		icon: (props) => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="1em"
				height="1em"
				viewBox="0 0 24 24"
				{...props}
			>
				<path
					fill="currentColor"
					d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
				/>
				<path
					fill="currentColor"
					d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
				/>
			</svg>
		),
	},

	iosShortcut: {
		id: "iosShortcut",
		name: "iOS Shortcut",
		description: "Import content using the iOS Shortcut",
		iconClassName: "w-6 h-6",
		buttonClassName: "bg-gray-500 hover:bg-gray-600",

		handleConnection: (env, navigate) => {
			window.location.href = "https://www.icloud.com/shortcuts/55f0695258cd46e4aad1aba8a2a7d14b";
		},

		icon: (props) => (
			<img src="https://imagedelivery.net/_Zs8NCbSWCQ8-iurXrWjBg/21434e3e-49ac-4a15-126d-175e95440300/public" alt="iOS Shortcut" {...props} />
		),
	},
});

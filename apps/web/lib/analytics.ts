import posthog from "posthog-js";

export const analytics = {
	userSignedOut: () => posthog.capture("user_signed_out"),
	tourStarted: () => posthog.capture("tour_started"),
	tourCompleted: () => posthog.capture("tour_completed"),
	tourSkipped: () => posthog.capture("tour_skipped"),

	memoryAdded: (props: {
		type: "note" | "link" | "file";
		project_id?: string;
		content_length?: number;
		file_size?: number;
		file_type?: string;
	}) => posthog.capture("memory_added", props),

	memoryDetailOpened: () => posthog.capture("memory_detail_opened"),

	projectCreated: () => posthog.capture("project_created"),

	newChatStarted: () => posthog.capture("new_chat_started"),
	chatHistoryViewed: () => posthog.capture("chat_history_viewed"),
	chatDeleted: () => posthog.capture("chat_deleted"),

	viewModeChanged: (mode: "graph" | "list") =>
		posthog.capture("view_mode_changed", { mode }),

	documentCardClicked: () => posthog.capture("document_card_clicked"),

	billingViewed: () => posthog.capture("billing_viewed"),
	upgradeInitiated: () => posthog.capture("upgrade_initiated"),
	upgradeCompleted: () => posthog.capture("upgrade_completed"),
	billingPortalOpened: () => posthog.capture("billing_portal_opened"),

	connectionAdded: (provider: string) =>
		posthog.capture("connection_added", { provider }),
	connectionDeleted: () => posthog.capture("connection_deleted"),
	connectionAuthStarted: () => posthog.capture("connection_auth_started"),
	connectionAuthCompleted: () => posthog.capture("connection_auth_completed"),
	connectionAuthFailed: () => posthog.capture("connection_auth_failed"),

	mcpViewOpened: () => posthog.capture("mcp_view_opened"),
	mcpInstallCmdCopied: () => posthog.capture("mcp_install_cmd_copied"),
};

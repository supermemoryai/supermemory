import posthog from "posthog-js"

export const analytics = {
	userSignedOut: () => posthog.capture("user_signed_out"),

	memoryAdded: (props: {
		type: "note" | "link" | "file"
		project_id?: string
		content_length?: number
		file_size?: number
		file_type?: string
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

	extensionInstallClicked: () => posthog.capture("extension_install_clicked"),

	temporalFilterVisibilityChanged: (visible: boolean, hasFilters: boolean) =>
		posthog.capture("temporal_filter_enabled", {
			visible,
			has_active_filters: hasFilters,
		}),
	temporalAsOfSet: (isoTimestamp: string | null) =>
		posthog.capture("temporal_as_of_set", {
			as_of: isoTimestamp,
		}),
	temporalWindowSet: (from: string | null, to: string | null) =>
		posthog.capture("temporal_window_set", {
			valid_from_gte: from,
			valid_until_lte: to,
		}),
}

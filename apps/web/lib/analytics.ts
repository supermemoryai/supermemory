import posthog from "posthog-js"

// Helper function to safely capture events
const safeCapture = (eventName: string, properties?: Record<string, any>) => {
    if (posthog.__loaded) {
        posthog.capture(eventName, properties)
    }
}

export const analytics = {
	userSignedOut: () => safeCapture("user_signed_out"),

	memoryAdded: (props: {
		type: "note" | "link" | "file"
		project_id?: string
		content_length?: number
		file_size?: number
		file_type?: string
	}) => safeCapture("memory_added", props),

	memoryDetailOpened: () => safeCapture("memory_detail_opened"),

	projectCreated: () => safeCapture("project_created"),

	newChatStarted: () => safeCapture("new_chat_started"),
	chatHistoryViewed: () => safeCapture("chat_history_viewed"),
	chatDeleted: () => safeCapture("chat_deleted"),

	viewModeChanged: (mode: "graph" | "list") =>
		safeCapture("view_mode_changed", { mode }),

	documentCardClicked: () => safeCapture("document_card_clicked"),

	billingViewed: () => safeCapture("billing_viewed"),
	upgradeInitiated: () => safeCapture("upgrade_initiated"),
	upgradeCompleted: () => safeCapture("upgrade_completed"),
	billingPortalOpened: () => safeCapture("billing_portal_opened"),

	connectionAdded: (provider: string) =>
		safeCapture("connection_added", { provider }),
	connectionDeleted: () => safeCapture("connection_deleted"),
	connectionAuthStarted: () => safeCapture("connection_auth_started"),
	connectionAuthCompleted: () => safeCapture("connection_auth_completed"),
	connectionAuthFailed: () => safeCapture("connection_auth_failed"),

	mcpViewOpened: () => safeCapture("mcp_view_opened"),
	mcpInstallCmdCopied: () => safeCapture("mcp_install_cmd_copied"),

	extensionInstallClicked: () => safeCapture("extension_install_clicked"),
}

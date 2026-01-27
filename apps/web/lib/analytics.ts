import posthog from "posthog-js"

// Helper function to safely capture events
const safeCapture = (
	eventName: string,
	properties?: Record<string, unknown>,
) => {
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

	// nova analytics
	documentAdded: (props: {
		type: "note" | "link" | "file" | "connect"
		project_id?: string
	}) => safeCapture("document_added", props),

	newChatCreated: () => safeCapture("new_chat_created"),

	mcpModalOpened: () => safeCapture("mcp_modal_opened"),

	addDocumentModalOpened: () => safeCapture("add_document_modal_opened"),

	// onboarding analytics
	onboardingStepViewed: (props: { step: string; trigger: "user" | "auto" }) =>
		safeCapture("onboarding_step_viewed", props),

	onboardingNameSubmitted: (props: { name_length: number }) =>
		safeCapture("onboarding_name_submitted", props),

	onboardingProfileSubmitted: (props: {
		has_twitter: boolean
		has_linkedin: boolean
		other_links_count: number
		description_length: number
	}) => safeCapture("onboarding_profile_submitted", props),

	onboardingRelatableSelected: (props: { options: string[] }) =>
		safeCapture("onboarding_relatable_selected", props),

	onboardingIntegrationClicked: (props: { integration: string }) =>
		safeCapture("onboarding_integration_clicked", props),

	onboardingChromeExtensionClicked: (props: {
		source: "onboarding" | "settings"
	}) => safeCapture("onboarding_chrome_extension_clicked", props),

	onboardingMcpDetailOpened: () => safeCapture("onboarding_mcp_detail_opened"),

	onboardingXBookmarksDetailOpened: () =>
		safeCapture("onboarding_x_bookmarks_detail_opened"),

	onboardingCompleted: () => safeCapture("onboarding_completed"),

	// main app analytics
	searchOpened: (props: {
		source: "hotkey" | "header" | "highlight_related"
	}) => safeCapture("search_opened", props),

	documentModalOpened: (props: { document_id: string }) =>
		safeCapture("document_modal_opened", props),

	fullscreenNoteModalOpened: () => safeCapture("fullscreen_note_modal_opened"),

	highlightClicked: (props: {
		highlight_id: string
		action: "chat" | "related"
	}) => safeCapture("highlight_clicked", props),

	// chat analytics
	chatMessageSent: (props: {
		source: "typed" | "suggested" | "highlight" | "follow_up"
	}) => safeCapture("chat_message_sent", props),

	chatFollowUpClicked: (props: { thread_id?: string }) =>
		safeCapture("chat_follow_up_clicked", props),

	chatSuggestedQuestionClicked: () =>
		safeCapture("chat_suggested_question_clicked"),

	chatMessageLiked: (props: { message_id: string }) =>
		safeCapture("chat_message_liked", props),

	chatMessageDisliked: (props: { message_id: string }) =>
		safeCapture("chat_message_disliked", props),

	chatMessageCopied: (props: { message_id: string }) =>
		safeCapture("chat_message_copied", props),

	chatMemoryExpanded: (props: { message_id: string }) =>
		safeCapture("chat_memory_expanded", props),

	chatMemoryCollapsed: (props: { message_id: string }) =>
		safeCapture("chat_memory_collapsed", props),

	chatThreadLoaded: (props: { thread_id: string }) =>
		safeCapture("chat_thread_loaded", props),

	chatThreadDeleted: (props: { thread_id: string }) =>
		safeCapture("chat_thread_deleted", props),

	modelChanged: (props: { model: string }) =>
		safeCapture("model_changed", props),

	// settings / spaces / docs analytics
	settingsTabChanged: (props: {
		tab: "account" | "integrations" | "connections" | "support"
	}) => safeCapture("settings_tab_changed", props),

	spaceCreated: () => safeCapture("space_created"),

	spaceSwitched: (props: { space_id: string }) =>
		safeCapture("space_switched", props),

	quickNoteCreated: () => safeCapture("quick_note_created"),

	quickNoteEdited: () => safeCapture("quick_note_edited"),

	documentDeleted: (props: { document_id: string }) =>
		safeCapture("document_deleted", props),

	documentEdited: (props: { document_id: string }) =>
		safeCapture("document_edited", props),
}

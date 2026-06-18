import posthog from "posthog-js"

export type OnboardingStep = "profile_input" | "processing" | "done" | "error"
export type OnboardingSource = "x" | "linkedin" | "resume"

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

	viewModeChanged: (
		mode: "dashboard" | "graph" | "list" | "integrations" | "chat" | "digests",
	) => safeCapture("view_mode_changed", { mode }),

	documentCardClicked: () => safeCapture("document_card_clicked"),

	billingViewed: () => safeCapture("billing_viewed"),
	upgradeInitiated: () => safeCapture("upgrade_initiated"),
	upgradeCompleted: () => safeCapture("upgrade_completed"),
	billingPortalOpened: () => safeCapture("billing_portal_opened"),

	connectionDeleted: () => safeCapture("connection_deleted"),
	connectionAuthStarted: (props: { provider: string }) =>
		safeCapture("connection_auth_started", props),

	// integrations surface (main Nova page)
	integrationCardClicked: (props: { kind: string; id: string; name: string }) =>
		safeCapture("integration_card_clicked", props),
	integrationInfoModalClosed: (props: {
		kind: string
		id: string
		name: string
		close_reason: "dismiss" | "close_button" | "im_good" | "action"
	}) => safeCapture("integration_info_modal_closed", props),

	nextAppResearchCtaDismissed: () =>
		safeCapture("next_app_research_cta_dismissed"),
	nextAppResearchCtaBookCallClicked: () =>
		safeCapture("next_app_research_cta_book_call_clicked"),
	nextAppResearchCtaLobbysideCallClicked: () =>
		safeCapture("next_app_research_cta_lobbyside_call_clicked"),

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
	onboardingStepViewed: (props: {
		step: OnboardingStep
		trigger: "user" | "auto"
	}) => safeCapture("onboarding_step_viewed", props),

	onboardingProfileSubmitted: (props: { source: OnboardingSource }) =>
		safeCapture("onboarding_profile_submitted", props),

	onboardingIntegrationClicked: (props: { integration: string }) =>
		safeCapture("onboarding_integration_clicked", props),

	onboardingChromeExtensionClicked: (props: {
		source: "onboarding" | "settings" | "integrations"
	}) => safeCapture("onboarding_chrome_extension_clicked", props),

	onboardingMcpDetailOpened: () => safeCapture("onboarding_mcp_detail_opened"),

	onboardingXBookmarksDetailOpened: () =>
		safeCapture("onboarding_x_bookmarks_detail_opened"),

	onboardingSkipped: (props: { from_step: OnboardingStep }) =>
		safeCapture("onboarding_skipped", props),

	onboardingCompleted: (props?: {
		source?: OnboardingSource
		memories_count?: number
	}) => safeCapture("onboarding_completed", props),

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
		source: "typed" | "suggested" | "highlight" | "home"
		attachment_count?: number
		saved_attachment_count?: number
		temporary_attachment_count?: number
	}) => safeCapture("chat_message_sent", props),

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
		tab: "account" | "billing" | "integrations" | "connections" | "support"
	}) => safeCapture("settings_tab_changed", props),

	spaceCreated: () => safeCapture("space_created"),

	spaceSwitched: (props: { space_id: string }) =>
		safeCapture("space_switched", props),

	quickNoteCreated: () => safeCapture("quick_note_created"),

	quickNoteEdited: () => safeCapture("quick_note_edited"),

	documentDeleted: (props: { document_id: string }) =>
		safeCapture("document_deleted", props),

	documentsBulkDeleted: (props: { count: number }) =>
		safeCapture("documents_bulk_deleted", props),

	documentEdited: (props: { document_id: string }) =>
		safeCapture("document_edited", props),

	// weekly digest
	digestViewed: (props: { digest_id: string; iso_week: string }) =>
		safeCapture("digest_viewed", props),
	digestFeedback: (props: {
		digest_id: string
		iso_week: string
		rating: "up" | "down"
	}) => safeCapture("digest_feedback", props),
	digestFeedbackDetail: (props: {
		digest_id: string
		iso_week: string
		rating: "up" | "down" | null
		message: string
	}) => safeCapture("digest_feedback_detail", props),
}

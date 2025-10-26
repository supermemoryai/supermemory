"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useSession } from "./auth"
import { usePostHog } from "./posthog"

export function useErrorTracking() {
	const posthog = usePostHog()
	const { data: session } = useSession()
	const pathname = usePathname()

	const trackError = (
		error: Error | unknown,
		context?: Record<string, any>,
	) => {
		if (!posthog.__loaded) return
		const errorDetails = {
			error_message: error instanceof Error ? error.message : String(error),
			error_stack: error instanceof Error ? error.stack : undefined,
			error_name: error instanceof Error ? error.name : "Unknown",
			pathname,
			user_id: session?.user?.id,
			user_email: session?.user?.email,
			timestamp: new Date().toISOString(),
			...context,
		}

		posthog.capture("error_occurred", errorDetails)
	}

	const trackApiError = (
		error: Error | unknown,
		endpoint: string,
		method: string,
	) => {
		trackError(error, {
			error_type: "api_error",
			api_endpoint: endpoint,
			api_method: method,
		})
	}

	const trackComponentError = (
		error: Error | unknown,
		componentName: string,
	) => {
		trackError(error, {
			error_type: "component_error",
			component_name: componentName,
		})
	}

	const trackValidationError = (
		error: Error | unknown,
		formName: string,
		field?: string,
	) => {
		trackError(error, {
			error_type: "validation_error",
			form_name: formName,
			field_name: field,
		})
	}

	return {
		trackError,
		trackApiError,
		trackComponentError,
		trackValidationError,
	}
}

// Global error boundary component
export function ErrorTrackingProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const { trackError } = useErrorTracking()

	useEffect(() => {
		// Global error handler for unhandled errors
		const handleError = (event: ErrorEvent) => {
			trackError(event.error, {
				error_type: "global_error",
				source: "window_error",
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
			})
		}

		// Global handler for unhandled promise rejections
		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			trackError(event.reason, {
				error_type: "unhandled_promise_rejection",
				source: "promise_rejection",
			})
		}

		window.addEventListener("error", handleError)
		window.addEventListener("unhandledrejection", handleUnhandledRejection)

		return () => {
			window.removeEventListener("error", handleError)
			window.removeEventListener("unhandledrejection", handleUnhandledRejection)
		}
	}, [trackError])

	return <>{children}</>
}

// Hook for tracking user interactions
export function useInteractionTracking() {
	const posthog = usePostHog()
	const { data: session } = useSession()
	const pathname = usePathname()

	const trackInteraction = (action: string, details?: Record<string, any>) => {
		if (!posthog.__loaded) return
		posthog.capture("user_interaction", {
			action,
			pathname,
			user_id: session?.user?.id,
			timestamp: new Date().toISOString(),
			...details,
		})
	}

	const trackFormSubmission = (
		formName: string,
		success: boolean,
		details?: Record<string, any>,
	) => {
		if (!posthog.__loaded) return
		posthog.capture("form_submission", {
			form_name: formName,
			success,
			pathname,
			user_id: session?.user?.id,
			timestamp: new Date().toISOString(),
			...details,
		})
	}

	const trackButtonClick = (buttonName: string, context?: string) => {
		trackInteraction("button_click", {
			button_name: buttonName,
			context,
		})
	}

	const trackLinkClick = (
		url: string,
		linkText?: string,
		external?: boolean,
	) => {
		trackInteraction("link_click", {
			url,
			link_text: linkText,
			external,
		})
	}

	const trackModalOpen = (modalName: string) => {
		trackInteraction("modal_open", {
			modal_name: modalName,
		})
	}

	const trackModalClose = (modalName: string) => {
		trackInteraction("modal_close", {
			modal_name: modalName,
		})
	}

	const trackTabChange = (fromTab: string, toTab: string) => {
		trackInteraction("tab_change", {
			from_tab: fromTab,
			to_tab: toTab,
		})
	}

	return {
		trackInteraction,
		trackFormSubmission,
		trackButtonClick,
		trackLinkClick,
		trackModalOpen,
		trackModalClose,
		trackTabChange,
	}
}

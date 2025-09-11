/**
 * Route Detection Utilities
 * Shared logic for detecting route changes across different AI chat platforms
 */

import { UI_CONFIG } from "./constants"

export interface RouteDetectionConfig {
	platform: string
	selectors: string[]
	reinitCallback: () => void
	checkInterval?: number
	observerThrottleDelay?: number
}

export interface RouteDetectionCleanup {
	observer: MutationObserver | null
	urlCheckInterval: NodeJS.Timeout | null
	observerThrottle: NodeJS.Timeout | null
}

export function createRouteDetection(
	config: RouteDetectionConfig,
	cleanup: RouteDetectionCleanup,
): void {
	if (cleanup.observer) {
		cleanup.observer.disconnect()
	}
	if (cleanup.urlCheckInterval) {
		clearInterval(cleanup.urlCheckInterval)
	}
	if (cleanup.observerThrottle) {
		clearTimeout(cleanup.observerThrottle)
		cleanup.observerThrottle = null
	}

	let currentUrl = window.location.href

	const checkForRouteChange = () => {
		if (window.location.href !== currentUrl) {
			currentUrl = window.location.href
			console.log(`${config.platform} route changed, re-initializing`)
			setTimeout(config.reinitCallback, 1000)
		}
	}

	cleanup.urlCheckInterval = setInterval(
		checkForRouteChange,
		config.checkInterval || UI_CONFIG.ROUTE_CHECK_INTERVAL,
	)

	cleanup.observer = new MutationObserver((mutations) => {
		if (cleanup.observerThrottle) {
			return
		}

		let shouldRecheck = false
		mutations.forEach((mutation) => {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType === Node.ELEMENT_NODE) {
						const element = node as Element

						for (const selector of config.selectors) {
							if (
								element.querySelector?.(selector) ||
								element.matches?.(selector)
							) {
								shouldRecheck = true
								break
							}
						}
					}
				})
			}
		})

		if (shouldRecheck) {
			cleanup.observerThrottle = setTimeout(() => {
				try {
					cleanup.observerThrottle = null
					config.reinitCallback()
				} catch (error) {
					console.error(`Error in ${config.platform} observer callback:`, error)
				}
			}, config.observerThrottleDelay || UI_CONFIG.OBSERVER_THROTTLE_DELAY)
		}
	})

	try {
		cleanup.observer.observe(document.body, {
			childList: true,
			subtree: true,
		})
	} catch (error) {
		console.error(`Failed to set up ${config.platform} route observer:`, error)
		if (cleanup.urlCheckInterval) {
			clearInterval(cleanup.urlCheckInterval)
		}
		cleanup.urlCheckInterval = setInterval(checkForRouteChange, 1000)
	}
}

export function cleanupRouteDetection(cleanup: RouteDetectionCleanup): void {
	if (cleanup.observer) {
		cleanup.observer.disconnect()
		cleanup.observer = null
	}
	if (cleanup.urlCheckInterval) {
		clearInterval(cleanup.urlCheckInterval)
		cleanup.urlCheckInterval = null
	}
	if (cleanup.observerThrottle) {
		clearTimeout(cleanup.observerThrottle)
		cleanup.observerThrottle = null
	}
}

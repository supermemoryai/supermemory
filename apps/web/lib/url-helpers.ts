/**
 * Validates if a string is a valid URL.
 */
export const isValidUrl = (url: string): boolean => {
	try {
		new URL(url)
		return true
	} catch {
		return false
	}
}

/**
 * Normalizes a URL by adding https:// prefix if missing.
 */
export const normalizeUrl = (url: string): string => {
	if (!url.trim()) return ""
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url
	}
	return `https://${url}`
}

/**
 * Checks if a URL is a Twitter/X URL.
 */
export const isTwitterUrl = (url: string): boolean => {
	const normalizedUrl = url.toLowerCase()
	return (
		normalizedUrl.includes("twitter.com") || normalizedUrl.includes("x.com")
	)
}

/**
 * Checks if a URL is a LinkedIn profile URL (not a company page).
 */
export const isLinkedInProfileUrl = (url: string): boolean => {
	const normalizedUrl = url.toLowerCase()
	return (
		normalizedUrl.includes("linkedin.com/in/") &&
		!normalizedUrl.includes("linkedin.com/company/")
	)
}

/**
 * Collects and validates URLs from LinkedIn profile and other links, excluding Twitter.
 */
export const collectValidUrls = (
	linkedinProfile: string,
	otherLinks: string[],
): string[] => {
	const urls: string[] = []

	if (linkedinProfile.trim()) {
		const normalizedLinkedIn = normalizeUrl(linkedinProfile.trim())
		if (
			isValidUrl(normalizedLinkedIn) &&
			isLinkedInProfileUrl(normalizedLinkedIn)
		) {
			urls.push(normalizedLinkedIn)
		}
	}

	otherLinks
		.filter((link) => link.trim())
		.forEach((link) => {
			const normalizedLink = normalizeUrl(link.trim())
			if (isValidUrl(normalizedLink) && !isTwitterUrl(normalizedLink)) {
				urls.push(normalizedLink)
			}
		})

	return urls
}

/**
 * Extracts X/Twitter handle from various input formats (URLs, handles with @, etc.).
 */
export function parseXHandle(input: string): string {
	if (!input.trim()) return ""

	let value = input.trim()

	if (value.startsWith("@")) {
		value = value.slice(1)
	}

	const lowerValue = value.toLowerCase()
	if (lowerValue.includes("x.com") || lowerValue.includes("twitter.com")) {
		try {
			let url: URL
			if (value.startsWith("http://") || value.startsWith("https://")) {
				url = new URL(value)
			} else {
				url = new URL(`https://${value}`)
			}

			const pathSegments = url.pathname.split("/").filter(Boolean)
			if (pathSegments.length > 0) {
				const firstSegment = pathSegments[0]
				if (firstSegment && firstSegment !== "status" && firstSegment !== "i") {
					return firstSegment
				}
			}
		} catch {
			const match = value.match(/(?:x\.com|twitter\.com)\/([^/\s?#]+)/i)
			const handle = match?.[1]
			if (handle && handle !== "status") {
				return handle
			}
		}
	}

	if (
		value.includes("/") &&
		!lowerValue.includes("x.com") &&
		!lowerValue.includes("twitter.com")
	) {
		const parts = value.split("/").filter(Boolean)
		const firstPart = parts[0]
		if (firstPart) {
			return firstPart
		}
	}

	return value
}

/**
 * Extracts LinkedIn handle from various input formats (URLs, handles with @, etc.).
 */
export function parseLinkedInHandle(input: string): string {
	if (!input.trim()) return ""

	let value = input.trim()

	if (value.startsWith("@")) {
		value = value.slice(1)
	}

	const lowerValue = value.toLowerCase()
	if (lowerValue.includes("linkedin.com")) {
		try {
			let url: URL
			if (value.startsWith("http://") || value.startsWith("https://")) {
				url = new URL(value)
			} else {
				url = new URL(`https://${value}`)
			}

			const pathMatch = url.pathname.match(/\/(in|pub)\/([^/\s?#]+)/i)
			const handle = pathMatch?.[2]
			if (handle) {
				return handle
			}
		} catch {
			const match = value.match(/linkedin\.com\/(?:in|pub)\/([^/\s?#]+)/i)
			const handle = match?.[1]
			if (handle) {
				return handle
			}
		}
	}

	if (value.includes("/in/") || value.includes("/pub/")) {
		const match = value.match(/\/(?:in|pub)\/([^/\s?#]+)/i)
		const handle = match?.[1]
		if (handle) {
			return handle
		}
	}

	return value
}

/**
 * Converts X/Twitter handle to full profile URL.
 */
export function toXProfileUrl(handle: string): string {
	if (!handle.trim()) return ""
	return `https://x.com/${handle.trim()}`
}

/**
 * Converts LinkedIn handle to full profile URL.
 */
export function toLinkedInProfileUrl(handle: string): string {
	if (!handle.trim()) return ""
	return `https://linkedin.com/in/${handle.trim()}`
}

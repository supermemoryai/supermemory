export const isValidUrl = (url: string): boolean => {
	try {
		new URL(url)
		return true
	} catch {
		return false
	}
}

export const normalizeUrl = (url: string): string => {
	if (!url.trim()) return ""
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url
	}
	return `https://${url}`
}

export const isTwitterUrl = (url: string): boolean => {
	const normalizedUrl = url.toLowerCase()
	return (
		normalizedUrl.includes("twitter.com") || normalizedUrl.includes("x.com")
	)
}

export const isLinkedInProfileUrl = (url: string): boolean => {
	const normalizedUrl = url.toLowerCase()
	return (
		normalizedUrl.includes("linkedin.com/in/") &&
		!normalizedUrl.includes("linkedin.com/company/")
	)
}

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

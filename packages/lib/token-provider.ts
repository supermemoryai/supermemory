export type TokenProvider = () => Promise<string | null>

let tokenProvider: TokenProvider = async () => null

export function setTokenProvider(provider: TokenProvider) {
	tokenProvider = provider
}

export function getAuthToken() {
	return tokenProvider()
}

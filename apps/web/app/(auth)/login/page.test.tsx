import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { GlobalWindow } from "happy-dom"
import React from "react"

const browserWindow = new GlobalWindow({
	url: "https://app.supermemory.ai/login",
})

Object.assign(globalThis, {
	HTMLElement: browserWindow.HTMLElement,
	MutationObserver: browserWindow.MutationObserver,
	Node: browserWindow.Node,
	document: browserWindow.document,
	getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
	localStorage: browserWindow.localStorage,
	navigator: browserWindow.navigator,
	window: browserWindow,
})

type SignInResult = {
	data: unknown
	error: unknown
}

type SignInOptions = Record<string, unknown>
type SignInImplementation = (options: SignInOptions) => Promise<SignInResult>

const successResult: SignInResult = {
	data: { redirect: true, url: "https://accounts.example.com" },
	error: null,
}

let socialImplementation: SignInImplementation = async () => successResult
let oauth2Implementation: SignInImplementation = async () => successResult

const socialSignIn = mock((options: SignInOptions) =>
	socialImplementation(options),
)
const oauth2SignIn = mock((options: SignInOptions) =>
	oauth2Implementation(options),
)
const capture = mock(() => {})

mock.module("@lib/auth", () => ({
	signIn: {
		email: mock(async () => successResult),
		magicLink: mock(async () => successResult),
		oauth2: oauth2SignIn,
		social: socialSignIn,
	},
	useSession: () => ({ data: null, isPending: false }),
}))

mock.module("@lib/posthog", () => ({
	usePostHog: () => ({ capture }),
}))

mock.module("next/navigation", () => ({
	useRouter: () => ({ push: mock(() => {}) }),
	useSearchParams: () => new URLSearchParams(),
}))

mock.module("motion/react", () => ({
	motion: {
		div: ({
			animate: _animate,
			children,
			initial: _initial,
			transition: _transition,
			...props
		}: React.ComponentProps<"div"> & {
			animate?: unknown
			initial?: unknown
			transition?: unknown
		}) => React.createElement("div", props, children),
	},
}))

mock.module("@/components/initial-header", () => ({
	InitialHeader: () => React.createElement("header"),
}))

mock.module("@/components/login-tools-panel", () => ({
	LoginToolsPanel: () => React.createElement("aside"),
}))

mock.module("@/lib/fonts", () => ({
	dmSansClassName: () => "",
}))

process.env.NEXT_PUBLIC_HOST_ID = "supermemory"

const { act, cleanup, fireEvent, render, screen } = await import(
	"@testing-library/react"
)
const LoginPage = (await import("./page")).default

const pendingMethodKey = "supermemory-pending-login-method"
const pendingTimestampKey = "supermemory-pending-login-timestamp"

function renderLoginPage() {
	return render(React.createElement(LoginPage))
}

beforeEach(() => {
	browserWindow.localStorage.clear()
	socialSignIn.mockClear()
	oauth2SignIn.mockClear()
	capture.mockClear()
	socialImplementation = async () => successResult
	oauth2Implementation = async () => successResult
})

afterEach(() => {
	cleanup()
})

describe("external provider sign-in", () => {
	const providerCases = [
		{
			buttonName: "Continue with Google",
			expectedOptions: { provider: "google" },
			label: "Google",
			method: "google",
			useOauth2: false,
		},
		{
			buttonName: "Continue with Github",
			expectedOptions: { provider: "github" },
			label: "GitHub",
			method: "github",
			useOauth2: false,
		},
		{
			buttonName: "Continue with AgentID",
			expectedOptions: { providerId: "agentid" },
			label: "AgentID",
			method: "agentid",
			useOauth2: true,
		},
	] as const

	for (const providerCase of providerCases) {
		test(`handles a fulfilled ${providerCase.label} error`, async () => {
			const providerError = {
				message: `${providerCase.label} is temporarily unavailable`,
				status: 503,
				statusText: "Service Unavailable",
			}
			const implementation: SignInImplementation = async () => ({
				data: null,
				error: providerError,
			})

			if (providerCase.useOauth2) {
				oauth2Implementation = implementation
			} else {
				socialImplementation = implementation
			}

			renderLoginPage()
			fireEvent.click(
				screen.getByRole("button", {
					name: new RegExp(providerCase.buttonName, "i"),
				}),
			)

			const alert = await screen.findByText(providerError.message)
			expect(alert.getAttribute("role")).toBe("alert")
			expect(screen.queryByText(/Redirecting/)).toBeNull()
			expect(browserWindow.localStorage.getItem(pendingMethodKey)).toBeNull()
			expect(browserWindow.localStorage.getItem(pendingTimestampKey)).toBeNull()

			const providerSignIn = providerCase.useOauth2
				? oauth2SignIn
				: socialSignIn
			expect(providerSignIn).toHaveBeenCalledTimes(1)
			expect(providerSignIn.mock.calls[0]?.[0]).toMatchObject({
				callbackURL: "https://app.supermemory.ai/?extension-auth-success=true",
				...providerCase.expectedOptions,
			})
		})
	}

	const fulfilledNetworkCases = [
		{
			buttonName: "Continue with Google",
			label: "Google social",
			useOauth2: false,
		},
		{
			buttonName: "Continue with AgentID",
			label: "AgentID OAuth2",
			useOauth2: true,
		},
	] as const

	for (const networkCase of fulfilledNetworkCases) {
		test(`normalizes a fulfilled status-0 ${networkCase.label} error`, async () => {
			const implementation: SignInImplementation = async () => ({
				data: null,
				error: { status: 0, statusText: "" },
			})

			if (networkCase.useOauth2) {
				oauth2Implementation = implementation
			} else {
				socialImplementation = implementation
			}

			renderLoginPage()
			const button = screen.getByRole("button", {
				name: new RegExp(networkCase.buttonName, "i"),
			})
			fireEvent.click(button)

			const alert = await screen.findByText(
				"Network error. Please check your connection and try again.",
			)
			expect(alert.getAttribute("role")).toBe("alert")
			expect(screen.queryByText(/Redirecting/)).toBeNull()
			expect(button.hasAttribute("disabled")).toBe(false)
			expect(browserWindow.localStorage.getItem(pendingMethodKey)).toBeNull()
			expect(browserWindow.localStorage.getItem(pendingTimestampKey)).toBeNull()

			const providerSignIn = networkCase.useOauth2 ? oauth2SignIn : socialSignIn
			expect(providerSignIn).toHaveBeenCalledTimes(1)
		})
	}

	test("keeps a nonzero provider error whose message looks network-like", async () => {
		const providerMessage = "Failed to fetch GitHub account details"
		socialImplementation = async () => ({
			data: null,
			error: {
				message: providerMessage,
				status: 503,
				statusText: "Service Unavailable",
			},
		})

		renderLoginPage()
		const button = screen.getByRole("button", {
			name: /Continue with Github/i,
		})
		fireEvent.click(button)

		const alert = await screen.findByText(providerMessage)
		expect(alert.getAttribute("role")).toBe("alert")
		expect(
			screen.queryByText(
				"Network error. Please check your connection and try again.",
			),
		).toBeNull()
		expect(button.hasAttribute("disabled")).toBe(false)
		expect(browserWindow.localStorage.getItem(pendingMethodKey)).toBeNull()
		expect(browserWindow.localStorage.getItem(pendingTimestampKey)).toBeNull()
	})

	test("normalizes a rejected network error and clears pending state", async () => {
		socialImplementation = async () => {
			throw new TypeError("Failed to fetch")
		}

		renderLoginPage()
		fireEvent.click(
			screen.getByRole("button", { name: /Continue with Google/i }),
		)

		const alert = await screen.findByText(
			"Network error. Please check your connection and try again.",
		)
		expect(alert.getAttribute("role")).toBe("alert")
		expect(screen.queryByText(/Redirecting/)).toBeNull()
		expect(browserWindow.localStorage.getItem(pendingMethodKey)).toBeNull()
		expect(browserWindow.localStorage.getItem(pendingTimestampKey)).toBeNull()
	})

	test("keeps loading and pending state after a successful handoff", async () => {
		let resolveSignIn: ((result: SignInResult) => void) | undefined
		socialImplementation = () =>
			new Promise((resolve) => {
				resolveSignIn = resolve
			})

		renderLoginPage()
		fireEvent.click(
			screen.getByRole("button", { name: /Continue with Google/i }),
		)

		expect(await screen.findByText(/Redirecting/)).toBeTruthy()
		expect(browserWindow.localStorage.getItem(pendingMethodKey)).toBe("google")
		expect(browserWindow.localStorage.getItem(pendingTimestampKey)).toMatch(
			/^\d+$/,
		)

		await act(async () => {
			resolveSignIn?.(successResult)
			await Promise.resolve()
		})

		expect(screen.getByText(/Redirecting/)).toBeTruthy()
		expect(browserWindow.localStorage.getItem(pendingMethodKey)).toBe("google")
		expect(browserWindow.localStorage.getItem(pendingTimestampKey)).toMatch(
			/^\d+$/,
		)
	})
})

import assert from "node:assert/strict"
import { mock } from "bun:test"

function RaycastComponent() {
	return null
}

const stateUpdates: unknown[] = []
const effects: Array<() => undefined | (() => void)> = []
let resolveSelectedText!: (value: string) => void
const selectedText = new Promise<string>((resolve) => {
	resolveSelectedText = resolve
})
const List = Object.assign(RaycastComponent, {
	EmptyView: RaycastComponent,
	Item: RaycastComponent,
})
const Action = Object.assign(RaycastComponent, {
	CopyToClipboard: RaycastComponent,
	OpenInBrowser: RaycastComponent,
	Push: RaycastComponent,
})
const jsx = (type: unknown, props: Record<string, unknown>) => ({ props, type })

mock.module("react", () => ({
	useEffect(effect: () => undefined | (() => void)) {
		effects.push(effect)
	},
	useRef<T>(initialValue: T) {
		return { current: initialValue }
	},
	useState<T>(initialValue: T) {
		return [
			initialValue,
			(value: T) => {
				stateUpdates.push(value)
			},
		] as const
	},
}))
mock.module("react/jsx-runtime", () => ({
	Fragment: Symbol.for("react.fragment"),
	jsx,
	jsxs: jsx,
}))
mock.module("react/jsx-dev-runtime", () => ({
	Fragment: Symbol.for("react.fragment"),
	jsxDEV: jsx,
}))
mock.module("@raycast/api", () => ({
	Action,
	ActionPanel: RaycastComponent,
	Detail: RaycastComponent,
	getPreferenceValues: () => ({ apiKey: "test-key" }),
	getSelectedText: () => selectedText,
	Icon: {
		Document: "document",
		ExclamationMark: "exclamation-mark",
		Eye: "eye",
		Gear: "gear",
		Link: "link",
		MagnifyingGlass: "magnifying-glass",
	},
	List,
	openExtensionPreferences: () => undefined,
	showToast: async () => undefined,
	Toast: { Style: { Success: "success" } },
}))
mock.module("@raycast/utils", () => ({
	usePromise: () => ({ data: [], isLoading: false }),
}))

const { Command } = await import("../../src/search-memories")
const rendered = Command() as unknown as {
	props: {
		onSearchTextChange: (value: string) => void
		throttle?: boolean
	}
	type: unknown
}
const cleanups = effects.map((effect) => effect())

try {
	assert.equal(rendered.type, List)
	let deliverThrottledChange: (() => void) | undefined
	const deliverChange = () => rendered.props.onSearchTextChange("typed text")
	if (rendered.props.throttle) {
		deliverThrottledChange = deliverChange
	} else {
		deliverChange()
	}

	resolveSelectedText("selected text")
	await Promise.resolve()
	await Promise.resolve()

	assert.equal(rendered.props.throttle, false)
	assert(stateUpdates.includes("typed text"))
	assert(!stateUpdates.includes("selected text"))
	deliverThrottledChange?.()
} finally {
	for (const cleanup of cleanups) cleanup?.()
}

console.log("search command wiring passed")

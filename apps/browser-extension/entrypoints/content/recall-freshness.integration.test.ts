import { afterEach, describe, expect, it, mock } from "bun:test"
import { GlobalWindow } from "happy-dom"

mock.module("#imports", () => ({
	storage: {
		defineItem: () => ({
			getValue: async () => false,
			setValue: async () => {},
		}),
	},
}))

const { setupChatGPTAutoFetch } = await import("./chatgpt")
const { acceptMemorySuggestion } = await import("./memory-suggestion")
const { getRelatedMemoriesForT3, setupT3AutoFetch } = await import("./t3")

const installedGlobals = [
	"browser",
	"document",
	"Event",
	"HTMLElement",
	"HTMLInputElement",
	"HTMLTextAreaElement",
	"KeyboardEvent",
	"Node",
	"window",
] as const
const originalGlobals = new Map(
	installedGlobals.map((name) => [
		name,
		Object.getOwnPropertyDescriptor(globalThis, name),
	]),
)

let page: GlobalWindow | null = null

function installDom() {
	page = new GlobalWindow({ url: "https://t3.chat/chat/test" })
	const values = {
		browser: undefined,
		document: page.document,
		Event: page.Event,
		HTMLElement: page.HTMLElement,
		HTMLInputElement: page.HTMLInputElement,
		HTMLTextAreaElement: page.HTMLTextAreaElement,
		KeyboardEvent: page.KeyboardEvent,
		Node: page.Node,
		window: page,
	}

	for (const name of installedGlobals) {
		if (name === "browser") continue
		Object.defineProperty(globalThis, name, {
			configurable: true,
			value: values[name],
			writable: true,
		})
	}
}

afterEach(() => {
	page?.happyDOM.close()
	page = null
	for (const name of installedGlobals) {
		const descriptor = originalGlobals.get(name)
		if (descriptor) {
			Object.defineProperty(globalThis, name, descriptor)
		} else {
			Reflect.deleteProperty(globalThis, name)
		}
	}
})

function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((resolvePromise) => {
		resolve = resolvePromise
	})
	return { promise, resolve }
}

describe("T3 recall freshness handler", () => {
	it("clears stale auto-send data on edit even when auto-search is off", async () => {
		installDom()
		const input = document.createElement("textarea")
		input.dataset.supermemories = "stale memory A"
		const icon = document.createElement("div")
		icon.id = "sm-t3-input-bar-element-test"
		icon.innerHTML = "<span>Included Memories</span>"
		icon.dataset.originalHtml = "<button>Search memories</button>"
		icon.dataset.memoriesData = '["stale memory A"]'
		document.body.append(input, icon)
		const responseA = deferred<unknown>()
		Object.defineProperty(globalThis, "browser", {
			configurable: true,
			value: {
				runtime: {
					sendMessage: () => responseA.promise,
				},
			},
			writable: true,
		})

		await setupT3AutoFetch()
		input.value = "prompt A"
		const inFlightA = getRelatedMemoriesForT3("test")
		input.value = "prompt B"
		input.dispatchEvent(new Event("input", { bubbles: true }))

		expect(input.dataset.supermemories).toBeUndefined()
		expect(icon.dataset.memoriesData).toBeUndefined()
		expect(icon.dataset.originalHtml).toBeUndefined()
		expect(icon.textContent).toBe("Search memories")
		expect(input.dataset.supermemoryRecallFreshness).toBe("true")
		expect(input.dataset.supermemoryAutoFetch).toBeUndefined()

		responseA.resolve({ success: true, data: ["memory A"] })
		await inFlightA
		expect(input.dataset.supermemories).toBeUndefined()
		expect(icon.dataset.memoriesData).toBeUndefined()
	})

	it("keeps fast B when slow A resolves last", async () => {
		installDom()
		const prompt = document.createElement("div")
		const input = document.createElement("textarea")
		input.value = "prompt A"
		prompt.appendChild(input)
		const controls = document.createElement("div")
		const iconContainer = document.createElement("div")
		iconContainer.dataset.supermemoryIconAdded = "true"
		const icon = document.createElement("div")
		icon.id = "sm-t3-input-bar-element-test"
		icon.innerHTML = "<button>Search memories</button>"
		iconContainer.appendChild(icon)
		controls.appendChild(iconContainer)
		document.body.append(prompt, controls)

		const pending = new Map<string, ReturnType<typeof deferred<unknown>>>()
		Object.defineProperty(globalThis, "browser", {
			configurable: true,
			value: {
				runtime: {
					sendMessage: ({ data }: { data: string }) => {
						const request = deferred<unknown>()
						pending.set(data, request)
						return request.promise
					},
				},
			},
			writable: true,
		})

		const slowA = getRelatedMemoriesForT3("test")
		input.value = "prompt B"
		const fastB = getRelatedMemoriesForT3("test")
		pending.get("prompt B")?.resolve({ success: true, data: ["memory B"] })
		await fastB
		pending.get("prompt A")?.resolve({ success: true, data: ["memory A"] })
		await slowA

		expect(input.dataset.supermemories).toContain("memory B")
		expect(input.dataset.supermemories).not.toContain("memory A")
		expect(icon.dataset.memoriesData).toBe('["memory B"]')
	})

	it("clears replacement-composer loading state", async () => {
		installDom()
		const firstInput = document.createElement("textarea")
		const icon = document.createElement("div")
		icon.id = "sm-t3-input-bar-element-test"
		icon.innerHTML = "<span>Searching memories</span>"
		icon.dataset.originalHtml = "<button>Search memories</button>"
		icon.dataset.memoriesData = '["memory A"]'
		document.body.append(firstInput, icon)

		await setupT3AutoFetch()
		const replacementInput = document.createElement("textarea")
		firstInput.replaceWith(replacementInput)
		await setupT3AutoFetch()

		expect(icon.textContent).toBe("Search memories")
		expect(icon.dataset.originalHtml).toBeUndefined()
		expect(icon.dataset.memoriesData).toBeUndefined()
		expect(replacementInput.dataset.supermemoryRecallFreshness).toBe("true")
	})
})

describe("accepted recall context", () => {
	it("preserves included memories through the synchronous acceptance input", async () => {
		installDom()
		const form = document.createElement("form")
		const input = document.createElement("textarea")
		input.dataset.testid = "prompt-textarea"
		input.value = "prompt"
		input.dataset.supermemories =
			"\n\nSupermemories of user (only for the reference): 1. memory M1"
		form.appendChild(input)
		const icon = document.createElement("div")
		icon.id = "sm-chatgpt-input-bar-element-before-composer-test"
		icon.dataset.memoriesData = '["memory M1"]'
		icon.dataset.supermemoryStatus = "searching"
		document.body.append(form, icon)

		await setupChatGPTAutoFetch()
		const accepted = acceptMemorySuggestion(
			new KeyboardEvent("keydown", {
				cancelable: true,
				key: "Tab",
			}),
			"chatgpt",
			input,
		)

		expect(accepted).toBe(true)
		expect(input.value).toContain("memory M1")
		expect(input.dataset.supermemories).toBeUndefined()
		expect(input.dataset.supermemoriesInjected).toBe("true")
		expect(icon.dataset.memoriesData).toBe('["memory M1"]')
		expect(icon.dataset.supermemoryStatus).toBe("found")
		expect(icon.querySelector("[data-supermemory-status-badge]")).not.toBeNull()

		icon.dataset.supermemoryStatus = "searching"
		input.value = input.value.replace("prompt", "edited prompt")
		input.dispatchEvent(new Event("input", { bubbles: true }))
		expect(icon.dataset.memoriesData).toBe('["memory M1"]')
		expect(icon.dataset.supermemoryStatus).toBe("found")

		input.dataset.supermemories =
			"\n\nSupermemories of user (only for the reference): 1. memory M2"
		delete input.dataset.supermemoriesInjected
		icon.dataset.memoriesData = '["memory M2"]'
		input.value = input.value.replace("edited", "edited again")
		input.dispatchEvent(new Event("input", { bubbles: true }))
		expect(input.value).toContain("memory M1")
		expect(input.dataset.supermemories).toBeUndefined()
		expect(input.dataset.supermemoriesInjected).toBe("true")
		expect(icon.dataset.memoriesData).toBeUndefined()
		expect(icon.dataset.supermemoryStatus).toBeUndefined()

		input.dispatchEvent(new Event("input", { bubbles: true }))
		expect(icon.dataset.supermemoryStatus).toBeUndefined()
		expect(icon.querySelector("[data-supermemory-status-badge]")).toBeNull()
	})
})

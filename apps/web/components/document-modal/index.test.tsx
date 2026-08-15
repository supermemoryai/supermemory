import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { Window } from "happy-dom"
import { type ComponentProps, type ReactNode, act } from "react"
import { createRoot, type Root } from "react-dom/client"

const browser = new Window({ url: "http://localhost/" })

Object.assign(globalThis, {
	window: browser,
	document: browser.document,
	navigator: browser.navigator,
	location: browser.location,
	history: browser.history,
	localStorage: browser.localStorage,
	sessionStorage: browser.sessionStorage,
	HTMLElement: browser.HTMLElement,
	Element: browser.Element,
	Node: browser.Node,
	MutationObserver: browser.MutationObserver,
	getComputedStyle: browser.getComputedStyle.bind(browser),
	requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
	cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
})
Object.assign(browser, { SyntaxError })
;(
	globalThis as typeof globalThis & {
		IS_REACT_ACT_ENVIRONMENT: boolean
	}
).IS_REACT_ACT_ENVIRONMENT = true

function PassThrough({ children }: { children?: ReactNode }) {
	return <>{children}</>
}

type MotionProps = {
	initial?: unknown
	animate?: unknown
	exit?: unknown
	transition?: unknown
}

function MotionButton({
	initial: _initial,
	animate: _animate,
	exit: _exit,
	transition: _transition,
	...props
}: ComponentProps<"button"> & MotionProps) {
	return <button {...props} />
}

function MotionDiv({
	initial: _initial,
	animate: _animate,
	exit: _exit,
	transition: _transition,
	...props
}: ComponentProps<"div"> & MotionProps) {
	return <div {...props} />
}

// Keep DocumentModal and its private DeleteButton real; only remove unrelated UI.
mock.module(import.meta.resolve("./title"), () => ({ Title: PassThrough }))
mock.module(import.meta.resolve("./summary"), () => ({ Summary: PassThrough }))
mock.module(import.meta.resolve("./graph-list-memories"), () => ({
	GraphListMemories: PassThrough,
}))
mock.module(import.meta.resolve("./content"), () => ({
	DocumentContent: PassThrough,
}))

mock.module("@repo/ui/components/dialog", () => ({
	Dialog: PassThrough,
	DialogContent: PassThrough,
	DialogTitle: PassThrough,
}))
mock.module("@repo/ui/components/drawer", () => ({
	Drawer: PassThrough,
	DrawerContent: PassThrough,
	DrawerTitle: PassThrough,
}))
mock.module("@ui/components/tabs", () => ({
	Tabs: PassThrough,
	TabsContent: PassThrough,
	TabsList: PassThrough,
	TabsTrigger: PassThrough,
}))
mock.module("@radix-ui/react-dialog", () => ({ Close: PassThrough }))
mock.module("motion/react", () => ({
	AnimatePresence: PassThrough,
	motion: { button: MotionButton, div: MotionDiv },
}))
mock.module("@hooks/use-mobile", () => ({ useIsMobile: () => false }))
mock.module("@/lib/fonts", () => ({ dmSansClassName: () => "" }))
mock.module("@/lib/plugin-document", () => ({
	parsePluginDocument: () => null,
}))
mock.module("@/hooks/use-full-document", () => ({
	useFullDocumentContent: () => null,
}))
mock.module("sonner", () => ({
	toast: { error: mock(() => {}), success: mock(() => {}) },
}))

const deleteMutate = mock((_variables: { documentId: string }) => {})
const deleteMutation = { isPending: false, mutate: deleteMutate }
const updateMutation = { isPending: false, mutate: mock(() => {}) }

mock.module("@/hooks/use-document-mutations", () => ({
	useDocumentMutations: () => ({ deleteMutation, updateMutation }),
}))

const { DocumentModal } = await import("./index")

type ModalDocument = NonNullable<
	ComponentProps<typeof DocumentModal>["document"]
>

function makeDocument(
	id: string | null,
	customId: string | null,
): ModalDocument {
	return {
		id,
		customId,
		title: id ?? customId ?? "Document",
		type: "unknown",
		url: null,
		content: "",
		summary: null,
		memoryEntries: [],
		createdAt: new Date(),
	} as unknown as ModalDocument
}

let container: HTMLDivElement
let root: Root
const onClose = mock(() => {})

beforeEach(() => {
	deleteMutate.mockClear()
	onClose.mockClear()
	container = document.createElement("div")
	document.body.append(container)
	root = createRoot(container)
})

afterEach(async () => {
	await act(async () => root.unmount())
	container.remove()
})

async function renderDocument(value: ModalDocument) {
	await act(async () => {
		root.render(<DocumentModal document={value} isOpen onClose={onClose} />)
	})
}

function findButton(label: string) {
	return Array.from(document.getElementsByTagName("button")).find((button) =>
		button.textContent?.includes(label),
	)
}

async function clickButton(label: string) {
	const button = findButton(label)
	if (!button) throw new Error(`Missing button: ${label}`)

	await act(async () => button.click())
}

describe("DocumentModal delete confirmation", () => {
	it("disarms confirmation whenever the delete target changes", async () => {
		await renderDocument(makeDocument("id-a", null))
		await clickButton("Delete document")

		await renderDocument(makeDocument("id-b", null))
		expect(findButton("Confirm delete")).toBeUndefined()

		await clickButton("Delete document")
		await renderDocument(makeDocument(null, "custom-b"))
		expect(findButton("Confirm delete")).toBeUndefined()

		await clickButton("Delete document")
		await renderDocument(makeDocument(null, "custom-c"))
		expect(findButton("Confirm delete")).toBeUndefined()
		expect(deleteMutate).not.toHaveBeenCalled()

		await clickButton("Delete document")
		await clickButton("Confirm delete")

		expect(deleteMutate).toHaveBeenCalledTimes(1)
		expect(deleteMutate).toHaveBeenCalledWith({
			documentId: "custom-c",
		})
	})
})

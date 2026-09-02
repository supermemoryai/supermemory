"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ApiKeysPanel } from "@/components/ApiKeysPanel"
import { ContextPanel } from "@/components/ContextPanel"
import { ToolsReferencePanel } from "@/components/ToolsReferencePanel"
import type { MemoryDebugEntry } from "@/lib/context-api"
import {
	DEFAULT_MIDDLEWARE_CONFIG,
	type MiddlewareRuntimeConfig,
} from "@/lib/middleware-config"
import {
	CHAT_SDK_REGISTRY,
	type ChatSdkDefinition,
	type ToolTraceEntry,
} from "@/lib/sdk-registry"

type UserOrAssistantMessage = {
	kind: "user" | "assistant"
	content: string
}

type ToolMessage = {
	kind: "tool"
	entry: ToolTraceEntry
}

type DebugMessage = {
	kind: "debug"
	entry: MemoryDebugEntry
}

type DisplayMessage = UserOrAssistantMessage | ToolMessage | DebugMessage

export default function AgentPlaygroundPage() {
	const [sdks, setSdks] = useState(CHAT_SDK_REGISTRY)
	const [hasSupermemoryKey, setHasSupermemoryKey] = useState(false)
	const [hasOpenAiKey, setHasOpenAiKey] = useState(false)
	const [pythonOk, setPythonOk] = useState(false)
	const [model, setModel] = useState("gpt-4o-mini")
	const [pythonUrl, setPythonUrl] = useState("http://127.0.0.1:8792")

	const [supermemoryApiKey, setSupermemoryApiKey] = useState("")
	const [openaiApiKey, setOpenaiApiKey] = useState("")
	const apiKeys = useMemo(
		() => ({ supermemoryApiKey, openaiApiKey }),
		[supermemoryApiKey, openaiApiKey],
	)
	const supermemoryKeyReady =
		supermemoryApiKey.trim().length > 0 || hasSupermemoryKey
	const openAiKeyReady = openaiApiKey.trim().length > 0 || hasOpenAiKey
	const keysReady = supermemoryKeyReady && openAiKeyReady

	const [sdkId, setSdkId] = useState("ts-ai-sdk-middleware")
	const [containerTag, setContainerTag] = useState("sdk-playground")
	const [memoryMode, setMemoryMode] = useState<"profile" | "query" | "full">(
		"full",
	)
	const [conversationId, setConversationId] = useState("")
	const [middlewareConfig, setMiddlewareConfig] =
		useState<MiddlewareRuntimeConfig>(DEFAULT_MIDDLEWARE_CONFIG)

	const [messages, setMessages] = useState<DisplayMessage[]>([])
	const [input, setInput] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [contextRefreshKey, setContextRefreshKey] = useState(0)
	const [leftPanel, setLeftPanel] = useState<"sdks" | "tools">("sdks")

	const lastUserMessage = useMemo(() => {
		const users = messages.filter(
			(m): m is UserOrAssistantMessage => m.kind === "user",
		)
		return users.at(-1)?.content ?? ""
	}, [messages])

	const selectedSdk = useMemo(
		() => sdks.find((s) => s.id === sdkId),
		[sdks, sdkId],
	)

	useEffect(() => {
		setConversationId((current) => current || crypto.randomUUID())
	}, [])

	const refreshMeta = useCallback(async () => {
		try {
			const res = await fetch("/api/chat")
			const data = await res.json()
			if (data.sdks) setSdks(data.sdks)
			setHasSupermemoryKey(Boolean(data.hasSupermemoryKey))
			setHasOpenAiKey(Boolean(data.hasOpenAiKey))
			setPythonOk(Boolean(data.pythonOk))
			if (data.pythonUrl) setPythonUrl(data.pythonUrl)
			if (data.model) setModel(data.model)
		} catch {
			/* ignore */
		}
	}, [])

	useEffect(() => {
		refreshMeta()
	}, [refreshMeta])

	const send = async () => {
		if (!input.trim() || loading || !selectedSdk?.available || !keysReady)
			return
		const activeConversationId = conversationId.trim() || crypto.randomUUID()
		if (!conversationId.trim()) setConversationId(activeConversationId)

		const userMessage: UserOrAssistantMessage = {
			kind: "user",
			content: input.trim(),
		}
		const chatHistory = messages
			.filter(
				(m): m is UserOrAssistantMessage =>
					m.kind === "user" || m.kind === "assistant",
			)
			.map((m) => ({ role: m.kind, content: m.content }))
		const nextMessages = [...messages, userMessage]
		setMessages(nextMessages)
		setInput("")
		setLoading(true)
		setError(null)

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sdkId,
					messages: [
						...chatHistory,
						{ role: "user", content: userMessage.content },
					],
					containerTag,
					conversationId: activeConversationId,
					memoryMode:
						selectedSdk.mode === "middleware" ? memoryMode : undefined,
					middlewareConfig:
						selectedSdk.mode === "middleware" ? middlewareConfig : undefined,
					apiKeys,
				}),
			})
			const data = await res.json()
			if (!data.ok) {
				throw new Error(data.error ?? "Chat failed")
			}
			const content = data.message?.content ?? ""
			const toolTrace = (data.toolTrace ?? []) as ToolTraceEntry[]
			const memoryDebug = (data.memoryDebug ?? []) as MemoryDebugEntry[]
			setMessages((prev) => [
				...prev,
				...memoryDebug.map((entry) => ({ kind: "debug" as const, entry })),
				...toolTrace.map((entry) => ({ kind: "tool" as const, entry })),
				{ kind: "assistant", content },
			])
			setContextRefreshKey((k) => k + 1)
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setLoading(false)
		}
	}

	const tsSdks = sdks.filter((s) => s.language === "typescript")
	const pySdks = sdks.filter((s) => s.language === "python")

	return (
		<div className="mx-auto flex h-screen max-w-[1400px] flex-col p-4 md:p-5">
			<header className="mb-4 shrink-0 space-y-3 border-b border-zinc-800 pb-4">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">
						Supermemory Agent Playground
					</h1>
					<p className="text-sm text-zinc-400">
						Talk to a real agent. Switch the underlying SDK integration in the
						sidebar — middleware auto-injects memory; tools let the model call
						memory operations explicitly.
					</p>
				</div>
				<div className="flex flex-wrap gap-2 text-xs">
					<Status ok={supermemoryKeyReady} label="Supermemory key" />
					<Status ok={openAiKeyReady} label="OpenAI key" />
					<Status
						ok={pythonOk}
						label={`Python ${pythonUrl.replace("http://", "")}`}
					/>
					<span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-400">
						model: {model}
					</span>
				</div>
				<ApiKeysPanel
					supermemoryApiKey={supermemoryApiKey}
					openaiApiKey={openaiApiKey}
					hasSupermemoryEnvKey={hasSupermemoryKey}
					hasOpenAiEnvKey={hasOpenAiKey}
					onSupermemoryChange={setSupermemoryApiKey}
					onOpenAiChange={setOpenaiApiKey}
				/>
			</header>

			<div className="flex min-h-0 flex-1 gap-3 lg:gap-4">
				<aside className="hidden w-60 shrink-0 min-h-0 lg:flex lg:flex-col">
					<div className="mb-2 flex gap-1 shrink-0">
						<SidebarTab
							active={leftPanel === "sdks"}
							onClick={() => setLeftPanel("sdks")}
						>
							SDKs
						</SidebarTab>
						<SidebarTab
							active={leftPanel === "tools"}
							onClick={() => setLeftPanel("tools")}
						>
							Tools
						</SidebarTab>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{leftPanel === "sdks" ? (
							<div className="space-y-4">
								<Section title="TypeScript">
									<SdkButtons
										sdks={tsSdks}
										selected={sdkId}
										onSelect={setSdkId}
									/>
								</Section>
								<Section title="Python">
									<SdkButtons
										sdks={pySdks}
										selected={sdkId}
										onSelect={setSdkId}
									/>
								</Section>
							</div>
						) : (
							<ToolsReferencePanel />
						)}
					</div>
				</aside>

				<div className="flex min-h-0 flex-1 flex-col gap-3">
					<div className="flex gap-1 shrink-0 lg:hidden">
						<SidebarTab
							active={leftPanel === "sdks"}
							onClick={() => setLeftPanel("sdks")}
						>
							Chat
						</SidebarTab>
						<SidebarTab
							active={leftPanel === "tools"}
							onClick={() => setLeftPanel("tools")}
						>
							Tool reference
						</SidebarTab>
					</div>

					{leftPanel === "tools" && (
						<div className="max-h-72 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/20 p-3 lg:hidden">
							<ToolsReferencePanel />
						</div>
					)}

					{leftPanel === "sdks" && (
						<div className="flex flex-wrap items-end gap-3 md:hidden">
							<label className="flex-1 space-y-1">
								<span className="text-xs text-zinc-500">SDK</span>
								<select
									value={sdkId}
									onChange={(e) => setSdkId(e.target.value)}
									className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
								>
									{sdks.map((s) => (
										<option key={s.id} value={s.id} disabled={!s.available}>
											{s.label}
										</option>
									))}
								</select>
							</label>
						</div>
					)}

					{selectedSdk && (
						<div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm">
							<div className="font-medium">{selectedSdk.label}</div>
							<div className="text-zinc-400">{selectedSdk.description}</div>
							<div className="mt-1 text-xs text-zinc-500">
								{selectedSdk.package} ·{" "}
								<span className="text-zinc-400">
									{selectedSdk.mode === "middleware"
										? "automatic memory"
										: selectedSdk.mode === "tools"
											? "explicit tools"
											: "manual profile + save"}
								</span>
							</div>
						</div>
					)}

					<div className="flex flex-wrap gap-3">
						<label className="space-y-1">
							<span className="text-xs text-zinc-500">Container tag</span>
							<input
								value={containerTag}
								onChange={(e) => setContainerTag(e.target.value)}
								maxLength={100}
								className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm w-40"
							/>
						</label>
						<label className="space-y-1">
							<span className="text-xs text-zinc-500">customId (session)</span>
							<input
								value={conversationId}
								onChange={(e) => setConversationId(e.target.value)}
								maxLength={242}
								className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-mono w-52"
							/>
						</label>
						{selectedSdk?.mode === "middleware" && (
							<>
								<label className="space-y-1">
									<span className="text-xs text-zinc-500">Memory mode</span>
									<select
										value={memoryMode}
										onChange={(e) =>
											setMemoryMode(
												e.target.value as "profile" | "query" | "full",
											)
										}
										className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm"
									>
										<option value="profile">profile</option>
										<option value="query">query</option>
										<option value="full">full</option>
									</select>
								</label>
								<label className="space-y-1">
									<span className="text-xs text-zinc-500">addMemory</span>
									<select
										value={middlewareConfig.addMemory}
										onChange={(e) =>
											setMiddlewareConfig((prev) => ({
												...prev,
												addMemory: e.target.value as "always" | "never",
											}))
										}
										className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm"
									>
										<option value="always">always</option>
										<option value="never">never</option>
									</select>
								</label>
								<label className="flex items-end gap-2 pb-1.5 text-xs text-zinc-400">
									<input
										type="checkbox"
										checked={middlewareConfig.verbose}
										onChange={(e) =>
											setMiddlewareConfig((prev) => ({
												...prev,
												verbose: e.target.checked,
											}))
										}
									/>
									verbose
								</label>
								{selectedSdk.id === "ts-ai-sdk-middleware" && (
									<>
										<label className="flex items-end gap-2 pb-1.5 text-xs text-zinc-400">
											<input
												type="checkbox"
												checked={middlewareConfig.includeToolCalls}
												onChange={(e) =>
													setMiddlewareConfig((prev) => ({
														...prev,
														includeToolCalls: e.target.checked,
													}))
												}
											/>
											includeToolCalls
										</label>
										<label className="flex items-end gap-2 pb-1.5 text-xs text-zinc-400">
											<input
												type="checkbox"
												checked={middlewareConfig.skipMemoryOnError}
												onChange={(e) =>
													setMiddlewareConfig((prev) => ({
														...prev,
														skipMemoryOnError: e.target.checked,
													}))
												}
											/>
											skipMemoryOnError
										</label>
									</>
								)}
							</>
						)}
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
						{messages.length === 0 && (
							<p className="text-center text-sm text-zinc-500 py-8">
								Say hi — try &quot;Remember that I prefer oat milk&quot; or
								&quot;What do you know about me?&quot;
							</p>
						)}
						{messages.map((m, i) => {
							if (m.kind === "debug") {
								return (
									<div key={i} className="flex justify-start">
										<div className="max-w-[92%] rounded-lg border border-violet-900/50 bg-violet-950/25 px-3 py-2 text-xs">
											<div className="font-medium text-violet-300 mb-1">
												Debug · {m.entry.label}
											</div>
											{m.entry.detail && (
												<pre className="font-mono text-violet-100/70 whitespace-pre-wrap break-all mb-2">
													{JSON.stringify(m.entry.detail, null, 2)}
												</pre>
											)}
											{m.entry.preview && (
												<pre className="font-mono text-zinc-300 whitespace-pre-wrap break-all border-t border-violet-900/40 pt-2 mt-1">
													{m.entry.preview}
												</pre>
											)}
										</div>
									</div>
								)
							}
							if (m.kind === "tool") {
								return (
									<div key={i} className="flex justify-start">
										<div className="max-w-[90%] rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs font-mono text-amber-100/90">
											<div className="font-sans text-amber-400 font-medium mb-1">
												Tool · step {m.entry.step} · {m.entry.toolName}
											</div>
											<div className="text-zinc-400">args</div>
											<pre className="whitespace-pre-wrap break-all mb-2">
												{JSON.stringify(m.entry.args, null, 2)}
											</pre>
											{m.entry.result !== undefined && (
												<>
													<div className="text-zinc-400">result</div>
													<pre className="whitespace-pre-wrap break-all">
														{JSON.stringify(m.entry.result, null, 2)}
													</pre>
												</>
											)}
										</div>
									</div>
								)
							}
							return (
								<div
									key={i}
									className={
										m.kind === "user"
											? "flex justify-end"
											: "flex justify-start"
									}
								>
									<div
										className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
											m.kind === "user"
												? "bg-emerald-700 text-white"
												: "bg-zinc-800 text-zinc-100"
										}`}
									>
										{m.content}
									</div>
								</div>
							)
						})}
						{loading && (
							<div className="text-sm text-zinc-500 animate-pulse">
								Thinking…
							</div>
						)}
					</div>

					{error && (
						<div className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
							{error}
						</div>
					)}

					<div className="flex gap-2 shrink-0">
						<input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault()
									send()
								}
							}}
							disabled={loading || !selectedSdk?.available || !keysReady}
							placeholder={
								keysReady
									? "Message the agent…"
									: "Enter API keys above to chat…"
							}
							className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/50 disabled:opacity-50"
						/>
						<button
							type="button"
							onClick={send}
							disabled={
								loading ||
								!input.trim() ||
								!selectedSdk?.available ||
								!keysReady
							}
							className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
						>
							Send
						</button>
					</div>
				</div>

				<aside className="hidden w-80 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/20 p-3 xl:flex xl:w-96 xl:flex-col min-h-0">
					<ContextPanel
						containerTag={containerTag}
						lastUserMessage={lastUserMessage}
						refreshKey={contextRefreshKey}
						supermemoryApiKey={supermemoryApiKey}
						supermemoryKeyReady={supermemoryKeyReady}
					/>
				</aside>
			</div>
		</div>
	)
}

function Status({ ok, label }: { ok: boolean; label: string }) {
	return (
		<span
			className={`rounded-full border px-3 py-1 ${
				ok
					? "border-emerald-800 text-emerald-400"
					: "border-zinc-700 text-zinc-500"
			}`}
		>
			{label}
		</span>
	)
}

function Section({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}) {
	return (
		<div>
			<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
				{title}
			</h2>
			{children}
		</div>
	)
}

function SdkButtons({
	sdks,
	selected,
	onSelect,
}: {
	sdks: ChatSdkDefinition[]
	selected: string
	onSelect: (id: string) => void
}) {
	return (
		<ul className="space-y-1">
			{sdks.map((sdk) => (
				<li key={sdk.id}>
					<button
						type="button"
						disabled={!sdk.available}
						onClick={() => onSelect(sdk.id)}
						className={`w-full rounded-md px-2 py-2 text-left text-sm transition-colors ${
							selected === sdk.id
								? "bg-zinc-800 text-white"
								: "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
						} ${!sdk.available ? "opacity-40 cursor-not-allowed" : ""}`}
					>
						<div>{sdk.label}</div>
						<div className="text-[10px] text-zinc-500 capitalize">
							{sdk.mode}
						</div>
					</button>
				</li>
			))}
		</ul>
	)
}

function SidebarTab({
	active,
	onClick,
	children,
}: {
	active: boolean
	onClick: () => void
	children: React.ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
				active
					? "bg-zinc-800 text-white"
					: "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
			}`}
		>
			{children}
		</button>
	)
}

import { type ReactNode, useEffect } from "react"
import type { ViewMessage } from "../shared/types"
import { useApplyHostTheme } from "./hooks/useApplyHostTheme"
import { useLog } from "./hooks/useLog"
import { useViewState } from "./hooks/useViewState"
import { Confirmation } from "./views/Confirmation"
import { ErrorView } from "./views/Error"
import { Graph } from "./views/Graph"
import { Loading } from "./views/Loading"
import { Picker } from "./views/Picker"
import { Save } from "./views/Save"
import { Success } from "./views/Success"
import { Upload } from "./views/Upload"

export function App() {
	useApplyHostTheme()
	const log = useLog()
	const { state, setView, setError } = useViewState()

	useEffect(() => {
		if (state.kind === "view") {
			log("info", `[app] view → ${state.message.view}`)
		} else if (state.kind === "error") {
			log("error", `[app] error: ${state.message}`)
		}
	}, [state, log])

	if (state.kind === "loading") {
		return (
			<WidgetShell>
				<Loading />
			</WidgetShell>
		)
	}
	if (state.kind === "error") {
		return (
			<WidgetShell>
				<ErrorView message={state.message} />
			</WidgetShell>
		)
	}
	if (state.kind === "raw") {
		return (
			<WidgetShell>
				<ErrorView message="Received unrecognized response from server. Try again." />
			</WidgetShell>
		)
	}

	const isGraphView = state.message.view === "graph"
	return (
		<WidgetShell immersive={isGraphView}>
			{renderView(state.message, setView, setError)}
		</WidgetShell>
	)
}

export function WidgetShell({
	children,
	immersive = false,
}: {
	children: ReactNode
	immersive?: boolean
}) {
	const shellClassName = immersive
		? "mcp-widget-shell mcp-widget-shell-graph"
		: "mcp-widget-shell"

	return (
		<div className={shellClassName}>
			<div aria-hidden className="mcp-widget-glow" />
			{immersive ? null : (
				<header className="mcp-widget-brand">
					<span aria-hidden className="mcp-widget-brand-mark">
						<svg aria-hidden="true" viewBox="0 0 314 256">
							<path
								d="M313.728 100.982H197.297V0H159.68V109.567C159.68 121.205 164.284 132.381 172.466 140.615L267.535 236.283L294.134 209.517L223.917 138.858H313.75V101.004L313.728 100.982Z"
								fill="currentColor"
							/>
							<path
								d="M19.616 46.5043L89.8323 117.163H0V155.017H116.431V255.999H154.048V146.432C154.048 134.795 149.444 123.618 141.262 115.384L46.2144 19.7383L19.616 46.5043Z"
								fill="currentColor"
							/>
						</svg>
					</span>
					<span className="mcp-widget-brand-copy">
						<span className="mcp-widget-brand-name">supermemory</span>
						<span className="mcp-widget-brand-mode">MCP</span>
					</span>
				</header>
			)}
			<main className="mcp-widget-content">{children}</main>
		</div>
	)
}

function renderView(
	msg: ViewMessage,
	setView: (m: ViewMessage) => void,
	setError: (m: string) => void,
) {
	switch (msg.view) {
		case "picker":
			return (
				<Picker
					activeTag={msg.activeTag}
					assignedTags={msg.assignedTags}
					containerTags={msg.containerTags}
					onAdvance={setView}
					onError={setError}
				/>
			)
		case "save":
			return (
				<Save
					activeTag={msg.activeTag}
					onAdvance={setView}
					onError={setError}
					prefill={msg.prefill}
					writableTags={msg.writableTags}
				/>
			)
		case "upload":
			return (
				<Upload
					activeTag={msg.activeTag}
					onAdvance={setView}
					onError={setError}
					writableTags={msg.writableTags}
				/>
			)
		case "graph":
			return (
				<Graph
					containerTag={msg.containerTag}
					documents={msg.documents}
					totalCount={msg.totalCount}
				/>
			)
		case "confirmation":
			return <Confirmation containerTag={msg.containerTag} />
		case "error":
			return (
				<ErrorView kind={msg.kind} message={msg.message} title={msg.title} />
			)
		case "save-success":
			return <Success containerTag={msg.containerTag} id={msg.id} kind="save" />
		case "upload-success":
			return (
				<Success
					containerTag={msg.containerTag}
					fileName={msg.fileName}
					id={msg.id}
					kind="upload"
				/>
			)
		default: {
			const exhaustive: never = msg
			return (
				<ErrorView message={`Unhandled view: ${JSON.stringify(exhaustive)}`} />
			)
		}
	}
}

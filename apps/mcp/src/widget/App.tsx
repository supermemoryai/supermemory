import { useEffect } from "react"
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

	if (state.kind === "loading") return <Loading />
	if (state.kind === "error") return <ErrorView message={state.message} />
	if (state.kind === "raw") {
		return (
			<ErrorView message="Received unrecognized response from server. Try again." />
		)
	}

	return renderView(state.message, setView, setError)
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

import {
	Form,
	ActionPanel,
	Action,
	showToast,
	Toast,
	useNavigation,
	Icon,
	getSelectedText,
} from "@raycast/api"
import { useState, useEffect } from "react"
import { addMemory, fetchProjects } from "./api"
import { usePromise } from "@raycast/utils"
import { withSupermemory } from "./withSupermemory"

interface FormValues {
	content: string
	project: string
}

export default withSupermemory(Command)
function Command() {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [initialContent, setInitialContent] = useState("")
	const { pop } = useNavigation()

	const { isLoading, data: projects = [] } = usePromise(fetchProjects)

	useEffect(() => {
		async function loadSelectedText() {
			try {
				const selectedText = await getSelectedText()
				if (selectedText) {
					setInitialContent(selectedText)
				}
			} catch {
				// No text selected or error getting selected text - silently fail
				// User can still manually enter content
			}
		}

		loadSelectedText()
	}, [])

	async function handleSubmit(values: FormValues) {
		if (!values.content.trim()) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Content Required",
				message: "Please enter some content for the memory",
			})
			return
		}

		try {
			setIsSubmitting(true)

			const containerTags = values.project ? [values.project] : undefined

			await addMemory({
				content: values.content.trim(),
				containerTags,
			})

			pop()
		} catch (error) {
			console.error("Failed to add memory:", error)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Form
			isLoading={isLoading || isSubmitting}
			actions={
				!isLoading && (
					<ActionPanel>
						<Action.SubmitForm
							icon={Icon.Plus}
							title="Add Memory"
							onSubmit={handleSubmit}
						/>
					</ActionPanel>
				)
			}
		>
			<Form.TextArea
				id="content"
				title="Content"
				value={initialContent}
				placeholder="Enter the memory content..."
				info="The main content of your memory. This is required."
				onChange={(value) => setInitialContent(value)}
			/>
			<Form.Separator />
			<Form.Dropdown
				id="project"
				title="Project"
				info="Select a project to organize this memory"
				storeValue
			>
				<Form.Dropdown.Item value="" title="No Project" />
				{projects.map((project) => (
					<Form.Dropdown.Item
						key={project.id}
						value={project.containerTag}
						title={project.name}
					/>
				))}
			</Form.Dropdown>
		</Form>
	)
}

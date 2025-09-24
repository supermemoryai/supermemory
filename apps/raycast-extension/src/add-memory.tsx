import {
	Form,
	ActionPanel,
	Action,
	showToast,
	Toast,
	useNavigation,
} from "@raycast/api"
import { useEffect, useState } from "react"
import {
	addMemory,
	fetchProjects,
	checkApiConnection,
	type Project,
} from "./api"

interface FormValues {
	content: string
	project: string
}

export default function Command() {
	const [projects, setProjects] = useState<Project[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const { pop } = useNavigation()

	useEffect(() => {
		async function loadProjects() {
			try {
				setIsLoading(true)
				const isConnected = await checkApiConnection()
				if (!isConnected) {
					return
				}

				const fetchedProjects = await fetchProjects()
				setProjects(fetchedProjects)
			} catch (error) {
				console.error("Failed to load projects:", error)
			} finally {
				setIsLoading(false)
			}
		}

		loadProjects()
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
				<ActionPanel>
					<Action.SubmitForm title="Add Memory" onSubmit={handleSubmit} />
				</ActionPanel>
			}
		>
			<Form.TextArea
				id="content"
				title="Content"
				placeholder="Enter the memory content..."
				info="The main content of your memory. This is required."
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

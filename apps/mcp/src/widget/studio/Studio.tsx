import { type ReactNode, useState } from "react"
import { WorkspaceCard } from "../components/WorkspaceCard"
import {
	ActionGroup,
	Badge,
	Button,
	Card,
	Chip,
	Field,
	FileUpload,
	Input,
	PageHeader,
	Stack,
	TextArea,
	WorkspaceSelect,
} from "../design/ui"
import { Confirmation } from "../views/Confirmation"
import { ErrorView } from "../views/Error"
import { Graph } from "../views/Graph"
import { Loading } from "../views/Loading"
import { Picker } from "../views/Picker"
import { Save } from "../views/Save"
import { Success } from "../views/Success"
import { Upload } from "../views/Upload"
import {
	mockAssignedTags,
	mockContainerTags,
	mockDocuments,
	mockWritableTags,
} from "./mocks"

type Theme = "light" | "dark"
type Width = "narrow" | "wide"

const NARROW = 420
const WIDE = 720

// A no-op handler set for views. In the Studio there is no MCP host, so
// widget-initiated tool calls would reject; that's fine — we only review
// layout/spacing here, and onAdvance/onError surface what *would* happen.
function useStubHandlers(label: string) {
	const [event, setEvent] = useState<string | null>(null)
	return {
		event,
		onAdvance: (msg: { view: string }) =>
			setEvent(`${label}: onAdvance → ${msg.view}`),
		onError: (m: string) => setEvent(`${label}: onError → ${m}`),
	}
}

function Section({
	title,
	description,
	children,
}: {
	title: string
	description?: string
	children: ReactNode
}) {
	return (
		<section className="flex flex-col gap-(--space-4)">
			<div className="flex flex-col gap-(--space-1)">
				<h2
					className="text-(length:--text-lg) font-semibold text-text-primary"
					style={{ fontFamily: "var(--font-brand)" }}
				>
					{title}
				</h2>
				{description ? (
					<p className="text-(length:--text-sm) text-text-secondary">
						{description}
					</p>
				) : null}
			</div>
			{children}
		</section>
	)
}

// A device-style frame that mimics the widget iframe so spacing reads true.
function Frame({
	label,
	width,
	children,
}: {
	label: string
	width: number
	children: ReactNode
}) {
	return (
		<div className="flex flex-col gap-(--space-2)">
			<span className="text-(length:--text-xs) font-mono text-text-muted">
				{label}
			</span>
			<div
				className="overflow-hidden rounded-(--radius-lg) border border-border bg-bg-primary shadow-md"
				style={{ width }}
			>
				{children}
			</div>
		</div>
	)
}

function Swatch({ name, varName }: { name: string; varName: string }) {
	return (
		<div className="flex flex-col gap-1">
			<div
				className="h-12 rounded-(--radius-md) border border-border"
				style={{ background: `var(${varName})` }}
			/>
			<span className="text-(length:--text-xs) text-text-secondary">
				{name}
			</span>
			<span className="text-[10px] font-mono text-text-muted">{varName}</span>
		</div>
	)
}

export function Studio() {
	const [theme, setTheme] = useState<Theme>("light")
	const [width, setWidth] = useState<Width>("narrow")
	const frameWidth = width === "narrow" ? NARROW : WIDE

	const applyTheme = (t: Theme) => {
		setTheme(t)
		document.documentElement.setAttribute("data-theme", t)
	}

	const saveStub = useStubHandlers("Save")
	const uploadStub = useStubHandlers("Upload")
	const pickerStub = useStubHandlers("Picker")
	const [selectValue, setSelectValue] = useState<string | null>(
		"sm_project_marketing",
	)

	return (
		<div className="min-h-screen bg-bg-secondary text-text-primary">
			{/* Toolbar */}
			<div className="sticky top-0 z-50 flex items-center justify-between gap-(--space-4) border-b border-border bg-bg-elevated px-(--space-6) py-(--space-3)">
				<span
					className="text-(length:--text-base) font-semibold"
					style={{ fontFamily: "var(--font-brand)" }}
				>
					Supermemory MCP · Studio
				</span>
				<div className="flex items-center gap-(--space-4)">
					<div className="flex items-center gap-(--space-2)">
						<span className="text-(length:--text-xs) text-text-muted">
							Theme
						</span>
						<Chip
							onClick={() => applyTheme("light")}
							selected={theme === "light"}
						>
							Light
						</Chip>
						<Chip
							onClick={() => applyTheme("dark")}
							selected={theme === "dark"}
						>
							Dark
						</Chip>
					</div>
					<div className="flex items-center gap-(--space-2)">
						<span className="text-(length:--text-xs) text-text-muted">
							Width
						</span>
						<Chip
							onClick={() => setWidth("narrow")}
							selected={width === "narrow"}
						>
							Narrow {NARROW}
						</Chip>
						<Chip onClick={() => setWidth("wide")} selected={width === "wide"}>
							Wide {WIDE}
						</Chip>
					</div>
				</div>
			</div>

			<div className="mx-auto flex max-w-5xl flex-col gap-(--space-12) px-(--space-6) py-(--space-8)">
				{/* ── Primitives ───────────────────────────────────────── */}
				<Section
					description="Atoms from design/ui — fully interactive, no host needed."
					title="Primitives"
				>
					<Card>
						<Stack gap="lg">
							<div className="flex flex-col gap-(--space-3)">
								<span className="text-(length:--text-xs) uppercase tracking-wide text-text-muted">
									Button variants
								</span>
								<div className="flex flex-wrap items-center gap-(--space-3)">
									<Button variant="primary">Primary</Button>
									<Button variant="secondary">Secondary</Button>
									<Button variant="ghost">Ghost</Button>
									<Button variant="danger">Danger</Button>
									<Button loading variant="primary">
										Loading
									</Button>
									<Button disabled variant="primary">
										Disabled
									</Button>
								</div>
							</div>

							<div className="flex flex-col gap-(--space-3)">
								<span className="text-(length:--text-xs) uppercase tracking-wide text-text-muted">
									Badges
								</span>
								<div className="flex flex-wrap items-center gap-(--space-3)">
									<Badge variant="neutral">neutral</Badge>
									<Badge variant="accent">accent</Badge>
									<Badge variant="success">success</Badge>
									<Badge variant="error">error</Badge>
									<Badge variant="warning">warning</Badge>
									<Badge variant="info">info</Badge>
								</div>
							</div>

							<div className="flex flex-col gap-(--space-3)">
								<span className="text-(length:--text-xs) uppercase tracking-wide text-text-muted">
									Chips
								</span>
								<div className="flex flex-wrap items-center gap-(--space-2)">
									<Chip selected>Selected</Chip>
									<Chip>Unselected</Chip>
									<Chip>sm_project_marketing</Chip>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-(--space-4) sm:grid-cols-2">
								<Field hint="Single-line input primitive" label="Input">
									<Input placeholder="Type something…" />
								</Field>
								<Field error="This field has an error" label="Input (error)">
									<Input aria-invalid placeholder="Invalid…" />
								</Field>
							</div>

							<Field label="TextArea">
								<TextArea className="min-h-24" placeholder="Multi-line text…" />
							</Field>
						</Stack>
					</Card>
				</Section>

				{/* ── Tokens ───────────────────────────────────────────── */}
				<Section
					description="Color tokens resolve from tokens.css. Toggle the theme to compare."
					title="Color tokens"
				>
					<Card>
						<div className="grid grid-cols-2 gap-(--space-4) sm:grid-cols-4 md:grid-cols-6">
							<Swatch name="Accent" varName="--accent" />
							<Swatch name="BG primary" varName="--bg-primary" />
							<Swatch name="BG secondary" varName="--bg-secondary" />
							<Swatch name="BG muted" varName="--bg-muted" />
							<Swatch name="BG elevated" varName="--bg-elevated" />
							<Swatch name="Border" varName="--border" />
							<Swatch name="Success" varName="--success" />
							<Swatch name="Error" varName="--error" />
							<Swatch name="Warning" varName="--warning" />
							<Swatch name="Info" varName="--info" />
							<Swatch name="Danger" varName="--danger" />
							<Swatch name="Accent muted" varName="--accent-muted" />
						</div>
					</Card>
				</Section>

				{/* ── Composite components ─────────────────────────────── */}
				<Section title="Composite components">
					<div className="flex flex-wrap gap-(--space-4)">
						<div className="w-64">
							<WorkspaceCard
								access={mockAssignedTags[0]}
								active={false}
								containerTag={mockContainerTags[0]}
								onClick={() => {}}
							/>
						</div>
						<div className="w-64">
							<WorkspaceCard
								access={mockAssignedTags[1]}
								active
								containerTag={mockContainerTags[1]}
								onClick={() => {}}
							/>
						</div>
						<div className="w-64">
							<WorkspaceCard
								active={false}
								containerTag={mockContainerTags[3]}
								onClick={() => {}}
							/>
						</div>
					</div>
					<Card className="max-w-md">
						<PageHeader
							actions={
								<ActionGroup>
									<Button size="sm">Action</Button>
								</ActionGroup>
							}
							description="PageHeader with description and an action."
							title="Page Header"
						/>
					</Card>
					<div className="max-w-md">
						<FileUpload
							accept=".txt,.pdf"
							description="Supports TXT, PDF, PNG, JPG, MP4"
							onFile={() => {}}
						/>
					</div>
					<Card className="max-w-sm">
						<Field
							hint="Searchable Popover — scales to hundreds of workspaces."
							label="Workspace select"
						>
							<WorkspaceSelect
								onValueChange={setSelectValue}
								options={mockContainerTags.map((t) => ({
									value: t.containerTag,
									label: t.name,
									description: t.containerTag,
								}))}
								value={selectValue}
							/>
						</Field>
					</Card>
				</Section>

				{/* ── Views ────────────────────────────────────────────── */}
				<Section
					description="Full views with mock data, rendered at the selected width. Click events show below each frame (no host, so tool calls won't fire)."
					title="Views"
				>
					<div className="flex flex-wrap gap-(--space-8)">
						<Frame label="Picker" width={frameWidth}>
							<Picker
								activeTag="sm_project_marketing"
								assignedTags={mockAssignedTags}
								containerTags={mockContainerTags}
								onAdvance={pickerStub.onAdvance}
								onError={pickerStub.onError}
							/>
						</Frame>

						<Frame label="Save" width={frameWidth}>
							<Save
								activeTag="sm_project_marketing"
								onAdvance={saveStub.onAdvance}
								onError={saveStub.onError}
								prefill="The Q3 launch will target fintech enterprise buyers."
								writableTags={mockWritableTags}
							/>
						</Frame>

						<Frame label="Upload" width={frameWidth}>
							<Upload
								activeTag="sm_project_marketing"
								onAdvance={uploadStub.onAdvance}
								onError={uploadStub.onError}
								writableTags={mockWritableTags}
							/>
						</Frame>

						<Frame label="Confirmation" width={frameWidth}>
							<Confirmation containerTag="sm_project_marketing" />
						</Frame>

						<Frame label="Success (save)" width={frameWidth}>
							<Success
								containerTag="sm_project_marketing"
								id="mem_8fa92c"
								kind="save"
							/>
						</Frame>

						<Frame label="Success (upload)" width={frameWidth}>
							<Success
								containerTag="sm_project_marketing"
								fileName="q3-brief.pdf"
								id="doc_4b71a0"
								kind="upload"
							/>
						</Frame>

						<Frame label="Error" width={frameWidth}>
							<ErrorView message="No write access to container tag 'sm_project_eng_rfcs'." />
						</Frame>

						<Frame label="Loading" width={frameWidth}>
							<Loading />
						</Frame>

						<Frame label="Graph (@supermemory/memory-graph)" width={frameWidth}>
							<Graph
								documents={mockDocuments}
								totalCount={mockDocuments.length}
							/>
						</Frame>
					</div>

					{(saveStub.event || uploadStub.event || pickerStub.event) && (
						<Card>
							<Stack gap="xs">
								<span className="text-(length:--text-xs) uppercase tracking-wide text-text-muted">
									Last event
								</span>
								{[pickerStub.event, saveStub.event, uploadStub.event]
									.filter(Boolean)
									.map((e) => (
										<span
											className="text-(length:--text-sm) font-mono text-text-secondary"
											key={e}
										>
											{e}
										</span>
									))}
							</Stack>
						</Card>
					)}
				</Section>
			</div>
		</div>
	)
}

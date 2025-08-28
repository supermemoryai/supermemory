import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import "./App.css"
import { STORAGE_KEYS } from "../../utils/constants"
import {
	useDefaultProject,
	useProjects,
	useSetDefaultProject,
} from "../../utils/query-hooks"
import type { Project } from "../../utils/types"

function App() {
	const [userSignedIn, setUserSignedIn] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(true)
	const [showProjectSelector, setShowProjectSelector] = useState<boolean>(false)
	const [currentUrl, setCurrentUrl] = useState<string>("")
	const [currentTitle, setCurrentTitle] = useState<string>("")
	const [saving, setSaving] = useState<boolean>(false)
	const [activeTab, setActiveTab] = useState<"save" | "imports">("save")

	const queryClient = useQueryClient()
	const { data: projects = [], isLoading: loadingProjects } = useProjects({
		enabled: userSignedIn,
	})
	const { data: defaultProject } = useDefaultProject({
		enabled: userSignedIn,
	})
	const setDefaultProjectMutation = useSetDefaultProject()

	useEffect(() => {
		const checkAuthStatus = async () => {
			try {
				const result = await chrome.storage.local.get([
					STORAGE_KEYS.BEARER_TOKEN,
				])
				const isSignedIn = !!result[STORAGE_KEYS.BEARER_TOKEN]
				setUserSignedIn(isSignedIn)
			} catch (error) {
				console.error("Error checking auth status:", error)
				setUserSignedIn(false)
			} finally {
				setLoading(false)
			}
		}

		const getCurrentTab = async () => {
			try {
				const tabs = await chrome.tabs.query({
					active: true,
					currentWindow: true,
				})
				if (tabs.length > 0 && tabs[0].url && tabs[0].title) {
					setCurrentUrl(tabs[0].url)
					setCurrentTitle(tabs[0].title)
				}
			} catch (error) {
				console.error("Error getting current tab:", error)
			}
		}

		checkAuthStatus()
		getCurrentTab()
	}, [])

	const handleProjectSelect = (project: Project) => {
		setDefaultProjectMutation.mutate(project, {
			onSuccess: () => {
				setShowProjectSelector(false)
			},
			onError: (error) => {
				console.error("Error setting default project:", error)
			},
		})
	}

	const handleShowProjectSelector = () => {
		setShowProjectSelector(true)
	}

	useEffect(() => {
		if (!defaultProject && projects.length > 0) {
			const firstProject = projects[0]
			setDefaultProjectMutation.mutate(firstProject)
		}
	}, [defaultProject, projects, setDefaultProjectMutation])

	const handleSaveCurrentPage = async () => {
		setSaving(true)
		try {
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			})
			if (tabs.length > 0 && tabs[0].id) {
				await chrome.tabs.sendMessage(tabs[0].id, {
					action: "saveMemory",
				})
			}
		} catch (error) {
			console.error("Failed to save current page:", error)
		} finally {
			setSaving(false)
		}
	}

	const handleSignOut = async () => {
		try {
			await chrome.storage.local.remove([STORAGE_KEYS.BEARER_TOKEN])
			setUserSignedIn(false)
			queryClient.clear()
		} catch (error) {
			console.error("Error signing out:", error)
		}
	}

	if (loading) {
		return (
			<div className="popup-container">
				<div className="header">
					<img alt="supermemory" className="logo" src="/icon-48.png" />
					<h1>supermemory</h1>
				</div>
				<div className="content">
					<div>Loading...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="popup-container">
			<div className="header">
				<img
					alt="supermemory"
					className="logo"
					src="https://assets.supermemory.ai/brand/wordmark/dark-transparent.svg"
					style={{ width: "80%", height: "45px" }}
				/>
				{userSignedIn && (
					<button
						className="header-sign-out"
						onClick={handleSignOut}
						title="Logout"
						type="button"
					>
						<svg
							fill="none"
							height="16"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="16"
						>
							<title>Logout</title>
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16,17 21,12 16,7" />
							<line x1="21" x2="9" y1="12" y2="12" />
						</svg>
					</button>
				)}
			</div>
			<div className="content">
				{userSignedIn ? (
					<div className="authenticated">
						{/* Tab Navigation */}
						<div className="tab-navigation">
							<button
								className={`tab-btn ${activeTab === "save" ? "active" : ""}`}
								onClick={() => setActiveTab("save")}
								type="button"
							>
								Save
							</button>
							<button
								className={`tab-btn ${activeTab === "imports" ? "active" : ""}`}
								onClick={() => setActiveTab("imports")}
								type="button"
							>
								Imports
							</button>
						</div>

						{/* Tab Content */}
						{activeTab === "save" ? (
							<div className="tab-content">
								{/* Current Page Info */}
								<div className="current-page">
									<div className="page-info">
										<h3 className="page-title">
											{currentTitle || "Current Page"}
										</h3>
										<p className="page-url">{currentUrl}</p>
									</div>
								</div>

								{/* Project Selection */}
								<div className="project-section">
									<button
										className="project-selector-btn"
										onClick={handleShowProjectSelector}
										type="button"
									>
										<div className="project-selector-content">
											<span className="project-label">Save to project:</span>
											<div className="project-value">
												<span className="project-name">
													{defaultProject
														? defaultProject.name
														: "Default Project"}
												</span>
												<svg
													aria-label="Select project"
													className="project-arrow"
													fill="none"
													height="16"
													stroke="currentColor"
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													viewBox="0 0 24 24"
													width="16"
												>
													<title>Select project</title>
													<path d="M9 18l6-6-6-6" />
												</svg>
											</div>
										</div>
									</button>
								</div>

								{/* Save Button at Bottom */}
								<div className="save-action">
									<button
										className="login-primary-btn"
										disabled={saving}
										onClick={handleSaveCurrentPage}
										type="button"
									>
										{saving ? "Saving..." : "Save Current Page"}
									</button>
								</div>
							</div>
						) : (
							<div className="tab-content">
								{/* Import Actions */}
								<div className="import-actions">
									<div className="import-item">
										<button
											className="chatgpt-btn"
											onClick={() => {
												chrome.tabs.create({
													url: "https://chatgpt.com/#settings/Personalization",
												})
											}}
											type="button"
										>
											<svg
												aria-label="ChatGPT Logo"
												className="chatgpt-logo"
												fill="currentColor"
												role="img"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<title>OpenAI</title>
												<path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
											</svg>
											Import ChatGPT Memories
										</button>
									</div>

									<div className="import-item">
										<button
											className="twitter-btn"
											onClick={() => {
												chrome.tabs.create({
													url: "https://x.com/i/bookmarks",
												})
											}}
											type="button"
										>
											<svg
												aria-label="X Twitter Logo"
												className="twitter-logo"
												fill="currentColor"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<title>X Twitter Logo</title>
												<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
											</svg>
											Import X Bookmarks
										</button>
										<p className="import-instructions">
											Click on supermemory on top right to import bookmarks
										</p>
									</div>
								</div>
							</div>
						)}

						{showProjectSelector && (
							<div className="project-selector">
								<div className="project-selector-header">
									<span>Select the Project</span>
									<button
										className="project-close-btn"
										onClick={() => setShowProjectSelector(false)}
										type="button"
									>
										×
									</button>
								</div>
								{loadingProjects ? (
									<div className="project-loading">Loading projects...</div>
								) : (
									<div className="project-list">
										{projects.map((project) => (
											<button
												className={`project-item ${defaultProject?.id === project.id ? "selected" : ""}`}
												key={project.id}
												onClick={() => handleProjectSelect(project)}
												type="button"
											>
												<div className="project-item-info">
													<span className="project-item-name">
														{project.name}
													</span>
													<span className="project-item-count">
														{project.documentCount} docs
													</span>
												</div>
												{defaultProject?.id === project.id && (
													<span className="project-item-check">✓</span>
												)}
											</button>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				) : (
					<div className="unauthenticated">
						<div className="login-intro">
							<h2 className="login-title">
								Login to unlock all chrome extension features
							</h2>

							<ul className="features-list">
								<li>Save any page to your supermemory</li>
								<li>Import all your Twitter / X Bookmarks</li>
								<li>Import your ChatGPT Memories</li>
							</ul>
						</div>

						<div className="login-actions">
							<p className="login-help">
								Having trouble logging in?{" "}
								<button
									className="help-link"
									onClick={() => {
										window.open("mailto:dhravya@supermemory.com", "_blank")
									}}
									type="button"
								>
									Reach Out to Us
								</button>
							</p>

							<button
								className="login-primary-btn"
								onClick={() => {
									chrome.tabs.create({
										url: import.meta.env.PROD
											? "https://app.supermemory.ai/login"
											: "http://localhost:3000/login",
									})
								}}
								type="button"
							>
								login in
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default App

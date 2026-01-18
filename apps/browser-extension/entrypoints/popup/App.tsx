import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import "./App.css"
import { validateAuthToken } from "../../utils/api"
import { MESSAGE_TYPES, STORAGE_KEYS, UI_CONFIG } from "../../utils/constants"
import {
	useDefaultProject,
	useProjects,
	useSetDefaultProject,
	useUserData,
} from "../../utils/query-hooks"
import {
	autoSearchEnabled as autoSearchEnabledStorage,
	autoCapturePromptsEnabled as autoCapturePromptsEnabledStorage,
	bearerToken,
	defaultProject as defaultProjectStorage,
	userData as userDataStorage,
} from "../../utils/storage"
import type { Project } from "../../utils/types"
import { RightArrow } from "@/components/icons"

const Tooltip = ({
	children,
	content,
}: {
	children: React.ReactNode
	content: string
}) => {
	const [isVisible, setIsVisible] = useState(false)

	return (
		<div className="relative inline-flex items-center gap-1">
			<button
				type="button"
				onMouseEnter={() => setIsVisible(true)}
				onMouseLeave={() => setIsVisible(false)}
				className="cursor-help bg-transparent border-none p-0 text-left"
			>
				{children}
			</button>
			<button
				type="button"
				onMouseEnter={() => setIsVisible(true)}
				onMouseLeave={() => setIsVisible(false)}
				className="cursor-help bg-transparent border-none p-0 text-[#737373] transition-colors"
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<title>More information</title>
					<circle cx="12" cy="12" r="10" />
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
					<line x1="12" y1="17" x2="12.01" y2="17" />
				</svg>
			</button>
			{isVisible && (
				<div className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-lg bottom-full right-0 mb-1 max-w-xs wrap-break-word">
					{content}
					<div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
				</div>
			)}
		</div>
	)
}

function App() {
	const [userSignedIn, setUserSignedIn] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(true)
	const [showProjectSelector, setShowProjectSelector] = useState<boolean>(false)
	const [currentUrl, setCurrentUrl] = useState<string>("")
	const [currentTitle, setCurrentTitle] = useState<string>("")
	const [saving, setSaving] = useState<boolean>(false)
	const [activeTab, setActiveTab] = useState<"save" | "imports" | "settings">(
		"save",
	)
	const [autoSearchEnabled, setAutoSearchEnabled] = useState<boolean>(false)
	const [autoCapturePromptsEnabled, setAutoCapturePromptsEnabled] =
		useState<boolean>(false)
	const [authInvalidated, setAuthInvalidated] = useState<boolean>(false)

	const queryClient = useQueryClient()
	const { data: projects = [], isLoading: loadingProjects } = useProjects({
		enabled: userSignedIn,
	})
	const { data: defaultProject } = useDefaultProject({
		enabled: userSignedIn,
	})
	const { data: userData, isLoading: loadingUserData } = useUserData({
		enabled: userSignedIn,
	})
	const setDefaultProjectMutation = useSetDefaultProject()

	// biome-ignore lint/correctness/useExhaustiveDependencies: suppress dependency analysis
	useEffect(() => {
		const checkAuthStatus = async () => {
			try {
				const [token, autoSearch, autoCapturePrompts] = await Promise.all([
					bearerToken.getValue(),
					autoSearchEnabledStorage.getValue(),
					autoCapturePromptsEnabledStorage.getValue(),
				])

				const hasToken = !!token

				if (hasToken) {
					const isTokenValid = await validateAuthToken()

					if (isTokenValid) {
						setUserSignedIn(true)
						setAuthInvalidated(false)
					} else {
						await Promise.all([
							bearerToken.removeValue(),
							userDataStorage.removeValue(),
							defaultProjectStorage.removeValue(),
						])
						queryClient.clear()
						setUserSignedIn(false)
						setAuthInvalidated(true)
					}
				} else {
					setUserSignedIn(false)
					setAuthInvalidated(false)
				}

				setAutoSearchEnabled(autoSearch ?? false)
				setAutoCapturePromptsEnabled(autoCapturePrompts ?? false)
			} catch (error) {
				console.error("Error checking auth status:", error)
				setUserSignedIn(false)
				setAuthInvalidated(false)
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: close space selector when tab changes
	useEffect(() => {
		setShowProjectSelector(false)
	}, [activeTab])

	const handleSaveCurrentPage = async () => {
		setSaving(true)

		try {
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			})
			if (tabs.length > 0 && tabs[0].id) {
				const response = await chrome.tabs.sendMessage(tabs[0].id, {
					action: MESSAGE_TYPES.SAVE_MEMORY,
					actionSource: "popup",
				})

				if (response?.success) {
					await chrome.tabs.sendMessage(tabs[0].id, {
						action: MESSAGE_TYPES.SHOW_TOAST,
						state: "success",
					})
				}

				window.close()
			}
		} catch (error) {
			console.error("Failed to save current page:", error)

			try {
				const tabs = await chrome.tabs.query({
					active: true,
					currentWindow: true,
				})
				if (tabs.length > 0 && tabs[0].id) {
					await chrome.tabs.sendMessage(tabs[0].id, {
						action: MESSAGE_TYPES.SHOW_TOAST,
						state: "error",
					})
				}
			} catch (toastError) {
				console.error("Failed to show error toast:", toastError)
			}

			window.close()
		} finally {
			setSaving(false)
		}
	}

	const handleAutoSearchToggle = async (enabled: boolean) => {
		try {
			await autoSearchEnabledStorage.setValue(enabled)
			setAutoSearchEnabled(enabled)
		} catch (error) {
			console.error("Error updating auto search setting:", error)
		}
	}

	const handleAutoCapturePromptsToggle = async (enabled: boolean) => {
		try {
			await autoCapturePromptsEnabledStorage.setValue(enabled)
			setAutoCapturePromptsEnabled(enabled)
		} catch (error) {
			console.error("Error updating auto capture prompts setting:", error)
		}
	}

	const handleSignOut = async () => {
		try {
			await Promise.all([
				bearerToken.removeValue(),
				userDataStorage.removeValue(),
				defaultProjectStorage.removeValue(),
			])
			setUserSignedIn(false)
			queryClient.clear()
		} catch (error) {
			console.error("Error signing out:", error)
		}
	}

	if (loading) {
		return (
			<div
				className="w-80 p-0 font-[Space_Grotesk,-apple-system,BlinkMacSystemFont,Segoe_UI,Roboto,sans-serif] rounded-lg relative overflow-hidden"
				style={{
					background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
					boxShadow:
						"1.5px 1.5px 20px 0 rgba(0, 0, 0, 0.65), 1px 1.5px 2px 0 rgba(128, 189, 255, 0.07) inset, -0.5px -1.5px 4px 0 rgba(0, 35, 73, 0.40) inset",
				}}
			>
				<div
					id="popup-header"
					className="flex items-center justify-between p-2.5 relative"
				>
					<div className="flex items-center gap-2">
						<div
							className="w-8 h-8 shrink-0 rounded-[3.75px] overflow-hidden relative"
							style={{ boxShadow: "inset 0px 1px 3.75px 0px #000" }}
						>
							<img
								alt="supermemory"
								src="./icon-48.png"
								className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[29px] h-[29px]"
							/>
						</div>
						<div className="flex flex-col">
							<span className="text-[11px] font-medium text-[#737373] leading-normal">
								Your
							</span>
							<img
								alt="supermemory"
								src="./logo-fullmark.svg"
								className="h-[14.5px] w-auto"
							/>
						</div>
					</div>
				</div>

				<div className="p-4 min-h-[300px] flex items-center justify-center">
					<div className="flex items-center gap-3 text-sm text-[#737373]">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="1em"
							height="1em"
							viewBox="0 0 24 24"
							fill="currentColor"
							className="text-[#737373]"
							aria-hidden="true"
						>
							<path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z">
								<animateTransform
									attributeName="transform"
									type="rotate"
									values="0 12 12;360 12 12"
									dur="0.75s"
									repeatCount="indefinite"
								/>
							</path>
						</svg>

						<span className="font-medium">Loading...</span>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div
			className="w-80 font-[Space_Grotesk,-apple-system,BlinkMacSystemFont,Segoe_UI,Roboto,sans-serif] rounded-lg relative overflow-hidden p-4"
			style={{
				background: "linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
				boxShadow:
					"1.5px 1.5px 20px 0 rgba(0, 0, 0, 0.65), 1px 1.5px 2px 0 rgba(128, 189, 255, 0.07) inset, -0.5px -1.5px 4px 0 rgba(0, 35, 73, 0.40) inset",
			}}
		>
			<div
				id="popup-header"
				className="flex items-center justify-between p-2.5 relative"
			>
				<div className="flex items-center gap-2">
					<div
						className="w-8 h-8 shrink-0 rounded-[3.75px] overflow-hidden relative"
						style={{ boxShadow: "inset 0px 1px 3.75px 0px #000" }}
					>
						<img
							alt="supermemory"
							src="./icon-48.png"
							className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[29px] h-[29px]"
						/>
					</div>
					<div className="flex flex-col">
						<span className="text-[11px] font-medium text-[#737373] leading-normal">
							{(() => {
								const name =
									userData?.name?.split(" ")[0] ||
									userData?.email?.split("@")[0]
								if (!name) return "Your"
								return name.endsWith("s") ? `${name}'` : `${name}'s`
							})()}
						</span>
						<img
							alt="supermemory"
							src="./logo-fullmark.svg"
							className="h-[14.5px] w-auto"
						/>
					</div>
				</div>
				{userSignedIn && (
					<button
						className="bg-transparent border-none cursor-pointer p-1 rounded transition-colors duration-200"
						onClick={handleSignOut}
						aria-label="Logout"
						type="button"
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<title>Logout</title>
							<path
								d="M17 9H7.5M15 12L18 9L15 6M10 4V3C10 2.46957 9.78929 1.96086 9.41421 1.58579C9.03914 1.21071 8.53043 1 8 1H3C2.46957 1 1.96086 1.21071 1.58579 1.58579C1.21071 1.96086 1 2.46957 1 3V15C1 15.5304 1.21071 16.0391 1.58579 16.4142C1.96086 16.7893 2.46957 17 3 17H8C8.53043 17 9.03914 16.7893 9.41421 16.4142C9.78929 16.0391 10 15.5304 10 15V14"
								stroke="#FAFAFA"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				)}
			</div>
			<div className="min-h-[250px] pt-1">
				{userSignedIn ? (
					<div className="text-left">
						{/* Tab Navigation */}
						<div className="flex bg-[#000000] rounded-xl p-1 mb-4 border border-[#FFFFFF12]">
							<button
								className={`flex-1 py-2 px-3 bg-transparent border-none rounded-lg text-sm cursor-pointer transition-all duration-200 outline-none appearance-none ${
									activeTab === "save"
										? "bg-linear-to-b from-[#0E141C] to-[#0F151F] text-white shadow-sm"
										: "text-gray-500 hover:text-white"
								}`}
								onClick={() => setActiveTab("save")}
								type="button"
							>
								Save
							</button>
							<button
								className={`flex-1 py-2 px-3 bg-transparent border-none rounded-lg text-sm cursor-pointer transition-all duration-200 outline-none appearance-none ${
									activeTab === "imports"
										? "bg-linear-to-b from-[#0E141C] to-[#0F151F] text-white shadow-sm"
										: "text-gray-500 hover:text-white"
								}`}
								onClick={() => setActiveTab("imports")}
								type="button"
							>
								Imports
							</button>
							<button
								className={`flex-1 py-2 px-3 bg-transparent border-none rounded-lg text-sm cursor-pointer transition-all duration-200 outline-none appearance-none ${
									activeTab === "settings"
										? "bg-linear-to-b from-[#0E141C] to-[#0F151F] text-white shadow-sm"
										: "text-gray-500 hover:text-white"
								}`}
								onClick={() => setActiveTab("settings")}
								type="button"
							>
								Settings
							</button>
						</div>

						{/* Tab Content */}
						{activeTab === "save" ? (
							<div className="flex flex-col gap-4 min-h-[200px]">
								{/* Current Page Info */}
								<div className="mb-0">
									<div
										className="bg-[#5B7EF50A] p-4 rounded-xl"
										style={{
											boxShadow:
												"2px 2px 2px 0 rgba(0, 0, 0, 0.50) inset, -1px -1px 1px 0 rgba(82, 89, 102, 0.08) inset",
										}}
									>
										<h3
											className="m-0 mb-1 text-sm font-semibold text-white overflow-hidden text-ellipsis whitespace-nowrap"
											style={{
												background:
													"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
												backgroundClip: "text",
												WebkitBackgroundClip: "text",
												WebkitTextFillColor: "transparent",
											}}
										>
											{currentTitle || "Current Page"}
										</h3>
										<p className="m-0 text-xs text-[#737373] overflow-hidden text-ellipsis whitespace-nowrap">
											{currentUrl}
										</p>
									</div>
								</div>

								{/* Space Selection */}
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between pl-1">
										<span className="text-sm font-medium text-[#737373]">
											Save to Space
										</span>
										{showProjectSelector && (
											<button
												id="close-space-selector"
												className="bg-transparent border-none cursor-pointer p-0 text-[#737373] hover:text-white transition-colors"
												onClick={() => setShowProjectSelector(false)}
												type="button"
											>
												<svg
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<title>Close</title>
													<line x1="18" y1="6" x2="6" y2="18" />
													<line x1="6" y1="6" x2="18" y2="18" />
												</svg>
											</button>
										)}
									</div>

									{showProjectSelector ? (
										<div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
											{loadingProjects ? (
												<div className="h-11 flex items-center justify-center text-sm text-[#737373]">
													Loading spaces...
												</div>
											) : (
												projects.map((project) => (
													<button
														id={`space-option-${project.id}`}
														className={`w-full h-11 flex items-center justify-between px-4 rounded-lg bg-transparent border-none cursor-pointer text-left transition-colors duration-200 hover:bg-[#5B7EF510] ${
															defaultProject?.id === project.id
																? "bg-[#5B7EF50A]"
																: ""
														}`}
														style={
															defaultProject?.id === project.id
																? {
																		boxShadow:
																			"2px 2px 1px 0 rgba(0, 0, 0, 0.50) inset, -1px -1px 1px 0 rgba(82, 89, 102, 0.08) inset",
																	}
																: undefined
														}
														key={project.id}
														onClick={() => handleProjectSelect(project)}
														type="button"
													>
														<span className="text-sm font-normal text-[rgba(255,255,255,0.94)] overflow-hidden text-ellipsis whitespace-nowrap tracking-tight">
															{project.name}
														</span>
														{defaultProject?.id === project.id && (
															<svg
																width="16"
																height="16"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2"
																strokeLinecap="round"
																strokeLinejoin="round"
																className="text-white shrink-0"
															>
																<title>Selected</title>
																<polyline points="20 6 9 17 4 12" />
															</svg>
														)}
													</button>
												))
											)}
										</div>
									) : (
										<button
											id="space-selector-trigger"
											className="w-full h-11 flex items-center justify-between px-4 rounded-lg bg-[#5B7EF50A] border-none cursor-pointer text-left transition-colors duration-200 hover:bg-[#5B7EF520]"
											onClick={handleShowProjectSelector}
											type="button"
											style={{
												boxShadow:
													"2px 2px 1px 0 rgba(0, 0, 0, 0.50) inset, -1px -1px 1px 0 rgba(82, 89, 102, 0.08) inset",
											}}
										>
											<span className="text-sm font-normal text-[rgba(255,255,255,0.94)] overflow-hidden text-ellipsis whitespace-nowrap tracking-tight">
												{defaultProject
													? defaultProject.name
													: "Select a space"}
											</span>
											<svg
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="text-white shrink-0"
											>
												<title>Expand</title>
												<polyline points="6 9 12 15 18 9" />
											</svg>
										</button>
									)}
								</div>

								{/* Save Button at Bottom */}
								<div className="mt-auto pt-4">
									<button
										className="w-full py-3 px-6 text-white border-none rounded-xl text-base font-medium cursor-pointer transition-colors duration-200 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3"
										disabled={saving}
										onClick={handleSaveCurrentPage}
										style={{
											background:
												"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)",
											boxShadow:
												"1px 1px 2px 0px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20)",
										}}
										type="button"
									>
										<svg
											width="20"
											height="16"
											viewBox="0 0 20 16"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<title>Add to Supermemory</title>
											<g clip-path="url(#clip0_2_8851)">
												<path
													d="M19.4295 6.3108H12.1691V0H9.82324V6.84734C9.82324 7.57459 10.1103 8.27304 10.6206 8.78766L16.549 14.7664L18.2077 13.0936L13.8291 8.6779H19.4309V6.31219L19.4295 6.3108Z"
													fill="#FAFAFA"
												/>
												<path
													d="M1.08945 2.90808L5.46808 7.32387H-0.133789V9.68958H7.12669V16.0003H9.4725V9.15304C9.4725 8.42574 9.18541 7.72728 8.67512 7.21272L2.74809 1.23535L1.08945 2.90808Z"
													fill="#FAFAFA"
												/>
											</g>
											<defs>
												<clipPath id="clip0_2_8851">
													<rect width="19.7333" height="16" fill="white" />
												</clipPath>
											</defs>
										</svg>

										{saving ? "Saving..." : "Add to supermemory"}
									</button>
								</div>
							</div>
						) : activeTab === "imports" ? (
							<div className="flex flex-col gap-4 min-h-[200px]">
								{/* Import Actions */}
								<div className="flex flex-col gap-4">
									<div className="flex flex-col gap-2">
										<button
											className="w-full p-4 bg-[#5B7EF50A] text-white border-none rounded-xl text-sm cursor-pointer flex items-start justify-start transition-colors duration-200 hover:bg-[#5B7EF520]"
											style={{
												boxShadow:
													"2px 2px 2px 0 rgba(0, 0, 0, 0.50) inset, -1px -1px 1px 0 rgba(82, 89, 102, 0.08) inset",
											}}
											onClick={() => {
												chrome.tabs.create({
													url: "https://chatgpt.com/#settings/Personalization",
												})
											}}
											type="button"
										>
											<div className="text-left">
												<p className="flex items-center gap-2 font-medium">
													<svg
														aria-label="ChatGPT Logo"
														className="w-3 h-3.5 shrink-0"
														fill="currentColor"
														role="img"
														viewBox="0 0 24 24"
														xmlns="http://www.w3.org/2000/svg"
													>
														<title>OpenAI</title>
														<path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
													</svg>
													Import ChatGPT Memories
												</p>
												<p className="m-0 text-[14px] text-[#737373] leading-tight">
													open 'manage' &gt; save your memories to supermemory
												</p>
											</div>
											<RightArrow className="size-4" />
										</button>
									</div>

									<div className="flex flex-col gap-2">
										<button
											className="w-full p-4 bg-[#5B7EF50A] text-white border-none rounded-xl text-sm cursor-pointer flex items-start justify-start transition-colors duration-200 outline-none appearance-none hover:bg-[#5B7EF520] focus:outline-none"
											style={{
												boxShadow:
													"2px 2px 2px 0 rgba(0, 0, 0, 0.50) inset, -1px -1px 1px 0 rgba(82, 89, 102, 0.08) inset",
											}}
											onClick={async () => {
												const targetUrl = "https://x.com/i/bookmarks"

												try {
													const [activeTab] = await chrome.tabs.query({
														active: true,
														currentWindow: true,
													})

													const isOnBookmarksPage =
														activeTab?.url?.includes("x.com/i/bookmarks") ||
														activeTab?.url?.includes("twitter.com/i/bookmarks")

													if (isOnBookmarksPage && activeTab?.id) {
														try {
															await chrome.tabs.sendMessage(activeTab.id, {
																action: MESSAGE_TYPES.TWITTER_IMPORT_OPEN_MODAL,
															})
														} catch (error) {
															// Content script may not be loaded yet, fall back to intent-based approach
															console.error(
																"Failed to send message to content script:",
																error,
															)
															const intentExpiry =
																Date.now() + UI_CONFIG.IMPORT_INTENT_TTL
															await chrome.storage.local.set({
																[STORAGE_KEYS.TWITTER_BOOKMARKS_IMPORT_INTENT_UNTIL]:
																	intentExpiry,
															})
															await chrome.tabs.create({
																url: targetUrl,
															})
														}
													} else {
														const intentExpiry =
															Date.now() + UI_CONFIG.IMPORT_INTENT_TTL
														await chrome.storage.local.set({
															[STORAGE_KEYS.TWITTER_BOOKMARKS_IMPORT_INTENT_UNTIL]:
																intentExpiry,
														})
														await chrome.tabs.create({
															url: targetUrl,
														})
													}
												} catch (error) {
													console.error("Error opening Twitter import:", error)
													// Fallback: try to open the bookmarks page anyway
													try {
														await chrome.tabs.create({
															url: targetUrl,
														})
													} catch (fallbackError) {
														console.error(
															"Failed to open bookmarks page:",
															fallbackError,
														)
													}
												}
											}}
											type="button"
										>
											<div className="text-left">
												<p className="flex items-center gap-2 font-medium">
													<svg
														aria-label="X Twitter Logo"
														className="w-3 h-3.5 shrink-0"
														fill="currentColor"
														viewBox="0 0 24 24"
														xmlns="http://www.w3.org/2000/svg"
													>
														<title>X Twitter Logo</title>
														<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
													</svg>
													Import X/Twitter Bookmarks
												</p>
												<p className="m-0 text-[14px] text-[#737373] leading-tight">
													Opens import dialog automatically
												</p>
											</div>
											<RightArrow className="size-4" />
										</button>
									</div>
								</div>
							</div>
						) : (
							<div className="flex flex-col gap-4 min-h-[200px] pl-1">
								{/* Account Section */}
								<div>
									<div className="flex flex-col gap-2">
										{loadingUserData ? (
											<div className="text-sm text-[#737373]">
												Loading account data...
											</div>
										) : userData?.email ? (
											<>
												<span className="font-medium text-base text-white">
													Email
												</span>
												<span
													className="text-sm text-[#525966] p-3 rounded-xl bg-[#5B7EF50A]"
													style={{
														border: "1px solid rgba(255, 255, 255, 0.07)",
													}}
												>
													{userData.email}
												</span>
											</>
										) : (
											<div className="text-sm text-[#737373]">
												No email found
											</div>
										)}
									</div>
								</div>

								{/* Chat Integration Section */}
								<div className="mb-4">
									<h3 className="text-base font-semibold mb-3 text-white">
										Chat Integration
									</h3>
									<div className="flex items-center justify-between p-3 rounded-xl bg-[#5B7EF50A] mb-3">
										<div className="flex items-center text-[#737373]">
											<Tooltip content="Automatically search your memories while typing in chat apps">
												<span className="text-sm font-medium cursor-help">
													Auto Search Memories
												</span>
											</Tooltip>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												checked={autoSearchEnabled}
												className="sr-only peer"
												onChange={(e) =>
													handleAutoSearchToggle(e.target.checked)
												}
												type="checkbox"
											/>
											<div className="w-11 h-6 bg-[#21212180] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#262A30] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06080B] peer-checked:after:bg-[#15418A]" />
										</label>
									</div>
									<div className="flex items-center justify-between p-3 rounded-xl bg-[#5B7EF50A]">
										<div className="flex items-center text-[#737373]">
											<Tooltip content="Automatically save your prompts as memories in chat apps">
												<span className="text-sm font-medium cursor-help">
													Auto Capture Prompts
												</span>
											</Tooltip>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												checked={autoCapturePromptsEnabled}
												className="sr-only peer"
												onChange={(e) =>
													handleAutoCapturePromptsToggle(e.target.checked)
												}
												type="checkbox"
											/>
											<div className="w-11 h-6 bg-[#21212180] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#262A30] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06080B] peer-checked:after:bg-[#15418A]" />
										</label>
									</div>
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="text-center py-2">
						{authInvalidated ? (
							<div className="mb-8">
								<div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
									<h2 className="m-0 mb-2 text-sm font-semibold text-red-800 leading-tight">
										Session Expired
									</h2>
									<p className="m-0 text-xs text-red-600 leading-tight">
										Logged out since authentication was invalidated. Please
										login again.
									</p>
								</div>
							</div>
						) : (
							<div className="mb-8">
								<h2 className="m-0 mb-4 text-sm font-normal leading-tight">
									Login to unlock all chrome extension features
								</h2>

								<ul className="list-none p-0 m-0 text-left">
									<li className="py-1.5 text-sm text-[#737373] relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-[#737373] before:font-bold">
										Save any page to your supermemory
									</li>
									<li className="py-1.5 text-sm text-[#737373] relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-[#737373] before:font-bold">
										Import all your Twitter / X Bookmarks
									</li>
									<li className="py-1.5 text-sm text-[#737373] relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-[#737373] before:font-bold">
										Import your ChatGPT Memories
									</li>
								</ul>
							</div>
						)}

						<div className="mt-8">
							<p className="m-0 mb-4 text-sm text-[#737373]">
								Having trouble logging in?{" "}
								<button
									className="bg-transparent border-none text-blue-500 cursor-pointer underline text-sm p-0 hover:text-blue-700"
									onClick={() => {
										window.open("mailto:support@supermemory.ai", "_blank")
									}}
									type="button"
								>
									Reach Out to Us
								</button>
							</p>

							<button
								className="w-full py-3 px-6 bg-gray-700 text-white border-none rounded-3xl text-base font-medium cursor-pointer transition-colors duration-200 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
								onClick={() => {
									chrome.tabs.create({
										url: import.meta.env.PROD
											? "https://app.supermemory.ai/login"
											: "http://localhost:3000/login",
									})
								}}
								type="button"
							>
								Sign in or create account
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default App

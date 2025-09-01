import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import "./App.css";
import { STORAGE_KEYS } from "../../utils/constants";
import {
	useDefaultProject,
	useProjects,
	useSetDefaultProject,
} from "../../utils/query-hooks";
import type { Project } from "../../utils/types";

function App() {
	const [userSignedIn, setUserSignedIn] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [showProjectSelector, setShowProjectSelector] =
		useState<boolean>(false);
	const [currentUrl, setCurrentUrl] = useState<string>("");
	const [currentTitle, setCurrentTitle] = useState<string>("");
	const [saving, setSaving] = useState<boolean>(false);
	const [activeTab, setActiveTab] = useState<"save" | "imports">("save");

	const queryClient = useQueryClient();
	const { data: projects = [], isLoading: loadingProjects } = useProjects({
		enabled: userSignedIn,
	});
	const { data: defaultProject } = useDefaultProject({
		enabled: userSignedIn,
	});
	const setDefaultProjectMutation = useSetDefaultProject();

	useEffect(() => {
		const checkAuthStatus = async () => {
			try {
				const result = await chrome.storage.local.get([
					STORAGE_KEYS.BEARER_TOKEN,
				]);
				const isSignedIn = !!result[STORAGE_KEYS.BEARER_TOKEN];
				setUserSignedIn(isSignedIn);
			} catch (error) {
				console.error("Error checking auth status:", error);
				setUserSignedIn(false);
			} finally {
				setLoading(false);
			}
		};

		const getCurrentTab = async () => {
			try {
				const tabs = await chrome.tabs.query({
					active: true,
					currentWindow: true,
				});
				if (tabs.length > 0 && tabs[0].url && tabs[0].title) {
					setCurrentUrl(tabs[0].url);
					setCurrentTitle(tabs[0].title);
				}
			} catch (error) {
				console.error("Error getting current tab:", error);
			}
		};

		checkAuthStatus();
		getCurrentTab();
	}, []);

	const handleProjectSelect = (project: Project) => {
		setDefaultProjectMutation.mutate(project, {
			onSuccess: () => {
				setShowProjectSelector(false);
			},
			onError: (error) => {
				console.error("Error setting default project:", error);
			},
		});
	};

	const handleShowProjectSelector = () => {
		setShowProjectSelector(true);
	};

	useEffect(() => {
		if (!defaultProject && projects.length > 0) {
			const firstProject = projects[0];
			setDefaultProjectMutation.mutate(firstProject);
		}
	}, [defaultProject, projects, setDefaultProjectMutation]);

	const handleSaveCurrentPage = async () => {
		setSaving(true);
		try {
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			if (tabs.length > 0 && tabs[0].id) {
				await chrome.tabs.sendMessage(tabs[0].id, {
					action: "saveMemory",
				});
			}
		} catch (error) {
			console.error("Failed to save current page:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleSignOut = async () => {
		try {
			await chrome.storage.local.remove([STORAGE_KEYS.BEARER_TOKEN]);
			setUserSignedIn(false);
			queryClient.clear();
		} catch (error) {
			console.error("Error signing out:", error);
		}
	};

	if (loading) {
		return (
			<div className="w-80 p-0 font-[Space_Grotesk,-apple-system,BlinkMacSystemFont,Segoe_UI,Roboto,sans-serif] bg-white rounded-lg relative overflow-hidden">
				<div className="flex items-center justify-between gap-3 p-2.5 border-b border-gray-200 relative">
					<img
						alt="supermemory"
						className="w-8 h-8 flex-shrink-0"
						src="/icon-48.png"
					/>
					<h1 className="m-0 text-lg font-semibold text-black flex-1">
						supermemory
					</h1>
				</div>
				<div className="p-4">
					<div>Loading...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-80 p-0 font-[Space_Grotesk,-apple-system,BlinkMacSystemFont,Segoe_UI,Roboto,sans-serif] bg-white rounded-lg relative overflow-hidden">
			<div className="flex items-center justify-between gap-3 p-2.5 border-b border-gray-200 relative">
				<img
					alt="supermemory"
					className="w-8 h-8 flex-shrink-0"
					src="https://assets.supermemory.ai/brand/wordmark/dark-transparent.svg"
					style={{ width: "80%", height: "45px" }}
				/>
				{userSignedIn && (
					<button
						className="bg-none border-none text-base cursor-pointer text-gray-500 p-1 rounded transition-colors duration-200 hover:text-black hover:bg-gray-100"
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
			<div className="p-4">
				{userSignedIn ? (
					<div className="text-left">
						{/* Tab Navigation */}
						<div className="flex bg-gray-100 rounded-lg p-1 mb-4">
							<button
								className={`flex-1 py-2 px-4 bg-transparent border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 outline-none appearance-none ${
									activeTab === "save"
										? "bg-white text-black shadow-sm"
										: "text-gray-500 hover:text-gray-700"
								}`}
								onClick={() => setActiveTab("save")}
								type="button"
							>
								Save
							</button>
							<button
								className={`flex-1 py-2 px-4 bg-transparent border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 outline-none appearance-none ${
									activeTab === "imports"
										? "bg-white text-black shadow-sm"
										: "text-gray-500 hover:text-gray-700"
								}`}
								onClick={() => setActiveTab("imports")}
								type="button"
							>
								Imports
							</button>
						</div>

						{/* Tab Content */}
						{activeTab === "save" ? (
							<div className="flex flex-col gap-4 min-h-[200px]">
								{/* Current Page Info */}
								<div className="mb-0">
									<div className="bg-gray-50 p-3 rounded-md border border-gray-200">
										<h3 className="m-0 mb-1 text-sm font-semibold text-black overflow-hidden text-ellipsis whitespace-nowrap">
											{currentTitle || "Current Page"}
										</h3>
										<p className="m-0 text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
											{currentUrl}
										</p>
									</div>
								</div>

								{/* Project Selection */}
								<div className="mb-0">
									<button
										className="w-full bg-transparent border-none p-0 cursor-pointer text-left"
										onClick={handleShowProjectSelector}
										type="button"
									>
										<div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200 hover:bg-gray-200 hover:border-gray-300">
											<span className="text-sm font-medium text-gray-600">
												Save to project:
											</span>
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium text-black overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">
													{defaultProject
														? defaultProject.name
														: "Default Project"}
												</span>
												<svg
													aria-label="Select project"
													className="text-gray-500 flex-shrink-0 transition-transform duration-200 hover:text-gray-700 hover:translate-x-0.5"
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
								<div className="mt-auto pt-4">
									<button
										className="w-full py-3 px-6 bg-gray-700 text-white border-none rounded-3xl text-base font-medium cursor-pointer transition-colors duration-200 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
										disabled={saving}
										onClick={handleSaveCurrentPage}
										type="button"
									>
										{saving ? "Saving..." : "Save Current Page"}
									</button>
								</div>
							</div>
						) : (
							<div className="flex flex-col gap-4 min-h-[200px]">
								{/* Import Actions */}
								<div className="flex flex-col gap-4">
									<div className="flex flex-col gap-2">
										<button
											className="w-full py-3 px-3 bg-white text-black border border-gray-200 rounded-md text-sm font-medium cursor-pointer flex items-center justify-center transition-colors duration-200 hover:bg-gray-50"
											onClick={() => {
												chrome.tabs.create({
													url: "https://chatgpt.com/#settings/Personalization",
												});
											}}
											type="button"
										>
											<svg
												aria-label="ChatGPT Logo"
												className="w-4.5 h-4.5 flex-shrink-0 mr-2"
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

									<div className="flex flex-col gap-2">
										<button
											className="w-full py-3 px-3 bg-white text-black border border-gray-200 rounded-md text-sm font-medium cursor-pointer flex items-center justify-center transition-colors duration-200 outline-none appearance-none hover:bg-gray-50 focus:outline-none"
											onClick={() => {
												chrome.tabs.create({
													url: "https://x.com/i/bookmarks",
												});
											}}
											type="button"
										>
											<svg
												aria-label="X Twitter Logo"
												className="w-4.5 h-4.5 flex-shrink-0 mr-2"
												fill="currentColor"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<title>X Twitter Logo</title>
												<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
											</svg>
											Import X Bookmarks
										</button>
										<p className="m-0 text-xs text-gray-500 leading-tight pl-1">
											Click on supermemory on top right to import bookmarks
										</p>
									</div>
								</div>
							</div>
						)}

						{showProjectSelector && (
							<div className="absolute inset-0 bg-white rounded-lg z-[1000] shadow-xl flex flex-col">
								<div className="flex justify-between items-center p-4 border-b border-gray-200 text-base font-semibold text-black flex-shrink-0">
									<span>Select the Project</span>
									<button
										className="bg-transparent border-none text-xl cursor-pointer text-gray-500 p-0 w-6 h-6 flex items-center justify-center hover:text-black"
										onClick={() => setShowProjectSelector(false)}
										type="button"
									>
										×
									</button>
								</div>
								{loadingProjects ? (
									<div className="py-8 px-4 text-center text-gray-500 text-sm">
										Loading projects...
									</div>
								) : (
									<div className="flex-1 overflow-y-auto min-h-0">
										{projects.map((project) => (
											<button
												className={`flex justify-between items-center py-3 px-4 cursor-pointer transition-colors duration-200 border-b border-gray-100 bg-transparent border-none w-full text-left last:border-b-0 hover:bg-gray-50 ${
													defaultProject?.id === project.id ? "bg-blue-50" : ""
												}`}
												key={project.id}
												onClick={() => handleProjectSelect(project)}
												type="button"
											>
												<div className="flex flex-col flex-1 gap-0.5">
													<span className="text-sm font-medium text-black break-words leading-tight">
														{project.name}
													</span>
													<span className="text-xs text-gray-500">
														{project.documentCount} docs
													</span>
												</div>
												{defaultProject?.id === project.id && (
													<span className="text-blue-600 font-bold text-base">
														✓
													</span>
												)}
											</button>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				) : (
					<div className="text-center py-2">
						<div className="mb-8">
							<h2 className="m-0 mb-4 text-sm font-normal text-black leading-tight">
								Login to unlock all chrome extension features
							</h2>

							<ul className="list-none p-0 m-0 text-left">
								<li className="py-1.5 text-sm text-black relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-black before:font-bold">
									Save any page to your supermemory
								</li>
								<li className="py-1.5 text-sm text-black relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-black before:font-bold">
									Import all your Twitter / X Bookmarks
								</li>
								<li className="py-1.5 text-sm text-black relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-black before:font-bold">
									Import your ChatGPT Memories
								</li>
							</ul>
						</div>

						<div className="mt-8">
							<p className="m-0 mb-4 text-sm text-gray-500">
								Having trouble logging in?{" "}
								<button
									className="bg-transparent border-none text-blue-500 cursor-pointer underline text-sm p-0 hover:text-blue-700"
									onClick={() => {
										window.open("mailto:dhravya@supermemory.com", "_blank");
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
									});
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
	);
}

export default App;

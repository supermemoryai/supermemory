import React, { useEffect, useRef, useState } from "react";
import { Readability } from "@mozilla/readability";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/shadcn/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/shadcn/popover";
import { Toaster } from "./ui/shadcn/toaster";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "./ui/shadcn/select";
import { useToast } from "./ui/shadcn/use-toast";
import { Input } from "./ui/shadcn/input";
import { Label } from "./ui/shadcn/label";
import { Textarea } from "./ui/shadcn/textarea";
import ShowCommandMenu from "./showCommandMenu";

const BACKEND_URL = "https://supermemory.ai";

export default function ContentApp({
	token,
	shadowRoot,
}: {
	token: string | undefined;
	shadowRoot: ShadowRoot;
}) {
	const [hover, setHover] = useState(false);

	const { toast } = useToast();

	const [loading, setLoading] = useState(false);

	const [webNote, setWebNote] = useState<string>("");

	const [importedMessage, setImportedMessage] = useState("Importing...");
	const [isImporting, setIsImporting] = useState(false);
	const [importDone, setImportDone] = useState(false);

	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null,
	);
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const [isPopover2Open, setIsPopover2Open] = useState(false);

	const [spacesOptions, setSpacesOptions] = useState<
		{ id: number; name: string }[]
	>([]);
	const [selectedSpace, setSelectedSpace] = useState<string>();

	const [userNotLoggedIn, setUserNotLoggedIn] = useState(false);

	const showLoginToast = async () => {
		setUserNotLoggedIn(true);

		const NOSHOW_TOAST = ["accounts.google.com", "supermemory.ai"];

		const noLoginWarning = await chrome.storage.local.get("noLoginWarning");
		if (Object.keys(noLoginWarning).length > 0) {
			return;
		}

		if (!NOSHOW_TOAST.includes(window.location.host)) {
			const t = toast({
				title: "Please login to supermemory.ai to use this extension.",
				action: (
					<div className="flex flex-col gap-2">
						<button
							onClick={() =>
								window.open("https://supermemory.ai/signin", "_blank")
							}
						>
							Login
						</button>

						<button
							className="text-xs"
							onClick={async () => {
								await chrome.storage.local.set({
									noLoginWarning: true,
								});
								t.dismiss();
							}}
						>
							Ignore
						</button>
					</div>
				),
			});
		}
	};

	const [timer, setTimer] = useState(null);
	const [progress, setProgress] = useState(0);
	type TimerId = ReturnType<typeof setTimeout>;
	const timerRef = useRef<TimerId | null>(null);
	const saveTimeoutRef = useRef<TimerId | null>(null);

	useEffect(() => {
		if (isPopoverOpen) {
			startTimer();
		} else {
			stopTimer();
		}

		return () => {
			stopTimer();
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [isPopoverOpen]);

	const startTimer = () => {
		stopTimer();
		setProgress(0);
		timerRef.current = setInterval(() => {
			setProgress((prev) => {
				if (prev >= 100) {
					stopTimer();
					scheduleSave();
					return 100;
				}
				return prev + 5;
			});
		}, 100);
	};

	const stopTimer = () => {
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
	};

	const scheduleSave = () => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}
		saveTimeoutRef.current = setTimeout(() => {
			saveContent();
			saveTimeoutRef.current = null;
		}, 500);
	};

	const saveContent = async () => {
		await sendUrlToAPI(selectedSpace ? [selectedSpace] : []);
	};

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		setWebNote(e.target.value);
		stopTimer();
	};

	const handleSelectChange = (value: string) => {
		setSelectedSpace(value);
		stopTimer();
	};

	useEffect(() => {
		document.addEventListener("mousemove", (e) => {
			const percentageX = (e.clientX / window.innerWidth) * 100;
			const percentageY = (e.clientY / window.innerHeight) * 100;

			if (percentageX > 75 && percentageY > 75) {
				setHover(true);
			} else {
				setHover(false);
			}
		});

		const getUserData = () => {
			chrome.runtime.sendMessage({ type: "getJwt" });
		};

		getUserData();

		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			if (request.type === "import-update") {
				setIsImporting(true);
				setImportedMessage(request.importedMessage);
			}

			if (request.type === "import-done") {
				setIsImporting(false);
				setImportDone(true);
			}

			if (request.type === "supermemory-message") {
				toast({
					title: request.message,
				});
			}
		});
		const handleKeyDown = (e: KeyboardEvent) => {
			if (isPopoverOpen) {
				e.stopPropagation();
				e.preventDefault();
			}
		};
		document.addEventListener("keydown", handleKeyDown, true);

		const portalDiv = document.createElement("div");
		portalDiv.id = "popover-portal";
		shadowRoot.appendChild(portalDiv);
		setPortalContainer(portalDiv);

		return () => {
			document.removeEventListener("mousemove", () => {});
			document.removeEventListener("keydown", handleKeyDown, true);
		};
	}, []);

	const getSpaces = async () => {
		const response = await fetch(`${BACKEND_URL}/api/spaces`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.status === 401) {
			showLoginToast();
			return;
		}

		try {
			const data = await response.json();
			setSpacesOptions(data.data);
		} catch (e) {
			console.error(
				`Error in supermemory.ai extension: ${e}. Please contact the developer https://x.com/dhravyashah`,
			);
		}
	};

	async function sendUrlToAPI(spaces: string[]) {
		setLoading(true);

		setTimeout(() => {
			setLoading(false);
		}, 1500);

		// get the current URL
		const url = window.location.href;

		const blacklist: string[] = [];
		// check if the URL is blacklisted
		if (blacklist.some((blacklisted) => url.includes(blacklisted))) {
			return;
		} else {
			const clone = document.cloneNode(true) as Document;
			const article = new Readability(clone).parse();

			const ogImage = document
				.querySelector('meta[property="og:image"]')
				?.getAttribute("content");

			const favicon = (
				document.querySelector('link[rel="icon"]') as HTMLLinkElement
			)?.href;

			setLoading(true);

			setIsPopoverOpen(false);

			await fetch(`${BACKEND_URL}/api/store`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					pageContent:
						(webNote ? `Note about this website: ${webNote}\n\n` : "") +
						article?.textContent,
					url: url + "#supermemory-user-" + Math.random(),
					title: article?.title.slice(0, 500),
					spaces: spaces,
					description: article?.excerpt.slice(0, 250),
					ogImage: ogImage?.slice(0, 1000),
					image: favicon,
				}),
			}).then(async (rep) => {
				if (rep.status === 401) {
					showLoginToast();
					return;
				}

				const d = await rep.json();

				if (rep.status === 200) {
					toast({
						title: "Saved to supermemory.ai",
						action: (
							<button
								onClick={() => {
									window.open(`https://supermemory.ai`, "_blank");
								}}
							>
								View
							</button>
						),
					});
				} else {
					toast({
						title: `Failed to save to supermemory.ai: ${d.error ?? "Unknown error"}`,
					});
				}
				setLoading(false);
				return rep;
			});
		}
	}

	if (!shadowRoot || !portalContainer) {
		return null;
	}

	return (
		<div className="flex justify-end items-end min-h-screen h-full w-full">
			<Toaster />

			<Popover
				open={isPopoverOpen}
				onOpenChange={() => setIsPopoverOpen(!isPopoverOpen)}
			>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger onClick={async () => await getSpaces()} asChild>
							<PopoverTrigger
								className={`${hover || isPopoverOpen ? "opacity-100" : "opacity-75 pointer-events-none translate-x-3/4"} focus-within:translate-x-0 focus-visible:translate-x-0 size-12 hover:bg-black p-2 rounded-l-2xl transition bg-secondary border-2 border-border opacity-0 absolute flex bottom-20 items-center text-lg`}
							>
								<svg
									className={`w-full h-full size-8 ${loading && "animate-spin"}`}
									width={24}
									height={24}
									viewBox="0 0 42 42"
									fill="currentColor"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M19.0357 8C20.5531 8 21 9.27461 21 10.8438V16.3281H23.5536V14.2212C23.5536 13.1976 23.9468 12.216 24.6467 11.4922L25.0529 11.0721C24.9729 10.8772 24.9286 10.6627 24.9286 10.4375C24.9286 9.54004 25.6321 8.8125 26.5 8.8125C27.3679 8.8125 28.0714 9.54004 28.0714 10.4375C28.0714 11.335 27.3679 12.0625 26.5 12.0625C26.2822 12.0625 26.0748 12.0167 25.8863 11.9339L25.4801 12.354C25.0012 12.8492 24.7321 13.5209 24.7321 14.2212V16.3281H28.9714C29.2045 15.7326 29.7691 15.3125 30.4286 15.3125C31.2964 15.3125 32 16.04 32 16.9375C32 17.835 31.2964 18.5625 30.4286 18.5625C29.7691 18.5625 29.2045 18.1424 28.9714 17.5469H21V21.2031H25.0428C25.2759 20.6076 25.8405 20.1875 26.5 20.1875C27.3679 20.1875 28.0714 20.915 28.0714 21.8125C28.0714 22.71 27.3679 23.4375 26.5 23.4375C25.8405 23.4375 25.2759 23.0174 25.0428 22.4219H21V26.0781H24.4125C25.4023 26.0781 26.3516 26.4847 27.0515 27.2085L29.0292 29.2536C29.2177 29.1708 29.4251 29.125 29.6429 29.125C30.5107 29.125 31.2143 29.8525 31.2143 30.75C31.2143 31.6475 30.5107 32.375 29.6429 32.375C28.775 32.375 28.0714 31.6475 28.0714 30.75C28.0714 30.5248 28.1157 30.3103 28.1958 30.1154L26.2181 28.0703C25.7392 27.5751 25.0897 27.2969 24.4125 27.2969H21V31.1562C21 32.7254 20.5531 34 19.0357 34C17.6165 34 16.4478 32.8879 16.3004 31.4559C16.0451 31.527 15.775 31.5625 15.5 31.5625C13.7665 31.5625 12.3571 30.1051 12.3571 28.3125C12.3571 27.9367 12.421 27.5711 12.5339 27.2359C11.0509 26.657 10 25.1742 10 23.4375C10 21.8176 10.9183 20.416 12.2491 19.766C11.8219 19.2125 11.5714 18.5117 11.5714 17.75C11.5714 16.191 12.6321 14.891 14.0464 14.5711C13.9679 14.2918 13.9286 13.9922 13.9286 13.6875C13.9286 12.1691 14.9402 10.8895 16.3004 10.534C16.4478 9.11211 17.6165 8 19.0357 8Z"
										fill={loading ? "gray" : "#fff"}
									/>
								</svg>
							</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent side="left">
							{userNotLoggedIn ? (
								<>You need to login to use this extension.</>
							) : (
								<p>Add to supermemory.ai</p>
							)}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<PopoverContent
					key={userNotLoggedIn ? "login" : "spaces"}
					container={portalContainer}
				>
					{userNotLoggedIn ? (
						<div className="flex flex-col gap-2">
							<button
								onClick={() => {
									window.open("https://supermemory.ai/signin", "_blank");
								}}
								className="bg-slate-700 text-white p-2 rounded-md"
							>
								Login to supermemory.ai
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							<span className="text-xl text-white">
								Saving to supermemory.ai
							</span>
							<Select onValueChange={handleSelectChange}>
								<SelectTrigger className="text-white">
									<SelectValue
										className="placeholder:font-semibold placeholder:text-white"
										placeholder="Select a space"
									/>
								</SelectTrigger>
								<SelectContent container={portalContainer}>
									<SelectGroup>
										<SelectLabel>Your spaces</SelectLabel>
										{spacesOptions.map((space) => (
											<SelectItem key={space.id} value={`${space.id}`}>
												{space.name}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>

							<Label className="text-slate-400" htmlFor="input-note">
								Add a note
							</Label>
							<Textarea
								value={webNote}
								onChange={handleInputChange}
								placeholder="Add a note"
								className="text-white"
								id="input-note"
							/>

							<button
								onClick={async () => {
									await sendUrlToAPI(selectedSpace ? [selectedSpace] : []);
								}}
								className="bg-slate-700 text-white p-2 rounded-md"
							>
								Add to{" "}
								{selectedSpace
									? spacesOptions.find((s) => s.id === parseInt(selectedSpace))
											?.name
									: "supermemory.ai"}
							</button>
							<div className="relative h-1 w-full bg-gray-300 mt-2">
								<div
									className="absolute h-1 bg-blue-600"
									style={{ width: `${progress}%` }}
								></div>
							</div>
						</div>
					)}
				</PopoverContent>
			</Popover>

			{(window.location.host === "twitter.com" ||
				window.location.host === "x.com") && (
				<Popover open={isPopover2Open} onOpenChange={setIsPopover2Open}>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<PopoverTrigger
									className={`${hover || isPopover2Open ? "opacity-100" : "opacity-75 pointer-events-none translate-x-3/4"} focus-within:translate-x-0 focus-visible:translate-x-0 size-12 hover:bg-black p-2 rounded-l-2xl transition bg-secondary border-2 border-border opacity-0 absolute flex bottom-6 items-center text-lg`}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										className="size-8"
									>
										<path d="M12 1.5a.75.75 0 0 1 .75.75V7.5h-1.5V2.25A.75.75 0 0 1 12 1.5ZM11.25 7.5v5.69l-1.72-1.72a.75.75 0 0 0-1.06 1.06l3 3a.75.75 0 0 0 1.06 0l3-3a.75.75 0 1 0-1.06-1.06l-1.72 1.72V7.5h3.75a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h3.75Z" />
									</svg>
								</PopoverTrigger>
							</TooltipTrigger>
							<TooltipContent side="left">
								{userNotLoggedIn ? (
									<>You need to login to use this extension.</>
								) : (
									<p>Import all twitter bookmarks</p>
								)}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<PopoverContent
						key={userNotLoggedIn ? "login" : "spaces"}
						container={portalContainer}
					>
						{userNotLoggedIn ? (
							<div className="flex flex-col gap-2">
								<button
									onClick={() => {
										window.open("https://supermemory.ai/signin", "_blank");
									}}
									className="bg-slate-700 text-white p-2 rounded-md"
								>
									Login to supermemory.ai
								</button>
							</div>
						) : (
							<div className="flex flex-col gap-2">
								<button
									disabled={isImporting}
									onClick={async () => {
										setIsImporting(true);
										chrome.runtime.sendMessage({ type: "batchImportAll" });
									}}
									className="bg-slate-700 text-white p-2 rounded-md disabled:bg-slate-700/50 disabled:pointer-events-none"
								>
									Import all Twitter bookmarks
								</button>

								{isImporting && (
									<div className="flex items-center gap-2">
										<p>{importedMessage}</p>
										<svg
											className="animate-spin w-6 h-6"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 6v6m0 0v6m0-6h6m-6 0H6"
											/>
										</svg>
									</div>
								)}

								{importDone && (
									<p className="text-green-500">
										All your twitter bookmarks have been imported!
									</p>
								)}
							</div>
						)}
					</PopoverContent>
				</Popover>
			)}
			{/*
      <div className="flex min-h-screen w-screen top-0 left-0 bg-black/50 backdrop-blur-sm items-center justify-center">
        <ShowCommandMenu />
      </div> */}
		</div>
	);
}

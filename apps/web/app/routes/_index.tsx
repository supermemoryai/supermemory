import { Suspense, lazy, memo, useCallback, useEffect, useState } from "react";

import { LoaderFunctionArgs, defer, json, redirect } from "@remix-run/cloudflare";
import { useFetcher, useNavigate, useRouteError } from "@remix-run/react";
import { Await, useLoaderData } from "@remix-run/react";

import { getSignInUrl } from "@supermemory/authkit-remix-cloudflare";
import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { proxy } from "server/proxy";
import { toast } from "sonner";
import MemoryInputForm from "~/components/ChatInputForm";
import Landing from "~/components/Landing";
import Navbar from "~/components/Navbar";
import Suggestions from "~/components/Suggestions";
import { IntegrationModals } from "~/components/memories/Integrations";
import SuggestionsSkeleton from "~/components/skeletons/SuggestionsSkeleton";

const MemoriesPage = lazy(() => import("~/components/memories/MemoriesPage"));
const Reminders = lazy(() => import("~/components/Reminders"));
const MemoizedReminders = memo(Reminders);
const MemoizedNavbar = memo(Navbar);
const MemoizedMemoryInputForm = memo(MemoryInputForm);
const MemoizedSuggestions = memo(Suggestions);

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const session = await getSessionFromRequest(request, context);

	const user = session?.user;
	const signinUrl = await getSignInUrl(context);

	const timezone = context.cloudflare.cf.timezone;

	const date = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
	const hour = date.getHours();
	const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

	const searchParams = new URL(request.url).searchParams;

	const success = searchParams.get("success");
	const integration = searchParams.get("integration");

	try {
		const recommendedQuestionsPromise = proxy("/v1/recommended-questions", {}, request, context)
			.then((response) => response.json())
			.then((data) => (data as { questions: string[] }).questions ?? null)
			.catch(() => {
				console.error("Error fetching recommended questions");
				return [] as string[];
			});

		return defer({
			user,
			signinUrl,
			greeting,
			recommendedQuestions: recommendedQuestionsPromise,
			success,
			integration,
		});
	} catch (error) {
		console.error("Error in loader:", error);
		return defer({
			user,
			signinUrl,
			greeting,
			recommendedQuestions: null,
			success,
			integration,
		});
	}
};

const HomePage = memo(function HomePage() {
	const { user, greeting, recommendedQuestions, success, integration } =
		useLoaderData<typeof loader>();

	const [input, setInput] = useState("");
	const fetcher = useFetcher();
	const [scrollOpacity, setScrollOpacity] = useState(1);

	useEffect(() => {
		const handleScroll = () => {
			const scrollPosition = window.scrollY;
			const opacity = Math.max(0, 1 - scrollPosition / 200); // Adjust 200 to control fade speed
			setScrollOpacity(opacity);
		};

		if (!recommendedQuestions || recommendedQuestions === null) {
			toast.error("Something went wrong. Please try again later.");
			alert("Something went wrong. Please try again later.");
		}

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		if (success && integration && integration === "notion") {
			setIsModalOpen(true);
		}
	}, [success, integration]);

	const [fileURLs, setFileURLs] = useState<string[]>([]);

	const submit = useCallback(() => {
		if (input.trim()) {
			fetcher.submit(
				{ input, fileURLs: JSON.stringify(fileURLs) },
				{ method: "post", action: "/action/chat" },
			);
		}
	}, [input, fileURLs]);

	const handleSuggestionSelect = useCallback((val: string) => {
		setInput(val);
	}, []);

	const handleScroll = useCallback(() => {
		window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
	}, []);

	if (!user) {
		return <Landing />;
	}

	return (
		<div className="">
			<MemoizedNavbar user={user ?? undefined} />
			{integration ? <IntegrationModals integrationId={integration} /> : null}
			<div className="p-4 font-geist md:p-24 md:pt-16">
				<div className="flex flex-col md:grid md:grid-cols-7 gap-8">
					<div className="w-full md:col-span-5">
						<div className="min-h-[70vh] flex justify-between flex-col">
							<div></div>
							<div>
								<h1 className="font-geist text-3xl font-semibold dark:text-neutral-100 text-neutral-700 tracking-[-0.020em]">
									{greeting}, <span className="text-blue-400">{user?.firstName}</span>
								</h1>
								<div className="mt-4 md:mt-8">
									<MemoizedMemoryInputForm
										submit={submit}
										user={user}
										input={input}
										setInput={setInput}
										fileURLs={fileURLs}
										setFileURLs={setFileURLs}
										isLoading={fetcher.state !== "idle"}
									/>
								</div>
								{recommendedQuestions && (
									<Suspense fallback={<SuggestionsSkeleton />}>
										<Await resolve={recommendedQuestions}>
											{(questions) => (
												<MemoizedSuggestions
													items={questions?.filter(Boolean) as string[]}
													onSelect={handleSuggestionSelect}
												/>
											)}
										</Await>
									</Suspense>
								)}
							</div>

							<div
								onClick={handleScroll}
								className="mt-4 md:mt-8 flex items-center justify-center text-neutral-500 transition-opacity duration-200 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300"
								style={{ opacity: scrollOpacity }}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={1.5}
									stroke="currentColor"
									className="size-6"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5"
									/>
								</svg>
								<p className="text-sm ml-2">Scroll down to view your memories</p>
							</div>
						</div>
					</div>
					<div className="w-full md:col-span-2">
						<Suspense fallback={<div>Loading...</div>}>
							<MemoizedReminders />
						</Suspense>
					</div>
				</div>
				<div className="mt-4 md:mt-8">
					<Suspense fallback={<div>Loading...</div>}>
						<MemoriesPage />
					</Suspense>
				</div>
			</div>
		</div>
	);
});

export default HomePage;

export function ErrorBoundary() {
	const error = useRouteError();

	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-4">
			<div className="max-w-md text-center space-y-4">
				<h1 className="text-4xl font-bold text-primary">Oops! Something went wrong</h1>
				<p className="text-lg text-muted-foreground">
					Supermemory is taking a quick break. We'll be back shortly!
				</p>
				{error instanceof Error && (
					<div className="mt-4 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
						<p className="font-medium">Error details:</p>
						<p className="mt-2">{error.message}</p>
					</div>
				)}
				<a
					href="/"
					className="inline-block mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
				>
					Try again
				</a>
			</div>
		</div>
	);
}

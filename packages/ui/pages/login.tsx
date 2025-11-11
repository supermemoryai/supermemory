"use client";

import { signIn } from "@lib/auth";
import { usePostHog } from "@lib/posthog";
import { LogoFull } from "@repo/ui/assets/Logo";
import { TextSeparator } from "@repo/ui/components/text-separator";
import { ExternalAuthButton } from "@ui/button/external-auth";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
} from "@ui/components/carousel";
import { LabeledInput } from "@ui/input/labeled-input";
import { HeadingH1Medium } from "@ui/text/heading/heading-h1-medium";
import { HeadingH3Medium } from "@ui/text/heading/heading-h3-medium";
import { Label1Regular } from "@ui/text/label/label-1-regular";
import { Title1Bold } from "@ui/text/title/title-1-bold";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export function LoginPage({
	heroText = "The unified memory API for the AI era.",
	texts = [
		"Stop building retrieval from scratch.",
		"Trusted by Open Source, enterprise and developers.",
	],
}) {
	const [email, setEmail] = useState("");
	const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingEmail, setIsLoadingEmail] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastUsedMethod, setLastUsedMethod] = useState<string | null>(null);
	const router = useRouter();

	const posthog = usePostHog();

	const params = useSearchParams();

	// Get redirect URL from query params
	const redirectUrl = params.get("redirect");

	// Create callback URL that includes redirect parameter if provided
	const getCallbackURL = () => {
		const origin = window.location.origin;
		let finalUrl: URL;

		if (redirectUrl) {
			try {
				finalUrl = new URL(redirectUrl, origin);
			} catch {
				finalUrl = new URL(origin);
			}
		} else {
			finalUrl = new URL(origin);
		}

		finalUrl.searchParams.set("extension-auth-success", "true");
		return finalUrl.toString();
	};

	// Load last used method from localStorage on mount
	useEffect(() => {
		const savedMethod = localStorage.getItem("supermemory-last-login-method");
		setLastUsedMethod(savedMethod);
	}, []);

	// Record the pending login method (will be committed after successful auth)
	function setPendingLoginMethod(method: string) {
		try {
			localStorage.setItem("supermemory-pending-login-method", method);
			localStorage.setItem(
				"supermemory-pending-login-timestamp",
				String(Date.now()),
			);
		} catch {}
	}

	function isNetworkError(error: unknown): boolean {
		if (!(error instanceof Error)) return false;
		const message = error.message.toLowerCase();
		return (
			message.includes("load failed") ||
			message.includes("networkerror") ||
			message.includes("failed to fetch") ||
			message.includes("network request failed")
		);
	}

	function getErrorMessage(error: unknown): string {
		if (isNetworkError(error)) {
			return "Network error. Please check your connection and try again.";
		}
		if (error instanceof Error) {
			return error.message;
		}
		return "An unexpected error occurred. Please try again.";
	}

	// If we land back on this page with an error, clear any pending marker
	useEffect(() => {
		if (params.get("error")) {
			try {
				localStorage.removeItem("supermemory-pending-login-method");
				localStorage.removeItem("supermemory-pending-login-timestamp");
			} catch {}
		}
	}, [params]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);
		setIsLoadingEmail(true);
		setError(null);

		// Track login attempt
		posthog.capture("login_attempt", {
			method: "magic_link",
			email_domain: email.split("@")[1] || "unknown",
		});

		try {
			await signIn.magicLink({
				callbackURL: getCallbackURL(),
				email,
			});
			setSubmittedEmail(email);
			setPendingLoginMethod("magic_link");
			// Track successful magic link send
			posthog.capture("login_magic_link_sent", {
				email_domain: email.split("@")[1] || "unknown",
			});
		} catch (error) {
			console.error(error);

			// Track login failure
			posthog.capture("login_failed", {
				method: "magic_link",
				error: error instanceof Error ? error.message : "Unknown error",
				email_domain: email.split("@")[1] || "unknown",
				is_network_error: isNetworkError(error),
			});

			setError(getErrorMessage(error));
			setIsLoading(false);
			setIsLoadingEmail(false);
			return;
		}

		setIsLoading(false);
		setIsLoadingEmail(false);
	};

	const handleSubmitToken = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);

		const formData = new FormData(event.currentTarget);
		const token = formData.get("token") as string;
		const callbackURL = getCallbackURL();
		router.push(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/magic-link/verify?token=${token}&callbackURL=${encodeURIComponent(callbackURL)}`,
		);
	};

	return (
		<section className="min-h-screen flex flex-col lg:grid lg:grid-cols-12 items-center justify-center p-4 sm:p-6 md:p-8 lg:px-[5rem] lg:py-[3.125rem] gap-6 lg:gap-[5rem] max-w-[400rem] mx-auto">
			<Carousel
				className="hidden lg:block lg:col-span-6"
				opts={{
					loop: true,
				}}
				plugins={[Autoplay({ delay: 5000 })]}
			>
				<CarouselContent>
					<CarouselItem className="relative">
						<Image
							alt="supermemory abstract 2d"
							height={600}
							src="/images/login-carousel-1.png"
							width={600}
						/>
						<div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-12">
							<Title1Bold className="text-white mb-2 leading-tight">
								{texts[0]}
							</Title1Bold>
						</div>
					</CarouselItem>
					<CarouselItem className="relative">
						<Image
							alt="supermemory abstract 3d"
							height={600}
							src="/images/login-carousel-2.png"
							width={600}
						/>
						<div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-12">
							<Title1Bold className="text-white mb-2 leading-tight">
								{texts[1]}
							</Title1Bold>
						</div>
					</CarouselItem>
				</CarouselContent>
			</Carousel>

			{submittedEmail ? (
				<div className="w-full max-w-md lg:max-w-none lg:col-span-5 flex flex-col gap-4 lg:gap-6 min-h-2/3 ">
					<div className="flex flex-col gap-2 text-center lg:text-left">
						<Title1Bold className="text-foreground">Almost there!</Title1Bold>
						<HeadingH3Medium className="text-muted-foreground">
							Click the magic link we've sent to{" "}
							<span className="text-foreground">{submittedEmail}</span>.
						</HeadingH3Medium>
					</div>

					<TextSeparator text="OR" />

					<form
						className="flex flex-col gap-4 lg:gap-6"
						onSubmit={handleSubmitToken}
					>
						<LabeledInput
							inputPlaceholder="your temporary login code"
							inputProps={{
								name: "token",
								required: true,
								disabled: isLoading,
								"aria-invalid": error ? "true" : "false",
							}}
							inputType="text"
							label="Enter code"
						/>

						<Button disabled={isLoading} id="verify-token" type="submit">
							Verify Token
						</Button>
					</form>
				</div>
			) : (
				<div className="w-full max-w-md lg:max-w-none lg:col-span-5 flex flex-col gap-4 lg:gap-6 min-h-2/3 ">
					<div className="flex flex-col gap-2 text-center lg:text-left md:mb-12">
						<Title1Bold className="text-foreground flex flex-col justify-center md:justify-start md:flex-row items-center gap-3">
							<span className="block md:hidden">Welcome to </span>{" "}
							<LogoFull className="h-8" />
						</Title1Bold>
						<HeadingH1Medium className="text-muted-foreground">
							{heroText}
						</HeadingH1Medium>
					</div>

					{params.get("error") && (
						<div className="text-red-500">
							Error: {params.get("error")}. Please try again!
						</div>
					)}

					<form onSubmit={handleSubmit}>
						<div className="flex flex-col gap-4 lg:gap-6">
							<LabeledInput
								error={error}
								inputPlaceholder="your@email.com"
								inputProps={{
									"aria-invalid": error ? "true" : "false",
									disabled: isLoading,
									id: "email",
									onChange: (e) => {
										setEmail(e.target.value);
										error && setError(null);
									},
									required: true,
									value: email,
								}}
								inputType="email"
								label="Email"
							/>

							<div className="relative">
								<Button className="w-full" disabled={isLoading} type="submit">
									{isLoadingEmail
										? "Sending login link..."
										: "Log in to supermemory"}
								</Button>
								{lastUsedMethod === "magic_link" && (
									<div className="absolute -top-2 -right-2">
										<Badge variant="default" className="text-xs">
											Last used
										</Badge>
									</div>
								)}
							</div>
						</div>
					</form>

					{process.env.NEXT_PUBLIC_HOST_ID === "supermemory" ||
					!process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED ||
					!process.env.NEXT_PUBLIC_GITHUB_AUTH_ENABLED ? (
						<TextSeparator text="OR" />
					) : null}

					<div className="flex flex-col sm:flex-row flex-wrap gap-3 lg:gap-4">
						{process.env.NEXT_PUBLIC_HOST_ID === "supermemory" ||
						!process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED ? (
							<div className="relative flex-grow">
								<ExternalAuthButton
									authIcon={
										<svg
											className="w-4 h-4 sm:w-5 sm:h-5"
											fill="none"
											height="25"
											viewBox="0 0 24 25"
											width="24"
											xmlns="http://www.w3.org/2000/svg"
										>
											<title>Google</title>
											<path
												d="M21.8055 10.2563H21V10.2148H12V14.2148H17.6515C16.827 16.5433 14.6115 18.2148 12 18.2148C8.6865 18.2148 6 15.5283 6 12.2148C6 8.90134 8.6865 6.21484 12 6.21484C13.5295 6.21484 14.921 6.79184 15.9805 7.73434L18.809 4.90584C17.023 3.24134 14.634 2.21484 12 2.21484C6.4775 2.21484 2 6.69234 2 12.2148C2 17.7373 6.4775 22.2148 12 22.2148C17.5225 22.2148 22 17.7373 22 12.2148C22 11.5443 21.931 10.8898 21.8055 10.2563Z"
												fill="#FFC107"
											/>
											<path
												d="M3.15234 7.56034L6.43784 9.96984C7.32684 7.76884 9.47984 6.21484 11.9993 6.21484C13.5288 6.21484 14.9203 6.79184 15.9798 7.73434L18.8083 4.90584C17.0223 3.24134 14.6333 2.21484 11.9993 2.21484C8.15834 2.21484 4.82734 4.38334 3.15234 7.56034Z"
												fill="#FF3D00"
											/>
											<path
												d="M12.0002 22.2152C14.5832 22.2152 16.9302 21.2267 18.7047 19.6192L15.6097 17.0002C14.5721 17.7897 13.3039 18.2166 12.0002 18.2152C9.39916 18.2152 7.19066 16.5567 6.35866 14.2422L3.09766 16.7547C4.75266 19.9932 8.11366 22.2152 12.0002 22.2152Z"
												fill="#4CAF50"
											/>
											<path
												d="M21.8055 10.2563H21V10.2148H12V14.2148H17.6515C17.2571 15.3231 16.5467 16.2914 15.608 17.0003L15.6095 16.9993L18.7045 19.6183C18.4855 19.8173 22 17.2148 22 12.2148C22 11.5443 21.931 10.8898 21.8055 10.2563Z"
												fill="#1976D2"
											/>
										</svg>
									}
									authProvider="Google"
									className="w-full"
									disabled={isLoading}
									onClick={() => {
										if (isLoading) return;
										setIsLoading(true);
										setError(null);
										posthog.capture("login_attempt", {
											method: "social",
											provider: "google",
										});
										setPendingLoginMethod("google");
										signIn
											.social({
												callbackURL: getCallbackURL(),
												provider: "google",
											})
											.catch((error) => {
												console.error("Google login error:", error);
												posthog.capture("login_failed", {
													method: "social",
													provider: "google",
													error:
														error instanceof Error
															? error.message
															: "Unknown error",
													is_network_error: isNetworkError(error),
												});
												setError(getErrorMessage(error));
											})
											.finally(() => {
												setIsLoading(false);
											});
									}}
								/>
								{lastUsedMethod === "google" && (
									<div className="absolute -top-2 -right-2">
										<Badge variant="default" className="text-xs">
											Last used
										</Badge>
									</div>
								)}
							</div>
						) : null}
						{process.env.NEXT_PUBLIC_HOST_ID === "supermemory" ||
						!process.env.NEXT_PUBLIC_GITHUB_AUTH_ENABLED ? (
							<div className="relative flex-grow">
								<ExternalAuthButton
									authIcon={
										<svg
											className="w-4 h-4 sm:w-5 sm:h-5 text-foreground"
											fill="none"
											height="25"
											viewBox="0 0 26 25"
											width="26"
											xmlns="http://www.w3.org/2000/svg"
										>
											<title>Github</title>
											<g clipPath="url(#clip0_2579_3356)">
												<path
													clipRule="evenodd"
													d="M12.9635 0.214844C6.20975 0.214844 0.75 5.71484 0.75 12.5191C0.75 17.9581 4.24825 22.5621 9.10125 24.1916C9.708 24.3141 9.93025 23.9268 9.93025 23.6011C9.93025 23.3158 9.91025 22.3381 9.91025 21.3193C6.51275 22.0528 5.80525 19.8526 5.80525 19.8526C5.25925 18.4266 4.45025 18.0601 4.45025 18.0601C3.33825 17.3063 4.53125 17.3063 4.53125 17.3063C5.76475 17.3878 6.412 18.5693 6.412 18.5693C7.50375 20.4433 9.263 19.9138 9.97075 19.5878C10.0718 18.7933 10.3955 18.2433 10.7393 17.9378C8.0295 17.6526 5.1785 16.5933 5.1785 11.8671C5.1785 10.5226 5.6635 9.42259 6.432 8.56709C6.31075 8.26159 5.886 6.99834 6.5535 5.30759C6.5535 5.30759 7.58475 4.98159 9.91 6.57059C10.9055 6.30126 11.9322 6.16425 12.9635 6.16309C13.9948 6.16309 15.046 6.30584 16.0168 6.57059C18.3423 4.98159 19.3735 5.30759 19.3735 5.30759C20.041 6.99834 19.616 8.26159 19.4948 8.56709C20.2835 9.42259 20.7485 10.5226 20.7485 11.8671C20.7485 16.5933 17.8975 17.6321 15.1675 17.9378C15.6125 18.3248 15.9965 19.0581 15.9965 20.2193C15.9965 21.8693 15.9765 23.1936 15.9765 23.6008C15.9765 23.9268 16.199 24.3141 16.8055 24.1918C21.6585 22.5618 25.1568 17.9581 25.1568 12.5191C25.1768 5.71484 19.697 0.214844 12.9635 0.214844Z"
													fill="currentColor"
													fillRule="evenodd"
												/>
											</g>
											<defs>
												<clipPath id="clip0_2579_3356">
													<rect
														fill="currentColor"
														height="24"
														transform="translate(0.75 0.214844)"
														width="24.5"
													/>
												</clipPath>
											</defs>
										</svg>
									}
									authProvider="Github"
									className="w-full"
									disabled={isLoading}
									onClick={() => {
										if (isLoading) return;
										setIsLoading(true);
										setError(null);
										posthog.capture("login_attempt", {
											method: "social",
											provider: "github",
										});
										setPendingLoginMethod("github");
										signIn
											.social({
												callbackURL: getCallbackURL(),
												provider: "github",
											})
											.catch((error) => {
												console.error("GitHub login error:", error);
												posthog.capture("login_failed", {
													method: "social",
													provider: "github",
													error:
														error instanceof Error
															? error.message
															: "Unknown error",
													is_network_error: isNetworkError(error),
												});
												setError(getErrorMessage(error));
											})
											.finally(() => {
												setIsLoading(false);
											});
									}}
								/>
								{lastUsedMethod === "github" && (
									<div className="absolute -top-2 -right-2">
										<Badge variant="default" className="text-xs">
											Last used
										</Badge>
									</div>
								)}
							</div>
						) : null}
					</div>

					<Label1Regular className="text-muted-foreground text-center text-xs sm:text-sm">
						By continuing, you agree to our{" "}
						<span className="inline-block">
							<a
								className="text-foreground hover:underline"
								href="https://supermemory.ai/terms-of-service"
							>
								Terms
							</a>{" "}
							and{" "}
							<a
								className="text-foreground hover:underline"
								href="https://supermemory.ai/privacy-policy"
							>
								Privacy Policy
							</a>
							.
						</span>
					</Label1Regular>
				</div>
			)}
		</section>
	);
}

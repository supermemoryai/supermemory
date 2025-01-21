import { useEffect, useState } from "react";

import { Logo } from "./icons/Logo";
import { Input } from "./ui/input";

import { Turnstile } from "@marsidev/react-turnstile";
import posthog from "posthog-js";

const gradientStyles = `
  @keyframes background-pan {
    from {
      background-position: 0% center;
    }
    to {
      background-position: -200% center;
    }
  }

  .magicText {
    --purple: rgba(72, 130, 244, 0.868);
    --violet: #9a80f7;
    --pink: #f7f7f7;
    animation: background-pan 3s linear infinite;
    background: linear-gradient(
      to right,
      var(--purple),
      var(--violet),
      var(--pink),
      var(--purple)
    );
    background-size: 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: nowrap;
  }
`;

export default function Landing() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [token, setToken] = useState("");

	useEffect(() => {
		// Inject styles
		const styleSheet = document.createElement("style");
		styleSheet.textContent = gradientStyles;
		document.head.appendChild(styleSheet);

		posthog.reset();

		return () => {
			document.head.removeChild(styleSheet);
		};
	}, []);

	const handleSubmit = async () => {
		setLoading(true);
		setError("");
		try {
			const response = await fetch(`/backend/waitlist`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, token })
			});

			if (!response.ok) {
				throw new Error("Failed to join waitlist");
			}

			setSuccess(true);
			setEmail("");
		} catch (err) {
			setError("Failed to join waitlist. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && email && token && !loading) {
			handleSubmit();
		}
	};

	return (
		<div className="flex flex-col lg:flex-row relative font-geistSans overflow-hidden items-center justify-between min-h-screen">
			<Turnstile siteKey="0x4AAAAAAAakohhUeXc99J7E" onSuccess={(token) => setToken(token)} />
			<div className="relative w-full lg:w-1/2 flex items-center min-h-[60vh] lg:min-h-screen bg-page-gradient p-4 lg:p-8 border-b-[1px] lg:border-b-0 lg:border-r-[1px] border-black/5 dark:border-white/5">
				<div className="absolute top-0 left-0 p-4 lg:p-8 text-black dark:text-white inline-flex gap-2 items-center">
					<Logo />
					<span className="text-lg lg:text-xl">supermemory.ai</span>
				</div>
				<div className="absolute inset-0 opacity-5 w-full bg-transparent bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

				<div className="pl-2 lg:pl-4 z-20 mt-16 lg:mt-0">
					<h1 className="text-3xl lg:text-5xl text-black dark:text-white mb-4 lg:mb-8 tracking-tighter">
						Hello, <span className="magicText">human</span>{" "}
					</h1>
					<p className="text-black dark:text-white mb-6 lg:mb-8 text-base lg:text-lg tracking-tighter">
						Write, ideate, and learn with all the wisdom of your bookmarks, notes, tweets and
						everything else, all in one place.
					</p>
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
						<div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
							<div className="relative flex-1 w-full sm:min-w-[320px]">
								<Input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="your@email.com"
									className="w-full h-12 rounded-xl bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:border-black/20 dark:focus:border-white/20 focus:ring-black/20 dark:focus:ring-white/20 px-4"
								/>
								{error && <p className="text-red-500 text-sm mt-2">{error}</p>}
								{success && (
									<p className="text-green-500 text-sm mt-2">Successfully joined waitlist!</p>
								)}
							</div>
							<button
								onClick={handleSubmit}
								disabled={loading || !email || !token}
								className="relative h-12 w-full sm:w-auto text-white flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-opacity duration-200 px-6 font-medium shadow-lg shadow-indigo-500/25 whitespace-nowrap disabled:opacity-50"
							>
								<span>{loading ? "Joining..." : "Join waitlist"}</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<line x1="5" y1="12" x2="19" y2="12"></line>
									<polyline points="12 5 19 12 12 19"></polyline>
								</svg>
							</button>
						</div>
					</div>
				</div>
			</div>
			<div className="relative w-full lg:w-1/2 flex flex-col items-center justify-center min-h-[40vh] lg:min-h-screen bg-page-gradient p-4 lg:p-8">
				<span className="text-xl lg:text-3xl leading-relaxed tracking-tighter mb-4 lg:mb-8 text-center text-black dark:text-gray-200">
					Ready for your <span className="text-black dark:text-white font-bold">Second brain</span>?
				</span>

				<iframe
					src="https://customer-5xczlbkyq4f9ejha.cloudflarestream.com/111c4828c3587348bc703e67bfca9682/watch"
					frameBorder="0"
					className="w-full max-w-2xl rounded-2xl shadow-2xl shadow-indigo-500/20 aspect-video"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
				></iframe>
			</div>
		</div>
	);
}

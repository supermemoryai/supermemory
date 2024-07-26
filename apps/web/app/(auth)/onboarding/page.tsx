"use client";

import {
	ArrowUturnDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	QuestionMarkCircleIcon,
} from "@heroicons/react/24/solid";
import { CheckIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { completeOnboarding, createMemory } from "@/app/actions/doers";
import { useRouter } from "next/navigation";
import Logo from "../../../public/logo.svg";
import Image from "next/image";
import { cn } from "@repo/ui/lib/utils";
import gradientStyle from "../signin/_components/TextGradient/gradient.module.css";

export default function Home() {
	const [currStep, setCurrStep] = useState(0);
	const { push } = useRouter();

	useEffect(() => {
		const updateDb = async () => {
			await completeOnboarding();
		};
		if (currStep > 3) {
			updateDb().then(() => {
				push("/home?q=what%20is%20supermemory");
			}).catch((e) => {
        console.error(e);
      });
		}
	}, [currStep]);

	return (
		<main className="min-h-screen text-sm text-[#B8C4C6] font-geistSans">
			<div className="absolute  inset-0 opacity-5  w-full  bg-transparent  bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
			<img
				className="absolute inset-x-0 -top-20 opacity-20"
				src={"/images/landing-hero-left.png"}
				width={1000}
				height={1000}
				alt="back bg"
			/>

			{/* Navbar */}
			<Navbar />

			{/* main-content */}
			<div className="w-full max-w-3xl p-4 flex flex-col items-center justify-center mx-auto mt-24">
				{currStep === 0 && (
					<div className="text-white space-y-3 flex flex-col gap-16 w-full">
						<h1 className="text-3xl md:text-5xl tracking-tighter">
							Welcome to{" "}
							<span
								className={cn(
									"bg-gradient-to-tr from-zinc-100 via-zinc-200/50 to-zinc-200/90 text-transparent bg-clip-text animate-gradient",
									gradientStyle.magicText,
								)}
							>
								supermemory
							</span>
						</h1>
						<div style={{ position: "relative", paddingTop: "56.25%" }}>
							<iframe
								src="https://customer-5xczlbkyq4f9ejha.cloudflarestream.com/111c4828c3587348bc703e67bfca9682/iframe?preload=true&autoplay=true&poster=https%3A%2F%2Fcustomer-5xczlbkyq4f9ejha.cloudflarestream.com%2F111c4828c3587348bc703e67bfca9682%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600"
								loading="lazy"
								style={{
									border: "none",
									position: "absolute",
									top: 0,
									left: 0,
									height: "100%",
									width: "100%",
								}}
								allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
								allowFullScreen={true}
							></iframe>
						</div>
					</div>
				)}
				{currStep >= 1 && <StepOne currStep={currStep} />}
				{currStep >= 2 && <StepTwo currStep={currStep} />}
				{currStep >= 3 && <StepThree currStep={currStep} />}
			</div>
			<div className="fixed flex justify-center w-full bottom-0 left-0 bg-[#171B1F]">
				<StepIndicator
					setCurrStep={(v) => setCurrStep(v)}
					currStep={currStep}
				/>
			</div>
		</main>
	);
}

function StepOne({ currStep }: { currStep: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, x: "50%" }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.2, type: "spring", bounce: 0.1, delay: 0.15 }}
			className="w-full"
		>
			<motion.div
				animate={{
					y: currStep > 1 ? (currStep > 2 ? -40 : -20) : 0,
				}}
				transition={{ duration: 0.2, type: "spring", bounce: 0.1 }}
			>
				<div
					className={`flex items-center justify-between transition-colors w-full p-4 rounded-2xl ${
						currStep > 1
							? "bg-[#26D987]/10 text-[#26D987]"
							: "bg-[#1F2428] text-white"
					} `}
				>
					<div className="flex items-center gap-4">
						<div>
							<svg
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M22.46 6C21.69 6.35 20.86 6.58 20 6.69C20.88 6.16 21.56 5.32 21.88 4.31C21.05 4.81 20.13 5.16 19.16 5.36C18.37 4.5 17.26 4 16 4C13.65 4 11.73 5.92 11.73 8.29C11.73 8.63 11.77 8.96 11.84 9.27C8.28004 9.09 5.11004 7.38 3.00004 4.79C2.63004 5.42 2.42004 6.16 2.42004 6.94C2.42004 8.43 3.17004 9.75 4.33004 10.5C3.62004 10.5 2.96004 10.3 2.38004 10V10.03C2.38004 12.11 3.86004 13.85 5.82004 14.24C5.19077 14.4122 4.53013 14.4362 3.89004 14.31C4.16165 15.1625 4.69358 15.9084 5.41106 16.4429C6.12854 16.9775 6.99549 17.2737 7.89004 17.29C6.37367 18.4904 4.49404 19.1393 2.56004 19.13C2.22004 19.13 1.88004 19.11 1.54004 19.07C3.44004 20.29 5.70004 21 8.12004 21C16 21 20.33 14.46 20.33 8.79C20.33 8.6 20.33 8.42 20.32 8.23C21.16 7.63 21.88 6.87 22.46 6Z"
									fill="currentColor"
								/>
							</svg>
						</div>
						<div>
							<p className="text-base">Import twitter bookmarks</p>
							<p className="opacity-70">
								Directly import all your bookmarks from twitter in single click
							</p>
						</div>
					</div>
					<div>{getStatusIcon({ completed: currStep > 1 })}</div>
				</div>
				{currStep === 1 && (
					<div className="my-4 bg-[#1F2428] rounded-2xl p-4">
						<ol className="text-lg space-y-3">
							<li>
								Download the chrome extension{" "}
								<a className="underline underline-offset-2" href="/extension">
									here
								</a>
							</li>
							<li>
								Go to{" "}
								<a
									className="underline underline-offset-2"
									href="https://x.com"
								>
									x.com
								</a>{" "}
								and click on the bookmark icon on the bottom right on the screen
							</li>
							<img
								className="mx-auto mt-8 mb-4 rounded-xl w-96 mt-4"
								src="/images/twitter-bookmark-import.png"
								alt=""
							/>
						</ol>
					</div>
				)}
			</motion.div>
		</motion.div>
	);
}

function StepIndicator({
	currStep,
	setCurrStep,
}: {
	currStep: number;
	setCurrStep: (v: number) => void;
}) {
	return (
		<div className="flex flex-col items-center gap-3 p-4 select-none">
			<div className="flex items-center w-full justify-between">
				<ChevronLeftIcon
					className={`h-6 ${currStep >= 2 ? "opacity-100" : "opacity-0"}`}
					onClick={() => currStep >= 2 && setCurrStep(currStep - 1)}
				/>
				<p>Step: {currStep}/3</p>
				<ChevronRightIcon
					className="h-6 cursor-pointer"
					onClick={() => currStep <= 3 && setCurrStep(currStep + 1)}
				/>
			</div>

			<div className="flex items-center gap-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<div
						className={`w-16 h-2 ${
							currStep > i + 1 ? "bg-[#26D987]" : "bg-white/10"
						} rounded-full overflow-hidden`}
					>
						{i === currStep - 1 && (
							<motion.div
								initial={{ scaleX: 0 }}
								transition={{ duration: 0.8, ease: "linear" }}
								animate={{ scaleX: 1 }}
								className="bg-[#26D987] w-full h-full origin-left"
							></motion.div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

function StepThree({ currStep }: { currStep: number }) {
	const { push } = useRouter();

	return (
		<motion.div
			initial={{ opacity: 0, x: "50%" }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.2, type: "spring", bounce: 0 }}
			className="w-full"
		>
			<div
				className={`flex items-center justify-between w-full p-4 rounded-2xl ${
					currStep > 3
						? "bg-[#26D987]/10 text-[#26D987]"
						: "bg-[#1F2428] text-white"
				} `}
			>
				{/* info */}
				<div className="flex items-center gap-4">
					{/* icon */}
					<div>
						{/* custom twitter icon */}
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M22.46 6C21.69 6.35 20.86 6.58 20 6.69C20.88 6.16 21.56 5.32 21.88 4.31C21.05 4.81 20.13 5.16 19.16 5.36C18.37 4.5 17.26 4 16 4C13.65 4 11.73 5.92 11.73 8.29C11.73 8.63 11.77 8.96 11.84 9.27C8.28004 9.09 5.11004 7.38 3.00004 4.79C2.63004 5.42 2.42004 6.16 2.42004 6.94C2.42004 8.43 3.17004 9.75 4.33004 10.5C3.62004 10.5 2.96004 10.3 2.38004 10V10.03C2.38004 12.11 3.86004 13.85 5.82004 14.24C5.19077 14.4122 4.53013 14.4362 3.89004 14.31C4.16165 15.1625 4.69358 15.9084 5.41106 16.4429C6.12854 16.9775 6.99549 17.2737 7.89004 17.29C6.37367 18.4904 4.49404 19.1393 2.56004 19.13C2.22004 19.13 1.88004 19.11 1.54004 19.07C3.44004 20.29 5.70004 21 8.12004 21C16 21 20.33 14.46 20.33 8.79C20.33 8.6 20.33 8.42 20.32 8.23C21.16 7.63 21.88 6.87 22.46 6Z"
								fill="currentColor"
							/>
						</svg>
					</div>
					<div>
						<p className="text-base">Ask a question</p>
						<p className="opacity-70">
							Let's use the true power of supermemory!
						</p>
					</div>
				</div>

				{/* status */}
				<div>{getStatusIcon({ completed: currStep > 3 })}</div>
			</div>

			{currStep === 3 && (
				<div className="my-4 bg-[#1F2428] rounded-2xl p-4">
					<ol className="text-lg space-y-5">
						<li>
							Let's start off by adding some content! We have added
							supermemory's link for you (you can write your own thoughts or any
							other website if you want!)
						</li>
						<li>
							<span className="bg-gray-600/30 py-1 px-2  text-white">
								Once saved, you can ask any questions you have about
								supermemory.
							</span>
						</li>
						<li className="relative">
							<form
								action={async (formData) => {
									toast.info("Creating memory...", {
										icon: (
											<PlusCircleIcon className="w-4 h-4 text-white animate-spin" />
										),
										duration: 7500,
									});

									const cont = await createMemory({
										content: (formData.get("cont") as string) || "",
										spaces: undefined,
									});

									if (cont.success) {
										toast.success("Memory created", {
											richColors: true,
										});
									} else {
										toast.error(`Memory creation failed: ${cont.error}`);
									}

									push(`/home?q=what%20is%20supermemory`);
								}}
							>
								<textarea
									name="cont"
									defaultValue="https://supermemory.ai"
									rows={3}
									placeholder="paste any link or text here.. supermemory will save it"
									className="w-full rounded-lg border-2 border-border bg-[#24292e] p-2 text-white outline-none shadow-md resize-none"
								/>
								<button
									type="submit"
									className="rounded-lg bg-[#369DFD1A] p-3 absolute bottom-4 right-2"
								>
									<ArrowUturnDownIcon className="w-4 h-4 text-[#369DFD]" />
								</button>
							</form>
						</li>
					</ol>
				</div>
			)}
		</motion.div>
	);
}

function StepTwo({ currStep }: { currStep: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, x: "50%" }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.2, type: "spring", bounce: 0, delay: 0.15 }}
			className="w-full"
		>
			<motion.div
				animate={{ y: currStep > 2 ? -20 : 0 }}
				transition={{ duration: 0.2, type: "spring", bounce: 0 }}
			>
				<div
					className={`flex items-center justify-between w-full p-4 rounded-2xl ${
						currStep > 2
							? "bg-[#26D987]/10 text-[#26D987]"
							: "bg-[#1F2428] text-white"
					} `}
				>
					{/* info */}
					<div className="flex items-center gap-4">
						{/* icon */}
						<div>
							{/* custom twitter icon */}
							<QuestionMarkCircleIcon className="w-6 h-6" />
						</div>
						<div>
							<p className="text-base">Adding Content into supermemory</p>
							<p className="opacity-70">one click method to save your time.</p>
						</div>
					</div>

					{/* status */}
					<div>{getStatusIcon({ completed: currStep > 2 })}</div>
				</div>

				{currStep === 2 && (
					<div className="my-4 bg-[#1F2428] rounded-2xl p-4">
						<ol className="text-lg space-y-3">
							<li>
								You can either add content from the home or from the extension.
							</li>
						</ol>
						<div className="flex-col md:flex-row gap-4">
							<img
								className="mx-auto mt-8 mb-4 rounded-xl md:w-[40%]"
								src="/images/add-from-web.png"
								alt=""
							/>
							<img
								className="mx-auto mt-8 mb-4 rounded-xl md:w-[60%]"
								src="/images/save-from-extension.png"
								alt=""
							/>
						</div>
					</div>
				)}
			</motion.div>
		</motion.div>
	);
}

function Navbar() {
	const router = useRouter();
	const handleSkip = async () => {
		await completeOnboarding();
		router.push("/home?q=what%20is%20supermemory");
	};

	return (
		<div className="flex items-center justify-between p-4 fixed top-0 left-0 w-full">
			<Image
				src={Logo}
				alt="SuperMemory logo"
				className="hover:brightness-125 duration-200 size-12"
			/>

			<button className="text-sm" onClick={handleSkip}>
				Skip
			</button>
		</div>
	);
}

const getStatusIcon = ({ completed }: { completed: boolean }) => {
	if (!completed) {
		return (
			<svg
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M8.41615 1.81781C9.462 1.61542 10.537 1.61542 11.5828 1.81781M11.5828 18.1811C10.537 18.3835 9.462 18.3835 8.41615 18.1811M14.6736 3.10031C15.5582 3.69967 16.3192 4.46354 16.9153 5.35032M1.81781 11.5828C1.61542 10.537 1.61542 9.462 1.81781 8.41615M16.8986 14.6736C16.2993 15.5582 15.5354 16.3192 14.6486 16.9153M18.1811 8.41615C18.3835 9.462 18.3835 10.537 18.1811 11.5828M3.10031 5.32531C3.69967 4.44076 4.46354 3.67971 5.35032 3.08365M5.32531 16.8986C4.44076 16.2993 3.67971 15.5354 3.08365 14.6486"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		);
	} else {
		return <CheckIcon className="w-6 h-6" />;
	}
};

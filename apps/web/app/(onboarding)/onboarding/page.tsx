"use client";

import Link from "next/link";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	QuestionMarkCircleIcon,
	ArrowTurnDownLeftIcon,
} from "@heroicons/react/24/solid";
import { CheckIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { createMemory } from "@/app/actions/doers";
import { useRouter } from "next/navigation";

export default function Home() {
	const [currStep, setCurrStep] = useState(0);

	return (
		<main className="min-h-screen text-sm  bg text-[#B8C4C6]">
			{/* Navbar */}
			<Navbar />

			{/* main-content */}
			<div className="w-full max-w-3xl p-4 mt-24 sm:mt-32 mx-auto">
				{currStep === 0 && (
					<div className="text-white space-y-3">
						<h1 className="text-2xl">
							We are so excited to have you.. but but first let's set up
							everything
						</h1>
					</div>
				)}
				{currStep >= 1 && <StepOne currStep={currStep} />}
				{currStep >= 2 && <StepTwo currStep={currStep} />}
				{currStep >= 3 && <StepThree currStep={currStep} />}
			</div>
			<div className="absolute flex justify-center w-full bottom-0 left-0 mb-4 bg-[#171B1F]">
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
								First Download our Extension from{" "}
								<a
									className="underline underline-offset-2"
									href="https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc"
								>
									here
								</a>
							</li>
							<li>
								Once downloaded, it will try to authenticate you by visiting
								supermemory website, coordinate it with it.
							</li>
							<li>
								After successful authentication, visit x.com and click on the
								bookmark icon and done, all your bookmarks are in supermemory.
							</li>
							<li>
								<span className="bg-gray-600/30 py-1 px-2  text-white ">
									hover over the bottom left area of the browser window to see
									the extension
								</span>
							</li>
						</ol>
						<img
							className="mx-auto mt-8 mb-4 rounded-xl"
							src="/image3.png"
							alt=""
						/>
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
					className="h-6"
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
							supermemory's link for you press enter
						</li>
						<li>
							<span className="bg-gray-600/30 py-1 px-2  text-white ">
								Once saved, you'll be redirected to home from there you can
								search supermemory.ai or whatever you saved, and woilla, the
								result is there!
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

									push(`/home`);
								}}
							>
								<textarea
									name="cont"
									defaultValue="https://supermemory.ai"
									rows={3}
									placeholder="paste any link or text here.. supermemory will save it"
									className="w-full bg-[#24292e] px-2 py-1 outline-none border-2 border-[#2e353b] shadow-md resize-none"
								/>
								<button
									type="submit"
									className="rounded-lg bg-[#369DFD1A] p-3 absolute bottom-4 right-2"
								>
									<ArrowTurnDownLeftIcon className="w-4 h-4 text-[#369DFD]" />
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
						<img
							className="mx-auto mt-8 mb-4 rounded-xl w-[60%]"
							src="/image.png"
							alt=""
						/>
						<img
							className="mx-auto mt-8 mb-4 rounded-xl w-[40%]"
							src="/img.png"
							alt=""
						/>
					</div>
				)}
			</motion.div>
		</motion.div>
	);
}

function Navbar() {
	return (
		<div className="flex items-center justify-between p-4">
			{/* logo */}
			<svg
				width="28"
				height="32"
				viewBox="0 0 28 32"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M11.5 0C13.4312 0 14 1.56875 14 3.5V10.25H17.25V7.65685C17.25 6.39708 17.7504 5.18889 18.6412 4.2981L19.1583 3.78107C19.0564 3.54111 19 3.27714 19 3C19 1.89543 19.8954 1 21 1C22.1046 1 23 1.89543 23 3C23 4.10457 22.1046 5 21 5C20.7229 5 20.4589 4.94363 20.2189 4.84173L19.7019 5.35876C19.0924 5.96825 18.75 6.7949 18.75 7.65685V10.25H24.1454C24.4421 9.51704 25.1607 9 26 9C27.1046 9 28 9.89543 28 11C28 12.1046 27.1046 13 26 13C25.1607 13 24.4421 12.483 24.1454 11.75H14V16.25H19.1454C19.4421 15.517 20.1607 15 21 15C22.1046 15 23 15.8954 23 17C23 18.1046 22.1046 19 21 19C20.1607 19 19.4421 18.483 19.1454 17.75H14V22.25H18.3431C19.6029 22.25 20.8111 22.7504 21.7019 23.6412L24.2189 26.1583C24.4589 26.0564 24.7229 26 25 26C26.1046 26 27 26.8954 27 28C27 29.1046 26.1046 30 25 30C23.8954 30 23 29.1046 23 28C23 27.7229 23.0564 27.4589 23.1583 27.2189L20.6412 24.7019C20.0317 24.0924 19.2051 23.75 18.3431 23.75H14V28.5C14 30.4312 13.4312 32 11.5 32C9.69375 32 8.20625 30.6313 8.01875 28.8687C7.69375 28.9562 7.35 29 7 29C4.79375 29 3 27.2062 3 25C3 24.5375 3.08125 24.0875 3.225 23.675C1.3375 22.9625 0 21.1375 0 19C0 17.0063 1.16875 15.2812 2.8625 14.4812C2.31875 13.8 2 12.9375 2 12C2 10.0813 3.35 8.48125 5.15 8.0875C5.05 7.74375 5 7.375 5 7C5 5.13125 6.2875 3.55625 8.01875 3.11875C8.20625 1.36875 9.69375 0 11.5 0Z"
					fill="#545B62"
				/>
			</svg>

			<Link href="/home">
				<button className="text-sm">Skip</button>
			</Link>
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

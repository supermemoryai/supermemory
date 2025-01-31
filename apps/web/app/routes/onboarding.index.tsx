import { useEffect } from "react";

import { LoaderFunctionArgs, defer, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";

import {
	authkitLoader,
	getSessionFromRequest,
} from "@supermemory/authkit-remix-cloudflare/src/session";
import { User } from "@supermemory/db/schema";
import { motion } from "framer-motion";
import { proxy } from "server/proxy";
import { Logo } from "~/components/icons/Logo";
import { Theme, useTheme } from "~/lib/theme-provider";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const session = await getSessionFromRequest(request, context);
	const user = session?.user;

	if (!user) {
		return redirect("/signin");
	}

	const userInfo = await proxy("/v1/user", {}, request, context);

	const userInfoJson = (await userInfo.json()) as User;
	console.log("userInfoJson", userInfoJson);

	if (userInfoJson.hasOnboarded == 1) {
		return redirect("/");
	}

	return null;
};

export default function Onboarding() {
	const [theme, setTheme] = useTheme();

	if (typeof window === "undefined") return null;

	useEffect(() => {
		setTheme(Theme.DARK);
	}, []);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="flex flex-col min-h-screen items-center pt-40 relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 bg-opacity-40"
		>
			{/* Neural network background pattern */}
			<div className="absolute inset-0 overflow-hidden">
				{/* Subtle gradient orbs */}
				{[...Array(4)].map((_, i) => (
					<motion.div
						key={`orb-${i}`}
						className="absolute rounded-full blur-3xl opacity-20"
						style={{
							background: `radial-gradient(circle, ${
								i % 2 === 0 ? "#3b82f6" : "#4f46e5"
							} 0%, transparent 70%)`,
							width: `${Math.random() * 300 + 200}px`,
							height: `${Math.random() * 300 + 200}px`,
						}}
						animate={{
							x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
							y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
						}}
						transition={{
							duration: 25,
							repeat: Infinity,
							repeatType: "reverse",
							ease: "easeInOut",
						}}
					/>
				))}

				{/* Neurons */}
				{[...Array(30)].map((_, i) => (
					<motion.div
						key={i}
						className="absolute w-3 h-3 bg-blue-400/30 rounded-full"
						initial={{
							x: Math.random() * window.innerWidth,
							y: Math.random() * window.innerHeight,
							scale: Math.random() * 0.5 + 0.5,
						}}
						animate={{
							x: Math.random() * window.innerWidth,
							y: Math.random() * window.innerHeight,
							scale: [null, 1.2, 1],
						}}
						transition={{
							duration: 10 + Math.random() * 5,
							repeat: Infinity,
							ease: "linear",
							delay: Math.random() * 2,
						}}
					/>
				))}

				{/* Synaptic connections */}
				{[...Array(40)].map((_, i) => (
					<motion.div
						key={`line-${i}`}
						className="absolute h-[1px] bg-gradient-to-r from-blue-400/20 to-transparent"
						style={{
							width: `${Math.random() * 200 + 100}px`,
							transform: `rotate(${Math.random() * 360}deg)`,
						}}
						initial={{
							x: Math.random() * window.innerWidth,
							y: Math.random() * window.innerHeight,
							opacity: 0.1,
						}}
						animate={{
							opacity: [0.1, 0.3, 0.1],
						}}
						transition={{
							duration: 4 + Math.random() * 2,
							repeat: Infinity,
							ease: "easeInOut",
							delay: Math.random() * 2,
						}}
					/>
				))}
			</div>

			{/* Logo */}
			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.8 }}
				className="flex flex-col gap-2 items-center font-geist italic text-5xl tracking-tight text-white"
			>
				<Logo className="h-24 w-24" /> supermemory
			</motion.div>

			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.8, delay: 0.2 }}
				className="flex flex-col gap-2 items-center mt-8 text-white"
			>
				<h1 className="text-xl font-geist font-medium">Welcome to Supermemory</h1>
				<p className="text-base font-geist max-w-md text-center font-light text-gray-200">
					Supermemory is the universal engine for your knowledge.
				</p>
			</motion.div>

			{/* 3D Pushable button with subtle gradients */}
			<motion.a
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.8, delay: 0.4 }}
				className="mt-16 relative border-none bg-transparent p-0 cursor-pointer outline-offset-4 transition-[filter] duration-250 select-none"
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				href="/onboarding/privacy"
			>
				<span className="absolute top-0 left-0 w-full h-full rounded-xl bg-black/25 will-change-transform translate-y-0.5 transition-transform duration-600 ease-[cubic-bezier(.3,.7,.4,1)]" />
				<span className="absolute top-0 left-0 w-full h-full rounded-xl bg-gradient-to-r from-gray-800 to-gray-700" />
				<span className="block relative px-8 py-3 rounded-xl text-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 will-change-transform -translate-y-1 transition-transform duration-600 ease-[cubic-bezier(.3,.7,.4,1)] hover:-translate-y-1.5 hover:transition-transform hover:duration-250 hover:ease-[cubic-bezier(.3,.7,.4,1.5)] active:-translate-y-0.5 active:transition-transform active:duration-[34ms]">
					Get Started →
				</span>
			</motion.a>
		</motion.div>
	);
}

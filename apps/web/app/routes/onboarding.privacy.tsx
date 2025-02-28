import { useEffect } from "react";

import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";

import { Logo } from "../components/icons/Logo";
import { Theme, useTheme } from "../lib/theme-provider";

import { authkitLoader, getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { motion } from "framer-motion";

export const loader = (args: LoaderFunctionArgs) => authkitLoader(args, { ensureSignedIn: true });

export default function Onboarding() {
	const { user } = useLoaderData<typeof loader>();
	const [theme, setTheme] = useTheme();

	if (typeof window === "undefined") return null;

	useEffect(() => {
		setTheme(Theme.DARK);
	}, []);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="flex flex-col min-h-screen items-center pt-20 relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 bg-opacity-40"
		>

			{/* Logo */}
			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.8 }}
				className="flex flex-col gap-2 items-center font-geist italic text-5xl tracking-tight text-white relative z-10"
			>
				<Logo className="h-24 w-24" /> supermemory
			</motion.div>

			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.8, delay: 0.2 }}
				className="flex flex-col gap-2 items-center mt-8 text-white relative z-10"
			>
				<h1 className="text-xl font-geist font-medium">Your privacy is our priority</h1>
				<div className="flex flex-col gap-4 text-base font-geist max-w-md text-center font-light text-gray-200">
					<p className="select-text">
						We use Cloudflare's "bindings" architecture, meaning encryption keys are never exposed -
						not even to our developers. Your data remains encrypted and inaccessible without your
						authorization.
					</p>
					<p className="select-text">
						Our entire codebase is open source and available for security review at{" "}
						<a href="https://git.new/memory" className="text-blue-400 hover:text-blue-300 cursor-pointer">
							git.new/memory
						</a>
						. We believe transparency builds trust.
					</p>
					<p className="select-text">
						Your data is encrypted at rest and in transit, and we use industry-standard encryption.
						You maintain full control over your data, including the right to export or delete it at
						any time.
					</p>
					<p className="text-sm mt-2 select-text">
						<a href="/privacy" className="text-blue-400 hover:text-blue-300 cursor-pointer">
							Read our detailed privacy policy →
						</a>
					</p>
				</div>
			</motion.div>

			{/* 3D Pushable button with subtle gradients */}
			<motion.a
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.8, delay: 0.4 }}
				className="mt-16 relative border-none bg-transparent p-0 cursor-pointer outline-offset-4 transition-[filter] duration-250 select-none z-10"
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				href="/onboarding/add"
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

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

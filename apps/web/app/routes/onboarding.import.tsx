import { useEffect, useState } from "react";

import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigate, useRouteLoaderData } from "@remix-run/react";

import { Logo } from "../components/icons/Logo";
import { getIntegrations } from "../config/integrations";
import { Theme, useTheme } from "../lib/theme-provider";

import { authkitLoader } from "@supermemory/authkit-remix-cloudflare";
import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { loader as routeLoader } from "~/root";
import { proxy } from "server/proxy";
import { getChromeExtensionId } from "~/config/util";

export const loader = (args: LoaderFunctionArgs) => authkitLoader(args, { ensureSignedIn: true });

export const action = async ({ request, context }: ActionFunctionArgs) => {
	const formData = await request.formData();
	const intent = formData.get("intent");

	await proxy("/api/user/update", {
		method: "POST",
		body: JSON.stringify({
			hasOnboarded: 1,
		}),
	}, request, context);

	return redirect("/");
};

export default function Onboarding() {
	const { user } = useLoaderData<typeof loader>();
	const [theme, setTheme] = useTheme();
	const navigate = useNavigate();
	const data = useRouteLoaderData<typeof routeLoader>("root");
	const env = data?.ENV || {};
	const integrations = getIntegrations(env);
	const [hasInteracted, setHasInteracted] = useState(false);
	const [extensionPresent, setExtensionPresent] = useState(false);

	if (typeof window === "undefined") return null;

	useEffect(() => {
		setTheme(Theme.DARK);
		
		// Check if extension is present
		try {
			chrome?.runtime.sendMessage(getChromeExtensionId(), { action: "ping" }, (response: any) => {
				setExtensionPresent(!chrome?.runtime.lastError);
			});
		} catch (e) {
			setExtensionPresent(false);
		}
	}, []);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="flex flex-col min-h-screen items-center pt-20 relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800"
		>
			{/* Logo */}
			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.8 }}
				className="flex flex-col gap-2 items-center font-geist italic text-4xl tracking-tight text-white"
			>
				<Logo className="h-16 w-16" /> supermemory
			</motion.div>

			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.8, delay: 0.2 }}
				className="flex flex-col gap-6 items-center mt-12 text-white max-w-2xl px-4"
			>
				<h1 className="text-2xl font-geist font-medium text-center">
					Import your existing knowledge
				</h1>
				<p className="text-gray-300 text-center max-w-lg">
					Choose one of our integrations to get started quickly. Your data will be encrypted and
					securely imported.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-4">
					{Object.values(integrations).map((integration) => {
						const Icon = integration.icon;
						const requiresExtension = integration.requiresChromeExtension;

						return (
							<motion.button
								key={integration.id}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => {
									setHasInteracted(true);
									if (requiresExtension && !extensionPresent) {
										toast("Please install the Chrome extension first", {
											action: {
												label: "Install",
												onClick: () => {
													const newWindow = window.open(
														"/extension",
														"_blank",
														"noopener,noreferrer",
													);
													if (newWindow) newWindow.opener = null;
												},
											},
										});
										return;
									}
									if (integration.handleConnection) {
										integration.handleConnection(env, navigate);
									} else if (integration.getAuthUrl) {
										window.location.href = integration.getAuthUrl(env);
									}
								}}
								className={`flex items-center gap-4 p-6 rounded-xl border border-gray-700 bg-gray-800/50 hover:bg-gray-800/80 transition-all ${integration.buttonClassName}`}
							>
								{Icon && <Icon className={integration.iconClassName || "w-8 h-8"} />}
								<div className="text-left">
									<h3 className="font-medium text-lg">{integration.name}</h3>
									<p className="text-sm text-gray-400">{integration.description}</p>
								</div>
							</motion.button>
						);
					})}
				</div>

				<div className="flex flex-col items-center gap-4 mt-8">
					{Object.values(integrations).some((i) => i.requiresChromeExtension) && (
						<a
							href="/extension"
							target="_blank"
							rel="noopener noreferrer"
							onClick={() => setHasInteracted(true)}
							className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2"
						>
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<path d="M16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2m-5.15 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56M14.34 14H9.66c-.1-.66-.16-1.32-.16-2 0-.68.06-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2M12 19.96c-.83-1.2-1.5-2.53-1.91-3.96h3.82c-.41 1.43-1.08 2.76-1.91 3.96M8 8H5.08A7.923 7.923 0 0 1 9.4 4.44C8.8 5.55 8.35 6.75 8 8m-2.92 8H8c.35 1.25.8 2.45 1.4 3.56A8.008 8.008 0 0 1 5.08 16m-.82-2C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2M12 4.03c.83 1.2 1.5 2.54 1.91 3.97h-3.82c.41-1.43 1.08-2.77 1.91-3.97M18.92 8h-2.95a15.65 15.65 0 0 0-1.38-3.56c1.84.63 3.37 1.9 4.33 3.56M12 2C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2z" />
							</svg>
							Install Chrome Extension
						</a>
					)}

					<Form method="post">
						<button
							type="submit"
							name="intent"
							value="skip"
							className="text-gray-400 hover:text-gray-300 text-sm mb-12"
							onClick={() => setHasInteracted(true)}
						>
							{hasInteracted ? "Done" : "Skip for now"}
						</button>
					</Form>
				</div>
			</motion.div>
		</motion.div>
	);
}

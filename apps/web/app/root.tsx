import React, { memo, useCallback, useEffect, useMemo, useState } from "react";

import { LinksFunction, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	json,
	useLoaderData,
} from "@remix-run/react";

import { KeyboardProvider } from "./lib/hooks/use-keyboard";
import { NonFlashOfWrongThemeEls, ThemeProvider, useTheme } from "./lib/theme-provider";
import { getThemeSession } from "./lib/theme.server";
import "./tailwind.css";

import "@fontsource/geist-sans";
import "@fontsource/geist-sans/100.css";
import "@fontsource/geist-sans/200.css";
import "@fontsource/geist-sans/300.css";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/geist-sans/800.css";
import "@fontsource/geist-sans/900.css";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "sonner";
import posthog from "posthog-js";
import { PostHogProvider, usePostHog} from 'posthog-js/react'

const queryClient = new QueryClient();

export const meta: MetaFunction = () => {
	const title = "supermemory | ai second brain for all your saved content";
	const description =
		"supermemory is your AI-powered second brain that helps you organize, search and understand all your saved content from across the web. Save articles, tweets, documents and more in one searchable place.";
	const url = "https://supermemory.ai";
	const image = `https://imagedelivery.net/_Zs8NCbSWCQ8-iurXrWjBg/1c9e9212-4c2c-4ca5-0c31-1647a362af00/public`;

	return [
		{ title },
		{ name: "description", content: description },
		{
			name: "keywords",
			content:
				"supermemory, ai, second brain, bookmark manager, note taking app, ai bookmarking, ai note taking, ai saved content, ai saved articles, ai saved tweets, ai saved documents",
		},
		{ name: "image", content: image },
		{ name: "og:url", content: url },
		{ name: "og:title", content: title },
		{ name: "og:description", content: description },
		{ name: "og:image", content: image },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:creator", content: "@dhravyashah" },
		{ name: "twitter:site", content: "@dhravyashah" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: image },
		{ name: "twitter:alt", content: title },
		{ charSet: "utf-8" },
		{ name: "viewport", content: "width=device-width, initial-scale=1" },
	];
};

interface PlusPatternBackgroundProps {
	plusSize?: number;
	plusColor?: string;
	backgroundColor?: string;
	className?: string;
	style?: React.CSSProperties;
	fade?: boolean;
	[key: string]: any;
}
export const BackgroundPlus: React.FC<PlusPatternBackgroundProps> = ({
	plusColor = "#6b6b6b",
	backgroundColor = "transparent",
	plusSize = 60,
	className,
	fade = true,
	style,
	...props
}) => {
	const encodedPlusColor = encodeURIComponent(plusColor);

	const maskStyle: React.CSSProperties = fade
		? {
				maskImage: "radial-gradient(circle, white 10%, transparent 90%)",
				WebkitMaskImage: "radial-gradient(circle, white 10%, transparent 90%)",
			}
		: {};

	const backgroundStyle: React.CSSProperties = {
		backgroundColor,
		backgroundImage: `url("data:image/svg+xml,%3Csvg width='${plusSize}' height='${plusSize}' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='${encodedPlusColor}' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
		...maskStyle,
		...style,
	};

	return (
		<div
			className={`absolute inset-0 h-full w-full ${className}`}
			style={backgroundStyle}
			{...props}
		/>
	);
};

import { cssBundleHref } from '@remix-run/css-bundle';
import sonnerStyles from './sonner.css?url';
import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: sonnerStyles },
  ...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
];

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const themeSession = await getThemeSession(request);
	const user = await getSessionFromRequest(request, context);

	return json({
		theme: themeSession.getTheme(),
		ENV: {
			NOTION_CLIENT_ID: context.cloudflare.env.NOTION_CLIENT_ID,
			NODE_ENV: context.cloudflare.env.NODE_ENV ?? "production",
		},
		user: user?.user,
	});
};

const App = React.memo(function App() {
	const data = useLoaderData<typeof loader>();
	const [theme] = useTheme();
	const posthog = usePostHog();

	useEffect(() => {
		if (data.user) {
			posthog.init("phc_TUn1bVeAZudbPn2mluA2iukyln3QSyHD0F1AbzYow5A", {
				api_host: "https://us.i.posthog.com",
				person_profiles: "identified_only",
			});
			posthog.identify(data.user.id, {
				email: data.user.email,
				firstName: data.user.firstName,
				lastName: data.user.lastName,
			});
		}
	}, [data.user]);

	return (
		<html lang="en" data-theme={theme ?? "light"}>
			<head>
				<Meta />
				<Links />
				<NonFlashOfWrongThemeEls ssrTheme={Boolean(data.theme)} />
			</head>
			<body className={theme ?? ""}>
				<Outlet />
				<ScrollRestoration />
				<Scripts />
				<Toaster />
				<div className="fixed bottom-0 left-0 right-0 flex justify-center z-[45] pointer-events-none">
					<div
						className="h-32 w-[90%] overflow-x-hidden bg-[rgb(54,157,253)] bg-opacity-100 md:bg-opacity-70 blur-[337.4px]"
						style={{ transform: "rotate(-30deg)" }}
					/>
				</div>
				<BackgroundPlus className="fixed bottom-0 left-0 w-full h-full -z-50 opacity-50" />
			</body>
		</html>
	);
});

export default function AppWithProviders() {	
	const data = useLoaderData<typeof loader>()

	return (
		<PostHogProvider client={posthog}>
			<KeyboardProvider>
				<QueryClientProvider client={queryClient}>
					<ThemeProvider specifiedTheme={data.theme}>
						<App />
					</ThemeProvider>
				</QueryClientProvider>
			</KeyboardProvider>
		</PostHogProvider>
	);
}

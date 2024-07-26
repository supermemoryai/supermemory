"use client";

import { useId } from "react";
import Image, { type ImageProps } from "next/image";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import clsx from "clsx";
import TestImg from "../../public/images/carousel-illustration-01.png";
import Search from "../../public/images/search.svg";
import Memroy from "../../public/images/memory.svg";
interface Feature {
	name: React.ReactNode;
	summary: string;
	description: string;
	image: ImageProps["src"];
	icon: React.ComponentType;
}

// TODO: This features section will be more for "use-cases"
const features: Array<Feature> = [
	{
		name: "Ideation",
		summary:
			"Never lose a great idea again - instead of saving it in your head, save it in supermemory.",
		description:
			"The internet is full of great ideas, but there's a problem. They are ephemeral. They come and go. ",
		image: "asking_questions.png",
		icon: function ReportingIcon() {
			let id = useId();
			return (
				<>
					<defs>
						<linearGradient
							id={id}
							x1="11.5"
							y1={18}
							x2={36}
							y2="15.5"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset=".194" stopColor="#fff" />
							<stop offset={1} stopColor="#6692F1" />
						</linearGradient>
					</defs>
					<path
						d="m30 15-4 5-4-11-4 18-4-11-4 7-4-5"
						stroke={`url(#${id})`}
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</>
			);
		},
	},
	{
		name: "Bookmarks",
		summary: "Simply great bookmarking tool.",
		description:
			"Good bookmarking tools have ways to import and organise your bookmarks. Great bookmarking tool resurfaces them when you need them.",
		image: "memory.svg",
		icon: function InventoryIcon() {
			return (
				<>
					<path
						opacity=".5"
						d="M8 17a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2Z"
						fill="#fff"
					/>
					<path
						opacity=".3"
						d="M8 24a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2Z"
						fill="#fff"
					/>
					<path
						d="M8 10a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2Z"
						fill="#fff"
					/>
				</>
			);
		},
	},
	{
		name: "Contacts",
		summary: "Life is all about the people you know.",
		description:
			"Tell supermemory about people you know, and when you forget, you know where to look.",
		image: "search.svg",
		icon: function ContactsIcon() {
			return (
				<>
					<path
						opacity=".5"
						d="M25.778 25.778c.39.39 1.027.393 1.384-.028A11.952 11.952 0 0 0 30 18c0-6.627-5.373-12-12-12S6 11.373 6 18c0 2.954 1.067 5.659 2.838 7.75.357.421.993.419 1.384.028.39-.39.386-1.02.036-1.448A9.959 9.959 0 0 1 8 18c0-5.523 4.477-10 10-10s10 4.477 10 10a9.959 9.959 0 0 1-2.258 6.33c-.35.427-.354 1.058.036 1.448Z"
						fill="#fff"
					/>
					<path
						d="M12 28.395V28a6 6 0 0 1 12 0v.395A11.945 11.945 0 0 1 18 30c-2.186 0-4.235-.584-6-1.605ZM21 16.5c0-1.933-.5-3.5-3-3.5s-3 1.567-3 3.5 1.343 3.5 3 3.5 3-1.567 3-3.5Z"
						fill="#fff"
					/>
				</>
			);
		},
	},
];

function Feature({
	feature,
	isActive,
	className,
	...props
}: React.ComponentPropsWithoutRef<"div"> & {
	feature: Feature;
	isActive: boolean;
}) {
	return (
		<div
			className={clsx(
				className,
				"focus:outline-none",
				!isActive && "opacity-75 hover:opacity-100",
			)}
			{...props}
		>
			<div
				className={clsx(
					"w-9 rounded-lg",
					isActive ? `bg-indigo-500` : "bg-slate-500",
				)}
			>
				<svg aria-hidden="true" className="h-9 w-9" fill="none">
					<feature.icon />
				</svg>
			</div>
			<h3
				className={clsx(
					"mt-4 text-sm font-medium",
					isActive ? `text-indigo-300` : "text-gray-300",
				)}
			>
				{feature.name}
			</h3>
			<p className="mt-2 font-display text-xl text-gray-200">
				{feature.summary}
			</p>
			<p className="mt-2 text-sm text-gray-300">{feature.description}</p>
		</div>
	);
}

function FeaturesMobile() {
	return (
		<div className="-mx-4 mt-20 flex flex-col gap-y-10 overflow-hidden px-4 sm:-mx-6 sm:px-6 lg:hidden">
			{features.map((feature) => (
				<div key={feature.summary}>
					<Feature feature={feature} className="mx-auto max-w-2xl" isActive />
					<div className="relative mt-10 pb-10">
						<div className="absolute -inset-x-4 bottom-0 top-8 bg-page-gradient sm:-inset-x-6" />
						<div className="relative mx-auto lg:w-[52.75rem] md:w-[40rem] overflow-hidden rounded-xl bg-glass-gradient shadow-lg shadow-gray-200/5 ring-1 ring-slate-500/10">
							<img
								className="w-full"
								src={`/images/${feature.image}`}
								alt=""
								sizes="52.75rem"
							/>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

function FeaturesDesktop() {
	return (
		<TabGroup className="hidden lg:mt-20 lg:block">
			{({ selectedIndex }) => (
				<>
					<TabList className="grid grid-cols-3 gap-x-8">
						{features.map((feature, featureIndex) => (
							<Feature
								key={feature.summary}
								feature={{
									...feature,
									name: (
										<Tab className="ui-not-focus-visible:outline-none">
											<span className="absolute inset-0" />
											{feature.name}
										</Tab>
									),
								}}
								isActive={featureIndex === selectedIndex}
								className="relative"
							/>
						))}
					</TabList>
					<TabPanels className="relative mt-20 overflow-hidden rounded-3xl bg-page-gradient  px-14 py-16 xl:px-16">
						<div className="-mx-5 flex">
							{features.map((feature, featureIndex) => (
								<TabPanel
									static
									key={feature.summary}
									className={clsx(
										"px-5 transition duration-500 ease-in-out ui-not-focus-visible:outline-none",
										featureIndex !== selectedIndex && "opacity-60",
									)}
									style={{ transform: `translateX(-${selectedIndex * 100}%)` }}
									aria-hidden={featureIndex !== selectedIndex}
								>
									<div className="w-[52.75rem] overflow-hidden rounded-xl bg-page-gradient shadow-lg shadow-gray-200/5 ring-1 ring-slate-500/10">
										<img
											className="max-w-full"
											src={`/images/${feature.image}`}
											alt=""
											sizes="52.75rem"
										/>
									</div>
								</TabPanel>
							))}
						</div>
						<div className="absolute inset-0 rounded-4xl ring-1 ring-inset ring-gray-200/10" />
					</TabPanels>
				</>
			)}
		</TabGroup>
	);
}

export function Showcases() {
	return (
		<section
			id="use-cases"
			className=" bg-page-gradient bg-opacity-0 relative pb-14 pt-20 sm:pb-20 sm:pt-32 lg:pb-32 w-full mt-10"
		>
			<Container>
				<div className="-z-1 absolute inset-x-0 -top-0 h-[600px]  w-full bg-transparent bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)]  bg-[size:6rem_4rem] opacity-10 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
				<div
					className="h-fukl absolute inset-0  rotate-180 blur-xl"
					// style={{
					//   background:
					//     "linear-gradient(143.6deg, rgba(52, 103, 235, 0) 20.79%, rgba(120,119,198, 0.26) 40.92%, rgba(120,119,198, 0) 70.35%)",
					// }}
				></div>
				{/* <img
          className="absolute inset-x-0 -top-0 opacity-75 "
          src={
            "/images/landing-hero-left.webp"
          }
          width={1000}
          height={1000}
          alt="back bg"
        /> */}
				<div className="mr-auto relative max-w-3xl md:text-start">
					<h2 className="font-display  text-4xl tracking-tight text-gray-200 sm:text-7xl">
						<span className="bg-gradient-to-br from-indigo-400 via-indigo-300 to-indigo-700 bg-clip-text text-transparent">
							Supermemory <br />
						</span>{" "}
						remembers everything.
					</h2>
					<p className="mt-4 text-lg tracking-tight text-gray-100">
						... so you don't have to. Whether you're a student, a professional,
						or just a person on the the internet. we got you covered.
					</p>
					<div className="overflow-x-hidden overflow-y-hidden">
						<div className="absolute right-0 z-20 top-[0%] h-40 w-[17%] overflow-x-hidden bg-[#369DFD] bg-opacity-20 blur-[110px]" />
					</div>
				</div>
				<FeaturesMobile />
				<FeaturesDesktop />
			</Container>
		</section>
	);
}

export function Container({
	className,
	...props
}: React.ComponentPropsWithoutRef<"div">) {
	return (
		<div
			className={clsx("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}
			{...props}
		/>
	);
}

"use client";
import React from "react";
import { motion } from "framer-motion";
import { Twitter } from "@repo/ui/components/icons";
import EmailInput from "./EmailInput";
import LinkArrow from "./linkArrow";
import { TwitterBorder } from "./twitterLink";
import AnimatedLogoCloud from "./ImageSliders";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const slap = {
	initial: {
		opacity: 0,
		scale: 1.1,
	},
	whileInView: { opacity: 1, scale: 1 },
	transition: {
		duration: 0.5,
		ease: "easeInOut",
	},
	viewport: { once: true },
};

function Hero() {
	return (
		<>
			<section className="flex relative flex-col gap-5 justify-center items-center mt-24 max-w-xl md:mt-32 md:max-w-2xl lg:max-w-3xl">
				<TwitterBorder />
				<motion.h1
					{...{
						...slap,
						transition: { ...slap.transition, delay: 0.2 },
					}}
					className="text-center  mx-auto bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]  bg-clip-text text-4xl tracking-tighter  sm:text-5xl text-transparent md:text-6xl lg:text-7xl"
				>
					Unlock your{" "}
					<span className="text-transparent bg-clip-text bg-gradient-to-r to-blue-200 from-zinc-300">
						digital brain
					</span>{" "}
					with supermemory
				</motion.h1>
				<motion.p
					{...{
						...slap,
						transition: { ...slap.transition, delay: 0.3 },
					}}
					className="text-lg text-center text-soft-foreground-text"
				>
					Supermemory is your ultimate hub for organizing, searching, and
					utilizing saved information with powerful tools like a search engine,
					writing assistant, and canvas.
				</motion.p>
				<Link
					href="/signin"
					className="inline-flex text-lg gap-x-2 mt-2 backdrop-blur-md text-white justify-center items-center py-3 px-5 w-fit rounded-3xl border duration-200 group bg-page-gradient border-white/30 text-md font-geistSans hover:border-zinc-600 hover:bg-transparent/10 hover:text-zinc-100"
				>
					It's free. Sign up now
					<div className="flex overflow-hidden relative justify-center items-center ml-1 w-5 h-5">
						<ArrowUpRight className="absolute transition-all duration-500 group-hover:translate-x-4 group-hover:-translate-y-5" />
						<ArrowUpRight className="absolute transition-all duration-500 -translate-x-4 -translate-y-5 group-hover:translate-x-0 group-hover:translate-y-0" />
					</div>
				</Link>
				<a
					href="https://www.producthunt.com/posts/supermemory?embed=true&utm_source=badge-top-post-badge&utm_medium=badge&utm_souce=badge-supermemory"
					target="_blank"
				>
					<img
						src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=472686&theme=dark&period=daily"
						alt="Supermemory - AI&#0032;second&#0032;brain&#0032;for&#0032;all&#0032;your&#0032;saved&#0032;stuff | Product Hunt"
						style={{ width: "250px", height: "54px" }}
						width="250"
						height="54"
					/>
				</a>
			</section>

			<AnimatedLogoCloud />
			<div className="relative z-50">
				<motion.iframe
					{...{
						...slap,
						transition: { ...slap.transition, delay: 0.35 },
					}}
					draggable="false"
					className="z-40 relative md:mt-[-40px] hidden sm:block h-full max-w-[70vw] mx-auto md:w-full select-none px-5 !rounded-2xl"
					style={{
						borderRadius: "20px",
						width: "100%",
						height: "100%",
					}}
					src="https://customer-5xczlbkyq4f9ejha.cloudflarestream.com/111c4828c3587348bc703e67bfca9682/iframe?preload=true&poster=https%3A%2F%2Fcustomer-5xczlbkyq4f9ejha.cloudflarestream.com%2F111c4828c3587348bc703e67bfca9682%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600"
					loading="lazy"
					allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
					allowFullScreen={true}
				/>
				<div
					className="absolute -z-10 left-0 top-[10%] h-32 w-[90%] overflow-x-hidden bg-[rgb(54,157,253)] bg-opacity-100  blur-[337.4px]"
					style={{ transform: "rotate(-30deg)" }}
				/>
			</div>
		</>
	);
}

export default Hero;

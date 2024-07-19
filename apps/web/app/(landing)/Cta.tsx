import React from "react";
import EmailInput from "./EmailInput";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import Link from "next/link";

function Cta() {
	return (
		<section
			id="waitlist"
			className="relative bg-page-gradient dark:[box-shadow:0_-20px_80px_-20px_#8686f01f_inset] min-h-[600px] border-[1px] border-white/20 flex flex-col gap-8 justify-center items-center mt-32 mb-28 w-full md:w-3/4 rounded-3xl py-10 px-3 md:px-8 mx-auto"
		>
			<div className="absolute -z-1 inset-0 rounded-3xl opacity-5   h-[600px] w-full bg-transparent  bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
			<div className="absolute top-0 z-0 w-screen  right-0 mx-auto h-[500px] overflow-hidden bg-inherit  bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>

			<div className="absolute left-0 w-full h-full z-[-1]">
				{/* a blue gradient line that's slightly tilted with blur (a lotof blur)*/}
				<div className="overflow-hidden">
					<div
						className="absolute left-[20%] top-[-165%] h-32 w-full overflow-hidden bg-[#369DFD] bg-opacity-70 blur-[337.4px]"
						style={{ transform: "rotate(-30deg)" }}
					/>
				</div>
			</div>
			<h1 className="text-sm z-20  text-gray-400 group font-geist mx-auto px-5 py-2 bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 to-transparent  border-[2px] border-white/5 rounded-3xl w-fit">
				<p className="tracking-tight uppercase">
					Launching July 1st, 2024
					<ChevronRight className="inline w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" />
				</p>
			</h1>
			<h1 className="z-20 mx-auto mt-0 max-w-xl font-normal tracking-tighter text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-center text-transparent bg-clip-text bg-gradient-to-tr from-zinc-400/50 to-white/60 via-white">
				Your bookmarks are collecting dust.
			</h1>
			<p className="z-20 text-center text-md md:text-lg">
				Sign up for the waitlist and be the first to try Supermemory
			</p>
			<div className="w-fit  mx-auto">
				<Link
					href="/signin"
					className="flex mx-auto w-fit gap-x-2 justify-center items-center py-3 px-5 ml-3  rounded-3xl border duration-200 group bg-page-gradient border-white/30 text-md font-geistSans hover:border-zinc-600 hover:bg-transparent/10 hover:text-zinc-100 text-white z-[1] relative"
				>
					Sign in
					<div className="flex overflow-hidden relative justify-center items-center ml-1 w-5 h-5">
						<ArrowUpRight className="absolute transition-all duration-500 group-hover:translate-x-4 group-hover:-translate-y-5" />
						<ArrowUpRight className="absolute transition-all duration-500 -translate-x-4 -translate-y-5 group-hover:translate-x-0 group-hover:translate-y-0" />
					</div>
				</Link>
			</div>
		</section>
	);
}

export default Cta;

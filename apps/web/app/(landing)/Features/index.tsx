import { CheckIcon, ChevronRight, GithubIcon } from "lucide-react";
import { Gradient } from "./features";
import Generating from "./generating";
import Image from "next/image";
import { AnimatedBeamShow } from "../CardPatterns/AnimatedBeamWithOutput";

const Services = () => {
	return (
		<div id="how-to-use">
			<div className="container">
				<div className="mr-auto max-w-5xl">
					<h1 className="mr-auto text-left font-geistSans tracking-tighter text-4xl md:text-5xl lg:text-6xl text-transparent bg-clip-text bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
						Sounds super cool? There's more.
					</h1>
					<p className="mb-10 ml-auto text-lg tracking-tight text-left font-nomral"></p>
				</div>

				<div className="relative bg-page-gradient">
					<div className="flex overflow-hidden relative items-stretch p-8 mb-5 rounded-3xl border lg:p-20 z-1 h-[55rem] md:h-[45rem] border-white/20 xl:h-[46rem]">
						<img
							src="/images/tailwind-bg-gradient.avif"
							className="absolute top-0 right-0 opacity-100 z-2"
						/>
						<img
							src="/images/tailwind-bg-gradient.avif"
							className="absolute top-0 right-0 opacity-100 z-2"
						/>
						<div className="absolute top-0 left-0 w-full h-full md:w-3/5 xl:w-auto">
							<img
								className="object-cover w-full h-full md:object-right"
								width={800}
								alt="Smartest AI"
								height={730}
								src={"/images/service-1.png"}
							/>
						</div>

						<div className="relative ml-auto z-1 max-w-[17rem]">
							<h4 className="mb-4 text-3xl md:text-4xl">
								We paid attention to details.
							</h4>
							<p className="body-2 mb-[3rem] text-n-3">
								a small team of 4 student developers who have one mission.{" "}
								<br />
								Make the best second brain for everyone.
							</p>
							<ul className="text-lg">
								{supermemoryPoints.map((item, index) => (
									<li
										key={index}
										className="flex items-start py-4 border-t border-white/20"
									>
										<CheckIcon className="inline-flex justify-center items-center mt-2 ml-2 w-4 h-4 rounded-full text-slate-200 size-4" />
										{/* <img width={24} height={24} src={check} /> */}
										<p className="ml-4">{item}</p>
									</li>
								))}
							</ul>
						</div>

						<Generating className="absolute right-4 bottom-4 left-4 border lg:bottom-8 lg-right-auto lg:left-1/2 lg:-translate-x-1/2 border-n-1/10" />
					</div>

					<div className="grid relative gap-5 lg:grid-cols-2 z-1">
						<div className="overflow-hidden flex flex-col md:flex-row md:block relative rounded-3xl border min-h-[34rem] bg-hero-gradient bg-slate-950/10 border-white/10">
							<div className="md:absolute inset-0">
								<div className="absolute -z-1 inset-0  h-[600px] w-full bg-transparent opacity-5 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

								<Image
									src="/images/landing_integrations.png"
									className="object-contain w-full h-full"
									width={630}
									height={750}
									alt="robot"
								/>
							</div>

							<div className="flex md:absolute md:mt-4 lg:-mt-20 inset-0 flex-col md:justify-end justify-center items-center md:items-start p-8 bg-glass-gradient">
								<h4 className="text-3xl tracking-tight mb-2 text-center text-transparent bg-clip-text bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
									Supermemory works everywhere you are.
								</h4>
								<p className="max-w-lg text-lg font-normal tracking-tighter text-gray-400 mb-[3rem]">
									We already have integrations for Telegram and Twitter (X),
									with whatsapp and SMS coming soon. So you can add and query
									data in a private manner, from anywhere.
								</p>
								<a
									href="/signin"
									className="inline-flex justify-center items-center py-4 px-10 w-full text-center bg-transparent bg-gradient-to-tr to-transparent rounded-xl transition-colors sm:w-auto mt-[-20px] bg-glass-gradient group from-zinc-300/5 via-gray-400/5 border-white/10 border-[1px] hover:bg-transparent/10"
								>
									Get started
									<ChevronRight className="ml-2 w-4 h-4 duration-300 group-hover:translate-x-1" />
								</a>
							</div>
						</div>

						<div
							style={{
								background:
									"linear-gradient(143.6deg, rgba(192, 132, 252, 0) 20.79%, rgba(140, 121, 249, 0.3) 60.92%, rgba(140, 121, 249, 0) 80.35%)",
							}}
							className="overflow-hidden relative py-4 rounded-3xl group bg-glass-gradient lg:min-h-[30rem]"
						>
							<div className="relative py-12 px-4 xl:px-8">
								<h4 className="text-3xl tracking-tight mb-2 text-left text-transparent bg-clip-text bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
									Privacy First
								</h4>
								<p className="text-lg text-gray-400 body-2 mb-[2rem]">
									We use state-of-the art technology and providers to make sure
									that your data is completely safe and secure, and only store
									what's absolutely needed.
								</p>
							</div>

							<div className="overflow-hidden relative rounded-xl h-[20rem] md:h-[25rem]">
								<img
									src={"/images/landing_vault.png"}
									className="object-cover w-full h-full transition-all duration-500 ease-linear transform group-hover:rotate-3"
									width={520}
									height={400}
									alt="vault image"
								/>
							</div>

							<Gradient opacity={5} />
						</div>
					</div>

					<div
						style={{
							background:
								"linear-gradient(143.6deg, rgba(192, 132, 252, 0) 20.79%, rgba(140, 121, 249, 0.2) 40.92%, rgba(140, 121, 249, 0) 80.35%)",
						}}
						className="flex overflow-hidden relative items-center p-8 mt-5 mb-5 rounded-3xl border lg:p-20 bg-page-gradient z-1 h-[38rem] border-white/20 xl:h-[28rem] dark:[box-shadow:0_-20px_80px_-20px_#8686f01f_inset]"
					>
						<img
							src="/images/tailwind-bg-gradient.avif"
							className="absolute top-0 right-0 opacity-60 z-2"
						/>

						<div className="absolute top-0 right-0 left-0 mx-auto w-full h-full xl:w-auto">
							<img
								className="object-cover z-40 w-full h-full border-r-2 md:scale-110 border-r-white/5"
								width={800}
								alt="Github"
								height={730}
								src={"/images/github.webp"}
							/>
						</div>

						<div className="absolute right-0 left-0 bottom-5 mx-auto mt-20 text-center z-1 p-8">
							<h4 className="mb-4 text-4xl tracking-tighter text-white lg:text-5xl">
								Proudly <br /> Open Source
							</h4>
							<p className="text-lg body-2 mb-[3rem] ">
								You dont even need to trust us. Just deploy it yourself and
								enjoy the benefits.
							</p>
							<a
								href="https://git.new/memory"
								className="inline-flex gap-x-1 justify-center items-center py-4 px-10 text-center bg-transparent bg-gradient-to-tr to-transparent rounded-xl transition-colors sm:w-auto w-fit mt-[-20px] bg-glass-gradient group from-zinc-300/5 via-gray-400/5 border-white/10 border-[1px] hover:bg-transparent/10"
							>
								<GithubIcon className="inline-flex justify-center items-center w-5 h-5" />{" "}
								Star us on Github
								<ChevronRight className="ml-2 w-4 h-4 duration-300 group-hover:translate-x-1" />
							</a>
						</div>
					</div>

					<div className="grid relative gap-5 lg:grid-cols-2 z-1">
						<div className="overflow-hidden relative rounded-3xl border max-h-[20rem] min-h-[40rem] md:min-h-[33rem] bg-hero-gradient bg-slate-950/10 border-white/10">
							<div className="absolute inset-0">
								<AnimatedBeamShow />
							</div>

							<div className="flex absolute inset-0 flex-col justify-end items-start p-8 pl-10 mt-4 lg:-mt-20 translate-y-10 md:translate-y-0 bg-glass-gradient">
								<h4 className="text-3xl tracking-tight mb-2 text-center text-transparent bg-clip-text bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
									Bringing content in is easy.
								</h4>
								<p className="max-w-lg text-lg font-normal tracking-tighter text-gray-400 mb-[3rem]">
									You can use our chrome extension, iOS shortcut, or our API to
									send content to supermemory.
								</p>
							</div>
						</div>

						<div className="overflow-hidden bg-page-gradient relative py-4 rounded-3xl max-h-[33rem] group  lg:min-h-[30rem]">
							<div className="absolute -z-1 inset-0  h-[600px] w-full bg-transparent opacity-5 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

							<div className="relative py-12 px-4 xl:px-8">
								<h4 className="text-3xl tracking-tight mb-2 text-left text-transparent bg-clip-text bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
									Self hostable
								</h4>
								<p className="text-lg text-gray-400 body-2 mb-[2rem]">
									All the code is open source and self hostable for
									non-commercial use.
								</p>
							</div>

							<div className="overflow-hidden relative mt-[-50px]  mb-10 rounded-xl h-[20rem] md:h-[25rem]">
								<img
									src={
										"https://www.koyeb.com/_next/image?url=%2Fimages%2Fillustrations%2Fhome-scale-mesh.webp&w=384&q=75"
									}
									className="object-cover w-full h-full transition-all duration-500 ease-linear transform group-hover:rotate-3"
									width={1000}
									height={1000}
									alt="Scary robot"
								/>
							</div>

							<Gradient opacity={5} />
						</div>
					</div>

					<Gradient />
				</div>
			</div>
		</div>
	);
};

export default Services;
const supermemoryPoints = [
	"Privacy focused",
	"Works everywhere you are",
	"Self hostable",
	"Super affordable, with a generous free tier",
];

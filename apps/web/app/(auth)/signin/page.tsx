import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/logo.svg";
import { auth, signIn } from "@/server/auth";
import { Google } from "@repo/ui/components/icons";
import gradientStyle from "./_components/TextGradient/gradient.module.css";
import { cn } from "@repo/ui/lib/utils";
import { redirect } from "next/navigation";
import { toast } from "sonner";

export const runtime = "edge";

async function Signin({
	searchParams,
}: {
	searchParams: Record<string, string>;
}) {
	const user = await auth();

	if (user) {
		redirect("/home");
	}

	return (
		<div className="flex relative font-geistSans overflow-hidden items-center justify-between min-h-screen">
			<div className="relative w-full lg:w-1/2 flex items-center min-h-screen bg-page-gradient  p-8 border-r-[1px] border-white/5">
				<div className="absolute top-0 left-0 p-8 text-white inline-flex gap-2 items-center">
					<Image
						src={Logo}
						alt="SuperMemory logo"
						className="hover:brightness-125 duration-200"
					/>
					<span className="text-xl">supermemory.ai</span>
				</div>
				<div className="absolute  inset-0 opacity-5  w-full  bg-transparent  bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
				<img
					className="absolute inset-x-0 -top-20 opacity-20"
					src={"/images/landing-hero-left.png"}
					width={1000}
					height={1000}
					alt="back bg"
				/>

				<div className="pl-4 z-20">
					<h1 className="text-5xl text-white mb-8 tracking-tighter">
						Hello,{" "}
						<span
							className={cn(
								"bg-gradient-to-tr from-zinc-100 via-zinc-200/50 to-zinc-200/90 text-transparent bg-clip-text animate-gradient",
								gradientStyle.magicText,
							)}
						>
							human
						</span>{" "}
					</h1>
					<p className="text-white mb-8 text-lg tracking-tighter">
						Write, ideate, and learn with all the wisdom of your bookmarks.
					</p>
					<div className="flex items-center gap-4">
						<div
							className={`relative cursor-pointer transition-width z-20 rounded-2xl bg-hero-gradient   p-[0.7px] duration-500  ease-in-out fit dark:[box-shadow:0_-20px_80px_-20px_#8686f01f_inset]`}
						>
							<form
								action={async () => {
									"use server";
									await signIn("google", {
										redirectTo: "/home",
									});
								}}
							>
								<button
									type="submit"
									className={`relative text-white transition-width flex gap-3 justify-center w-full items-center rounded-2xl bg-page-gradient hover:opacity-70  duration-500  px-6 py-4 outline-none duration- focus:outline-none `}
								>
									<Google />
									<span className="relative w-full">Continue with Google</span>
								</button>
							</form>
						</div>
					</div>
					<div className="text-slate-500 mt-16 z-20">
						By continuing, you agree to the
						<Link href="/tos" className="text-slate-200">
							{" "}
							Terms of Service
						</Link>{" "}
						and
						<Link href="/privacy" className="text-slate-200">
							{" "}
							Privacy Policy
						</Link>
					</div>
				</div>
			</div>
			<div className="relative hidden w-0 lg:flex lg:w-1/2  flex-col items-center justify-center min-h-screen bg-page-gradient overflow-hidden">
				<img
					className="absolute inset-x-0 -top-20 opacity-15 "
					src={"/images/landing-hero-left.png"}
					width={1000}
					height={1000}
					alt="back bg"
				/>
				<span className="text-3xl leading-relaxed tracking-tighter mb-8">
					Ready for your{" "}
					<span className="text-white font-bold">Second brain</span>?
				</span>

				<div>
					<Image
						className="mx-auto rounded-lg shadow-2xl w-[calc(100%-100px)] md:px-14 lg:px-0 lg:max-w-none"
						src={"/images/landing-hero-left.png"}
						width={700}
						height={520}
						alt="Carousel 01"
					/>
				</div>
			</div>
		</div>
	);
}

export default Signin;

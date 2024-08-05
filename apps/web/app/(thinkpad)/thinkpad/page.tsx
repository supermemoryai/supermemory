import { createCanvas } from "@/app/actions/doers";
import { getCanvas } from "@/app/actions/fetchers";
import Link from "next/link";
import React from "react";
import ImageComponent from "./image";
import Menu from "@/app/(dash)/menu";
import Header from "@/app/(dash)/header/header";
import BackgroundPlus from "@/app/(landing)/GridPatterns/PlusGrid";

async function page() {
	const canvas = await getCanvas();

	return (
		<div className="max-w-2xl m-auto pt-[20vh]">
			<div className="text-center mx-auto bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]  bg-clip-text text-4xl tracking-tighter text-transparent md:text-5xl">
				<span>Your</span>{" "}
				<span className="inline-flex items-center gap-2 bg-gradient-to-r to-blue-300 from-zinc-300 text-transparent bg-clip-text">
					ThinkPads
				</span>
			</div>

			<BlurHeaderMenu />

			<div className="w-full flex py-20 justify-center">
				{!canvas.success || canvas.error ? (
					<div>Hmmm... Something went wrong. :/</div>
				) : (
					canvas.data &&
					(canvas.data.length ? (
						canvas.data.map((v) => (
							<Canvas description={v.description} title={v.title} id={v.id} />
						))
					) : (
						<CreateCanvas />
					))
				)}
			</div>

			<h3 className="fixed left-1/2 -translate-x-1/2 bottom-4 text-gray-400 pt-20 text-center">
				Thinkpads is under beta and only one thinkpad is allowed per user.
			</h3>
		</div>
	);
}

function BlurHeaderMenu() {
	return (
		<>
			<div className="relative flex justify-center z-40 pointer-events-none">
				<div
					className="absolute -z-10 left-0 top-[10%] h-32 w-[90%] overflow-x-hidden bg-[rgb(54,157,253)] bg-opacity-100 md:bg-opacity-70 blur-[337.4px]"
					style={{ transform: "rotate(-30deg)" }}
				/>
			</div>
			<BackgroundPlus className="absolute top-0 left-0 w-full h-full -z-50 opacity-70" />

			<div className="fixed top-0 left-0 w-full z-40">
				<Header />
			</div>

			<Menu />
		</>
	);
}

type TcanvasInfo = {
	title: string;
	description: string;
	id: string;
};

function CreateCanvas() {
	return (
		<form action={createCanvas}>
			<button
				type="submit"
				className="bg-secondary w-72 border-2 border-border rounded-md shadow-md shadow-[#1d1d1dc7] hover:scale-[1.03] active:scale-95"
			>
				<div className="w-full aspect-video bg-[#2C3439]"></div>
				<div className="p-2 text-left">
					<h2 className="text-lg text-gray-100">Unleash your creativity!</h2>
					<h3 className="text-base text-gray-300">
						This description will fill itself as you draw on the canvas
					</h3>
				</div>
			</button>
		</form>
	);
}

function Canvas(props: TcanvasInfo) {
	const { title, description, id } = props;
	return (
		<Link
			href={`/thinkpad/${id}`}
			className="bg-secondary w-72 border-2 border-border rounded-md shadow-md shadow-[#1d1d1dc7]"
		>
			<div className="w-full aspect-video bg-[#2C3439]">
				<ImageComponent id={id} />
			</div>
			<div className="p-2 text-left">
				<h2 className="text-lg text-gray-100">
					{title === "Untitled" ? "Unleash your creativity!" : title}
				</h2>
				<h3 className="text-base text-gray-300">
					{description === "Untitled"
						? "This description will fill itself as you draw on the canvas"
						: description}
				</h3>
			</div>
		</Link>
	);
}

export default page;

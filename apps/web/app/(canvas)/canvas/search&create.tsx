"use client";

import { useFormStatus } from "react-dom";
import Image from "next/image";
import { SearchIcon } from "@repo/ui/icons";
import { createCanvas } from "@/app/actions/doers";
import { toast } from "sonner";

export default function SearchandCreate() {
	return (
		<div className="flex w-[90%] max-w-2xl gap-2">
			<div className="flex flex-grow items-center overflow-hidden rounded-xl bg-[#1F2428]">
				<input
					placeholder="search here..."
					className="flex-grow bg-[#1F2428] px-5 py-3 text-xl focus:border-none focus:outline-none"
				/>
				<button className="h-full border-l-2 border-[#384149] px-2 pl-2">
					<Image src={SearchIcon} alt="search" />
				</button>
			</div>

			<form
				action={async () => {
					const res = await createCanvas();
					if (!res.success) {
						toast.warning(res.message, {
							style: { backgroundColor: "rgb(22 31 42 / 0.3)" },
						});
					}
				}}
			>
				<Button />
			</form>
		</div>
	);
}

function Button() {
	const { pending } = useFormStatus();
	return (
		<button className="rounded-xl bg-[#1F2428] px-5 py-3 text-xl text-[#B8C4C6]">
			{pending ? "Creating.." : "Create New"}
		</button>
	);
}

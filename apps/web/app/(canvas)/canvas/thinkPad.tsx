import { getCanvasData } from "@/app/actions/fetchers";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
	EllipsisHorizontalCircleIcon,
	TrashIcon,
	PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Label } from "@repo/ui/shadcn/label";

const childVariants = {
	hidden: { opacity: 0, y: 10, filter: "blur(2px)" },
	visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export default function ThinkPad({
	title,
	description,
	image,
	id,
}: {
	title: string;
	description: string;
	image: string;
	id: string;
}) {
	const [deleted, setDeleted] = useState(false);
	const [info, setInfo] = useState({ title, description });
	return (
		<AnimatePresence mode="sync">
			{!deleted && (
				<motion.div
					layout
					exit={{ opacity: 0, scaleY: 0 }}
					variants={childVariants}
					className="flex h-48 origin-top relative gap-4 rounded-2xl bg-[#1F2428] p-2"
				>
					<Link
						className="h-full select-none min-w-[40%] bg-[#363f46] rounded-xl overflow-hidden"
						href={`/canvas/${id}`}
					>
						<Suspense
							fallback={
								<div className=" h-full w-full flex  justify-center items-center">
									Loading...
								</div>
							}
						>
							<ImageComponent id={id} />
						</Suspense>
					</Link>
					<div className="flex flex-col gap-2">
						<motion.h2
							initial={{ opacity: 0, filter: "blur(3px)" }}
							animate={{ opacity: 1, filter: "blur(0px)" }}
							key={info.title}
						>
							{info.title}
						</motion.h2>
						<motion.h3
							key={info.description}
							initial={{ opacity: 0, filter: "blur(3px)" }}
							animate={{ opacity: 1, filter: "blur(0px)" }}
							className="overflow-hidden text-ellipsis text-[#B8C4C6]"
						>
							{info.description}
						</motion.h3>
					</div>
					<Menu
						info={info}
						id={id}
						setDeleted={() => setDeleted(true)}
						setInfo={(e) => setInfo(e)}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/shadcn/popover";

function Menu({
	info,
	id,
	setDeleted,
	setInfo,
}: {
	info: { title: string; description: string };
	id: string;
	setDeleted: () => void;
	setInfo: ({
		title,
		description,
	}: {
		title: string;
		description: string;
	}) => void;
}) {
	return (
		<Popover>
			<PopoverTrigger className="absolute z-20 top-0 right-0" asChild>
				<Button variant="secondary">
					<EllipsisHorizontalCircleIcon className="size-5 stroke-2 stroke-[#B8C4C6]" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-32 px-2 py-2 bg-[#161f2a]/30 text-[#B8C4C6] border-border flex flex-col gap-3"
			>
				<EditToolbar info={info} id={id} setInfo={setInfo} />
				<Button
					onClick={async () => {
						const res = await deleteCanvas(id);
						if (res.success) {
							toast.success("Thinkpad removed.", {
								style: { backgroundColor: "rgb(22 31 42 / 0.3)" },
							});
							setDeleted();
						} else {
							toast.warning("Something went wrong.", {
								style: { backgroundColor: "rgb(22 31 42 / 0.3)" },
							});
						}
					}}
					className="flex gap-2 border-border"
					variant="outline"
				>
					<TrashIcon className="size-8 stroke-1" /> Delete
				</Button>
			</PopoverContent>
		</Popover>
	);
}

function EditToolbar({
	id,
	setInfo,
	info,
}: {
	id: string;
	setInfo: ({
		title,
		description,
	}: {
		title: string;
		description: string;
	}) => void;
	info: {
		title: string;
		description: string;
	};
}) {
	const [open, setOpen] = useState(false);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button className="flex gap-2 border-border" variant="outline">
					<PencilSquareIcon className="size-8 stroke-1" /> Edit
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] bg-[#161f2a]/30 border-0">
				<form
					action={async (FormData) => {
						const data = {
							title: FormData.get("title") as string,
							description: FormData.get("description") as string,
						};
						const res = await AddCanvasInfo({ id, ...data });
						if (res.success) {
							setOpen(false);
							setInfo(data);
						} else {
							setOpen(false);
							toast.error("Something went wrong.", {
								style: { backgroundColor: "rgb(22 31 42 / 0.3)" },
							});
						}
					}}
				>
					<DialogHeader>
						<DialogTitle>Edit Canvas</DialogTitle>
						<DialogDescription>
							Add Description to your canvas. Pro tip: Let AI do the job, as you
							add your content into canvas, we will autogenerate your
							description.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="title" className="text-right">
								Title
							</Label>
							<Input
								defaultValue={info.title}
								name="title"
								id="title"
								placeholder="life planning..."
								className="col-span-3 border-0"
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="description" className="text-right">
								Description
							</Label>
							<Textarea
								defaultValue={info.description}
								rows={6}
								id="description"
								name="description"
								placeholder="contains information about..."
								className="col-span-3 border-0 resize-none"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button type="submit">Save changes</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

import { Suspense, memo, use, useState } from "react";
import { Box, TldrawImage } from "tldraw";
import { Button } from "@repo/ui/shadcn/button";
import { AddCanvasInfo, deleteCanvas } from "@/app/actions/doers";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/shadcn/dialog";
import { Input } from "@repo/ui/shadcn/input";
import { Textarea } from "@repo/ui/shadcn/textarea";
import { textCardUtil } from "@/components/canvas/textCard";
import { twitterCardUtil } from "@/components/canvas/twitterCard";

const ImageComponent = memo(({ id }: { id: string }) => {
	const snapshot = use(getCanvasData(id));
	if (snapshot.bounds) {
		const pageBounds = new Box(
			snapshot.bounds.x,
			snapshot.bounds.y,
			snapshot.bounds.w,
			snapshot.bounds.h,
		);

		return (
			<TldrawImage
				shapeUtils={[twitterCardUtil, textCardUtil]}
				snapshot={snapshot.snapshot}
				background={false}
				darkMode={true}
				bounds={pageBounds}
				padding={0}
				scale={1}
				format="png"
			/>
		);
	}
	return (
		<div className=" h-full w-full flex justify-center items-center">
			Drew things to seee here
		</div>
	);
});

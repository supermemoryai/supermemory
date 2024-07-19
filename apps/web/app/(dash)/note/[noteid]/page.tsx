import { getNoteFromId } from "@/app/actions/fetchers";
import { NotebookIcon } from "lucide-react";

async function Page({ params }: { params: { noteid: string } }) {
	const note = await getNoteFromId(params.noteid as string);

	if (!note.success) {
		return <div>Failed to load note</div>;
	}

	return (
		<div className="max-w-3xl mt-16 md:mt-32 flex mx-auto w-full flex-col">
			<div className="flex items-center gap-2 text-xs">
				<NotebookIcon className="w-3 h-3" /> Note
			</div>
			<h1 className="text-white w-full font-medium text-2xl text-left mt-2">
				{note.data?.title}
			</h1>
			<div className="w-full pb-20 mt-12">{note.data?.content}</div>
		</div>
	);
}

export default Page;

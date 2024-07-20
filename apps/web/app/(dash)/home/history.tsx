import { getRecentChats } from "@/app/actions/fetchers";
import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@repo/ui/shadcn/skeleton";
import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";

const History = memo(() => {
	const [chatThreads, setChatThreads] = useState(null);

	useEffect(() => {
		(async () => {
			const chatThreads = await getRecentChats();

			// @ts-ignore
			setChatThreads(chatThreads);
		})();
	}, []);

	if (!chatThreads) {
		return (
			<>
			<Skeleton className="w-[80%] h-4 bg-[#3b444b] "></Skeleton>
			<Skeleton className="w-[40%] h-4 bg-[#3b444b] "></Skeleton>
			<Skeleton className="w-[60%] h-4 bg-[#3b444b] "></Skeleton>
		</>
		);
	}

	// @ts-ignore, time wastage
	if (!chatThreads.success || !chatThreads.data) {
		return <div>Error fetching chat threads</div>;
	}

	return (
		<ul className="text-base list-none space-y-3 text-[#b9b9b9]">
			{/* @ts-ignore */}
			{chatThreads.data.map((thread) => (
				<motion.li initial={{opacity: 0, filter: "blur(1px)"}} animate={{opacity: 1, filter: "blur(0px)"}} className="flex items-center gap-2 truncate">
					<ArrowLongRightIcon className="h-5" />{" "}
					<Link prefetch={false} href={`/chat/${thread.id}`}>
						{thread.firstMessage}
					</Link>
				</motion.li>
			))}
		</ul>
	);
});

export default History;
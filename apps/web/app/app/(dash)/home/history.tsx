import { getChatHistory } from "@repo/web/app/actions/fetchers";
import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@repo/ui/shadcn/skeleton";
import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { chatThreads } from "@/server/db/schema";
import { getQuerySuggestions } from "@/app/actions/doers";
import { Button } from "@repo/ui/shadcn/button";

const History = memo(({ setQuery }: { setQuery: (q: string) => void }) => {
	const [suggestions, setSuggestions] = useState<string[] | null>(null);

	useEffect(() => {
		(async () => {
			const suggestions = await getQuerySuggestions();
			if (!suggestions.success || !suggestions.data) {
				console.error(suggestions.error);
				setSuggestions([]);
				return;
			}
			console.log(suggestions);
			if (typeof suggestions.data === "string") {
				setSuggestions(JSON.parse(suggestions.data));
				return;
			}
			setSuggestions(suggestions.data.reverse().slice(0, 3));
		})();
	}, []);

	return (
		<ul className="text-base list-none space-y-3 text-[#b9b9b9] mt-8">
			{!suggestions && (
				<>
					<Skeleton
						key="loader-1"
						className="w-[80%] h-4 bg-[#3b444b] "
					></Skeleton>
					<Skeleton
						key="loader-2"
						className="w-[40%] h-4 bg-[#3b444b] "
					></Skeleton>
					<Skeleton
						key="loader-3"
						className="w-[60%] h-4 bg-[#3b444b] "
					></Skeleton>
				</>
			)}
			{suggestions?.map((suggestion) => (
				<motion.li
					initial={{ opacity: 0, filter: "blur(1px)" }}
					animate={{ opacity: 1, filter: "blur(0px)" }}
					className="flex items-center gap-2 truncate cursor-pointer"
					key={suggestion}
					onClick={() => setQuery(suggestion)}
				>
					<ArrowLongRightIcon className="h-5" /> {suggestion}
				</motion.li>
			))}
		</ul>
	);
});

export default History;

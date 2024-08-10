import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import useCommandStore from "../../../store";
import { CommandInput } from "cmdk";

function CommandSearch() {
	const { page, search, searchInputRef, setSearch, goBack } = useCommandStore(
		(state) => {
			return {
				page: state.page,
				setPages: state.setPages,
				search: state.search,
				setSearch: state.setSearch,
				searchInputRef: state.searchInputRef,
				goBack: state.backPage,
			};
		},
	);

	return (
		<div className="h-14 flex items-center border-b border-border">
			<motion.div
				animate={{ opacity: !page ? 0 : 1, width: !page ? 0 : 130 }}
				transition={{ ease: "easeOut" }}
				className="overflow-hidden"
			>
				<AnimatePresence>
					{page && (
						<div className="shrink-0 flex items-center">
							{/* @ts-ignore */}
							<button
								className="flex items-center shrink-0 text-icon gap-2 px-4"
								onClick={goBack}
							>
								<ArrowLeftIcon className="size-4 " />
								Go back
							</button>

							<motion.span
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 24 }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ delay: 0.3 }}
								className="w-[1.5px] bg-white/30 shrink-0"
							/>
						</div>
					)}
				</AnimatePresence>
			</motion.div>

			<CommandInput
				autoFocus
				ref={searchInputRef}
				value={search}
				onValueChange={setSearch}
				placeholder="Search for tools or simply ask anything..."
				className="w-full h-full bg-transparent outline-none px-4 placeholder:text-placeholder text-[15px]"
			/>
		</div>
	);
}

export default CommandSearch;

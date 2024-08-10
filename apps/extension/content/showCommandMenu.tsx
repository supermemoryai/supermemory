import React, { useEffect } from "react";
import useCommandStore from "./store";
import { Command } from "cmdk";
import CommandSearch from "./ui/components/command/CommandSearch";
import Footer from "./ui/components/command/Footer";
import AiSearchView from "./ui/components/command/AiSearch";

function ShowCommandMenu() {
	const {
		currValue,
		page,
		pages,
		search,
		setSearch,
		searchInputRef,
		setCurrentValue,
		setPage,
		backPage,
	} = useCommandStore();

	const excludeFromDefaultActions = [""];

	useEffect(() => {
		setPage(pages[pages.length - 1]);
	}, [pages]);

	// continue typing when key is pressed
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (searchInputRef.current) {
				// check if it is character or number
				if (e.key.length === 1) {
					searchInputRef.current.focus();
				}
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	// clear search when page changes
	useEffect(() => {
		if (page && !excludeFromDefaultActions.includes(page)) setSearch("");
	}, [page]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		// Escape goes to previous page
		// Backspace goes to previous page when search is empty
		if (e.key === "Escape" || (e.key === "Backspace" && !search)) {
			e.preventDefault();
			backPage();
		}
	};
	return (
		<Command
			// loop
			value={currValue}
			onValueChange={setCurrentValue}
			defaultValue={"Projected revenue for this quarter?"}
			onKeyDown={handleKeyDown}
			className="bg-main w-full max-w-[782px] h-[514px] rounded-3xl outline outline-[2px] outline-outline overflow-hidden flex flex-col backdrop-blur-[160px]"
		>
			<div className="flex flex-col h-full">
				{/* search */}
				<CommandSearch />

				{/* views */}
				<Command.List className="h-full p-2 py-4 overflow-y-auto command-scrollbar my-2">
					<AiSearchView />
				</Command.List>

				{/* bottom bar */}
				<div className="bg-footer h-12 w-full shrink-0 p-4 text-xs font-medium">
					<Footer />
				</div>
			</div>
		</Command>
	);
}

export default ShowCommandMenu;

import { create } from "zustand";
import { RefObject } from "react";

interface CommandProps {
	currValue: string;
	setCurrentValue: (value: string) => void;

	search: string;
	setSearch: (value: string) => void;

	pages: string[];
	setPages: (pages: string[]) => void;
	backPage: () => void;

	page: string;
	setPage: (page: string) => void;

	searchInputRef: RefObject<HTMLInputElement>;
	setSearchInputRef: (ref: RefObject<HTMLInputElement>) => void;
}

const useCommandStore = create<CommandProps>((set) => ({
	currValue: "",
	setCurrentValue: (value) => set({ currValue: value }),

	search: "",
	setSearch: (value) => set({ search: value }),

	pages: [],
	setPages: (pages) => {
		set({ pages });
	},
	backPage: () => {
		const pages = [...useCommandStore.getState().pages];
		pages.pop();
		useCommandStore.getState().setPages(pages);
	},

	page: "",
	setPage: (page) => set({ page }),

	searchInputRef: { current: null },
	setSearchInputRef: (ref: RefObject<HTMLInputElement>) =>
		set({ searchInputRef: ref }),
}));

export default useCommandStore;

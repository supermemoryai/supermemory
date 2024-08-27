import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";

import { EmojiList } from "./emojiList";
import { Editor } from "@tiptap/core";

interface EmojiItem {
	shortcodes: string[];
	tags: string[];
}

interface SuggestionProps {
	editor: Editor;
	clientRect: () => DOMRect;
	event: KeyboardEvent;
}

export default {
	items: ({ editor, query }: { editor: Editor; query: string }) => {
		return (editor.storage.emoji.emojis as EmojiItem[])
			.filter(({ shortcodes, tags }) => {
				return (
					shortcodes.find((shortcode: string) =>
						shortcode.startsWith(query.toLowerCase()),
					) || tags.find((tag: string) => tag.startsWith(query.toLowerCase()))
				);
			})
			.slice(0, 5);
	},

	allowSpaces: false,

	render: () => {
		let component: ReactRenderer;
		let popup: TippyInstance[];

		return {
			onStart: (props: SuggestionProps) => {
				component = new ReactRenderer(EmojiList, {
					props,
					editor: props.editor,
				});

				popup = tippy("body", {
					getReferenceClientRect: props.clientRect,
					appendTo: () => document.body,
					content: component.element,
					showOnCreate: true,
					interactive: true,
					trigger: "manual",
					placement: "bottom-start",
				});
			},

			onUpdate(props: SuggestionProps) {
				component.updateProps(props);

				popup[0]?.setProps({
					getReferenceClientRect: props.clientRect,
				});
			},

			onKeyDown(props: SuggestionProps) {
				if (props.event.key === "Escape") {
					popup[0]?.hide();
					component.destroy();

					return true;
				}

				// @ts-ignore
				return component.ref?.onKeyDown(props);
			},

			onExit() {
				popup[0]?.destroy();
				component.destroy();
			},
		};
	},
};

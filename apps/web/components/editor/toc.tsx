import { TextSelection } from "@tiptap/pm/state";
import { useEditor } from "novel";
import { motion } from "framer-motion";
type tContent = {
	id: string;
	textContent: string;
	level: number;
	isActive: boolean;
	itemIndex: number;
	isScrolledOver: boolean;
};

export const ToCItem = ({
	item,
	onItemClick,
}: {
	item: tContent;
	onItemClick: (e: MouseEvent, id: string) => void;
}) => {
	return (
		<div
			className={`text-sm ${
				item.level === 2 ? "pl-2" : item.level === 3 ? "pl-4" : "pl-0"
			}`}
		>
			<a
				href={`#${item.id}`}
				onClick={(e) => onItemClick(e, item.id)}
				data-item-index={item.itemIndex}
			>
				{item.textContent}
			</a>
		</div>
	);
};

export const ToC = ({ items }: { items: tContent[] }) => {
	if (items.length === 0) {
		return;
	}

	return (
		<div className="fixed w-40 right-0 top-1/2 -translate-y-1/2 mr-12">
			<div className="items-end space-y-3 py-2 max-h-[60vh] overflow-hidden">
				{items.map((item, i) => (
					<ToCItemStick key={item.id} item={item} />
				))}
			</div>
			<motion.div
				initial={{ x: 15, opacity: 0 }}
				whileHover={{ x: 5, opacity: 1 }}
				transition={{ ease: "easeOut", duration: 0.15 }}
				className="absolute top-0 right-0 space-y-3"
			>
				<Container items={items} />
			</motion.div>
		</div>
	);
};

function Container({ items }: { items: tContent[] }) {
	const { editor } = useEditor();

	const onItemClick = (e, id) => {
		e.preventDefault();

		if (editor) {
			const element = editor.view.dom.querySelector(`[data-toc-id="${id}"`);
			const pos = editor.view.posAtDOM(element, 0);

			// set focus
			const tr = editor.view.state.tr;

			tr.setSelection(new TextSelection(tr.doc.resolve(pos)));

			editor.view.dispatch(tr);

			editor.view.focus();

			if (history.pushState) {
				// eslint-disable-line
				history.pushState(null, null, `#${id}`); // eslint-disable-line
			}

			window.scrollTo({
				top: element.getBoundingClientRect().top + window.scrollY,
				behavior: "smooth",
			});
		}
	};

	return (
		<div className="bg-[#1F2428] rounded-xl overflow-auto max-h-[60vh] px-4">
			{items.map((item, i) => (
				<ToCItem onItemClick={onItemClick} key={item.id} item={item} />
			))}
		</div>
	);
}

export function ToCItemStick({ item }: { item: tContent }) {
	return (
		<div
			className={`h-[0.125rem] bg-gray-500 rounded-xl ml-auto ${
				item.level === 1 ? "w-6" : item.level === 2 ? "w-4" : "w-3"
			}`}
		></div>
	);
}

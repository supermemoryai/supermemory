import { useEditor } from "novel";
import { motion } from "framer-motion";

type tContent = {
	id: string;
	textContent: string;
	level: number;
	isActive: boolean;
	itemIndex: number;
	isScrolledOver: boolean;
	pos: number;
};

export const ToCItem = ({
	item,
	onItemClick,
}: {
	item: tContent;
	onItemClick: (pos: number) => void;
}) => {
	return (
		<div
			className={`text-sm ${
				item.level === 2 ? "pl-2" : item.level === 3 ? "pl-4" : "pl-0"
			}`}
		>
			<div
				onClick={() => onItemClick(item.pos)}
				className={`cursor-pointer text-base font-medium py-1 px-2 w-full hover:bg-[#2b3238] transition-colors rounded-sm ${item.isActive && "text-blue-500"}`}
			>
				{item.textContent}
			</div>
		</div>
	);
};

export const ToC = ({ items }: { items: tContent[] }) => {
	if (items.length < 2) {
		return;
	}

	return (
		<div className="fixed right-0 top-1/4 -translate-y-1/2 mr-12">
			<div className="items-end space-y-3 py-2 max-h-[60vh] overflow-hidden">
				{items.map((item, i) => (
					<ToCItemStick key={item.id} item={item} />
				))}
			</div>
			<motion.div
				initial={{ x: 15, opacity: 0 }}
				whileHover={{ x: 5, opacity: 1 }}
				transition={{ ease: "easeOut", duration: 0.15 }}
				className="absolute top-0 right-0 space-y-3 min-w-72 max-w-72"
			>
				<Container items={items} />
			</motion.div>
		</div>
	);
};

function Container({ items }: { items: tContent[] }) {
	const { editor } = useEditor();

	const onItemClick = (pos: number) => {
		console.log(pos);
		if (editor) {
			editor.commands.focus(pos ? pos : 1, { scrollIntoView: true });
		}
	};

	return (
		<div className="bg-[#1F2428] rounded-xl overflow-auto max-h-[60vh] px-4 py-6">
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

import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useState,
} from "react";

export const EmojiList = forwardRef((props, ref) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	const selectItem = (index) => {
		const item = props.items[index];
		if (item) {
			props.command({ name: item.name });
		}
	};

	const upHandler = () => {
		setSelectedIndex(
			(selectedIndex + props.items.length - 1) % props.items.length,
		);
	};

	const downHandler = () => {
		setSelectedIndex((selectedIndex + 1) % props.items.length);
	};

	const enterHandler = () => {
		selectItem(selectedIndex);
	};

	useEffect(() => setSelectedIndex(0), [props.items]);

	useImperativeHandle(
		ref,
		() => ({
			onKeyDown: (x) => {
				if (x.event.key === "ArrowUp") {
					upHandler();
					return true;
				}
				if (x.event.key === "ArrowDown") {
					downHandler();
					return true;
				}
				if (x.event.key === "Enter") {
					enterHandler();
					return true;
				}
				return false;
			},
		}),
		[upHandler, downHandler, enterHandler],
	);

	return (
		<div className="bg-[#1F2428]  shadow-md flex flex-col gap-0.5 overflow-auto p-1.5 relative">
			{props.items.map((item, index) => (
				<button
					className={`flex items-center gap-1 w-full text-left ${
						index === selectedIndex && "bg-[#21303D] text-[#369DFD]"
					}`}
					key={index}
					onClick={() => selectItem(index)}
				>
					{item.fallbackImage ? (
						<img src={item.fallbackImage} className="w-4 h-4" alt="" />
					) : (
						item.emoji
					)}
					:{item.name}:
				</button>
			))}
		</div>
	);
});

const ChatBubbleWing = ({
	className,
	pathClassName,
}: {
	className?: string;
	pathClassName?: string;
}) => {
	return (
		<svg
			className={`${className || ""}`}
			xmlns="http://www.w3.org/2000/svg"
			width="26"
			height="37"
		>
			<path
				className={`${pathClassName || ""}`}
				d="M21.843 37.001c3.564 0 5.348-4.309 2.829-6.828L3.515 9.015A12 12 0 0 1 0 .53v36.471h21.843z"
			/>
		</svg>
	);
};

export default ChatBubbleWing;

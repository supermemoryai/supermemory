const formClasses =
	"block w-full appearance-none rounded-lg border bg-white py-[calc(theme(spacing.2)-1px)] px-[calc(theme(spacing.3)-1px)] text-gray-900 placeholder:text-gray-400 focus:border-stone-500 focus:outline-none focus:ring-cyan-500 sm:text-sm";

const Label = ({ id, children }: any) => {
	return (
		<label
			htmlFor={id}
			className="mb-2 block text-sm font-semibold text-gray-900"
		>
			{children}
		</label>
	);
};

const TextField = ({ id, label, type = "text", className, ...props }: any) => {
	return (
		<div className={className}>
			{label && <Label id={id}>{label}</Label>}
			<input id={id} type={type} {...props} className={formClasses} />
		</div>
	);
};

export default TextField;

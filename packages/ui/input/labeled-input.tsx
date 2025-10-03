import { cn } from "@lib/utils";
import { Input } from "@ui/components/input";
import { Label1Regular } from "@ui/text/label/label-1-regular";

interface LabeledInputProps extends React.ComponentProps<"div"> {
	label: string;
	inputType: string;
	inputPlaceholder: string;
	error?: string | null;
	inputProps?: React.ComponentProps<typeof Input>;
}

export function LabeledInput({
	label,
	inputType,
	inputPlaceholder,
	className,
	error,
	inputProps,
	...props
}: LabeledInputProps) {
	return (
		<div className={cn("flex flex-col gap-2", className)} {...props}>
			<Label1Regular className="text-foreground">{label}</Label1Regular>

			<Input
				className={cn(
					"w-full leading-[1.375rem] tracking-[-0.4px] rounded-2xl p-5 placeholder:text-muted-foreground text-foreground border-[1.5px] border-border disabled:cursor-not-allowed disabled:opacity-50",
					inputProps?.className,
				)}
				placeholder={inputPlaceholder}
				type={inputType}
				{...inputProps}
			/>
			{error && (
				<p className="text-sm text-red-500" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}

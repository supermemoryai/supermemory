import { cn } from "@lib/utils";
import { Input } from "@ui/components/input";
import { Label1Regular } from "@ui/text/label/label-1-regular";

interface LabeledInputProps extends React.ComponentProps<"div"> {
	label?: string;
	inputType: string;
	inputPlaceholder: string;
	error?: string | null;
	inputProps?: React.ComponentProps<typeof Input>;
}

export function LabeledInput({
	inputType,
	inputPlaceholder,
	className,
	error,
	inputProps,
	label,
	...props
}: LabeledInputProps) {
	return (
		<div className={cn("flex flex-col gap-2", className)} {...props}>
			{label && <Label1Regular className="text-foreground">{label}</Label1Regular>}
			<Input
				className={cn(
					"w-full leading-[1.375rem] tracking-[-0.4px] rounded-xl p-5 placeholder:text-muted-foreground/50 text-foreground disabled:cursor-not-allowed disabled:opacity-50",
					inputProps?.className,
				)}
				style={{
					borderRadius: "12px",
					border: "1px solid rgba(82, 89, 102, 0.20)",
					background: "rgba(91, 126, 245, 0.04)",
					boxShadow: "0 1px 2px 0 rgba(0, 43, 87, 0.10), 0 0 0 1px rgba(43, 49, 67, 0.08) inset, 0 1px 1px 0 rgba(0, 0, 0, 0.08) inset, 0 2px 4px 0 rgba(0, 0, 0, 0.02) inset",
				}}
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

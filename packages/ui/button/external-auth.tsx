import { cn } from "@lib/utils";
import { Button } from "@ui/components/button";

interface ExternalAuthButtonProps extends React.ComponentProps<typeof Button> {
	authProvider: string;
	authIcon: React.ReactNode;
}

export function ExternalAuthButton({
	authProvider,
	authIcon,
	className,
	...props
}: ExternalAuthButtonProps) {
	return (
		<Button
			className={cn(
				"flex flex-grow cursor-pointer max-w-full items-center justify-center gap-[0.625rem] rounded-xl px-6 py-5 hover:opacity-75",
				className,
			)}
			style={{
				borderRadius: "12px",
				background: "linear-gradient(180deg, #00264F 0%, #001933 100%), linear-gradient(180deg, #0A0E14 0%, #05070A 100%)",
				boxShadow: "0 1px 2px 0 rgba(0, 43, 87, 0.10), 1px 1px 1px 1px #002B57 inset",
				height: "44px",
			}}
			{...props}
		>
			<span className="aspect-square">{authIcon}</span>
			<span className="text-foreground text-left text-[0.875rem] tracking-[-0.2px] leading-[1.25rem]">
				Continue with {authProvider}
			</span>
		</Button>
	);
}

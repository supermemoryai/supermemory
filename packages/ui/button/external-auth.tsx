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
				"flex flex-grow cursor-pointer max-w-full bg-background items-center justify-center gap-[0.625rem] rounded-xl border-[1.5px] border-border px-6 py-5 hover:bg-accent",
				className,
			)}
			{...props}
		>
			<span className="aspect-square">{authIcon}</span>
			<span className="text-foreground text-left text-[0.875rem] tracking-[-0.2px] leading-[1.25rem]">
				Continue with {authProvider}
			</span>
		</Button>
	);
}

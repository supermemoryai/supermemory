"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			className="toaster group"
			theme={theme as ToasterProps["theme"]}
			closeButton
			toastOptions={{
				classNames: {
					toast:
						"!bg-[#0b1017] !border !border-[#1b1f24] !rounded-[10px] !p-3 !shadow-lg",
					title:
						"!text-[#fafafa] !text-[12px] !leading-[1.35] !tracking-[-0.12px] !font-['DM_Sans',sans-serif]",
					description:
						"!text-[#fafafa] !text-[12px] !leading-[1.35] !tracking-[-0.12px] !font-['DM_Sans',sans-serif]",
					closeButton:
						"!bg-transparent !border-none !text-[#fafafa] hover:!bg-white/10 !size-6 !static !ml-2 !shrink-0",
					actionButton: "!bg-white/10 !text-[#fafafa]",
					cancelButton: "!bg-transparent !text-[#fafafa]",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };

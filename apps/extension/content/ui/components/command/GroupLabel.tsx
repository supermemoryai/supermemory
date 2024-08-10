import React from "react";

const GroupLabel = React.forwardRef<
	HTMLParagraphElement,
	React.ComponentPropsWithoutRef<"p">
>(({ className, ...props }, ref) => (
	<p
		ref={ref}
		className="text-xs font-medium text-label px-2 pb-3"
		{...props}
	/>
));

GroupLabel.displayName = "GroupLabel";

export { GroupLabel };

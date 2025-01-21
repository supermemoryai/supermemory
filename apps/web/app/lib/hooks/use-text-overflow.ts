import { useCallback, useEffect, useRef, useState } from "react";

export const useTextOverflow = (content: string, lineCount: number) => {
	const [showFade, setShowFade] = useState(false);
	const contentRef = useRef<HTMLParagraphElement>(null);

	const checkOverflow = useCallback(() => {
		if (contentRef.current) {
			const lineHeight = parseInt(window.getComputedStyle(contentRef.current).lineHeight);
			const height = contentRef.current.offsetHeight;
			setShowFade(height > lineHeight * lineCount);
		}
	}, [lineCount]);

	useEffect(() => {
		checkOverflow();
		window.addEventListener("resize", checkOverflow);
		return () => window.removeEventListener("resize", checkOverflow);
	}, [checkOverflow, content]);

	return { contentRef, showFade };
};

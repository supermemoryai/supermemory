import { DetailedHTMLProps, HTMLAttributes, memo } from "react";
import { ExtraProps } from "react-markdown";
import CodeBlock from "./CodeBlock";

export const code = memo((props: JSX.IntrinsicElements["code"]) => {
	const { className, children } = props;
	const match = /language-(\w+)/.exec(className || "");
	const lang = match && match[1];

	return <CodeBlock lang={lang || "text"} codeChildren={children as any} />;
});

export const p = memo(
	(
		props?: Omit<
			DetailedHTMLProps<
				HTMLAttributes<HTMLParagraphElement>,
				HTMLParagraphElement
			>,
			"ref"
		>,
	) => {
		return <p className="whitespace-pre-wrap">{props?.children}</p>;
	},
);

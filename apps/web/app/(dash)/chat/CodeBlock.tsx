import React, { useRef, useState } from "react";

const CodeBlock = ({
	lang,
	codeChildren,
}: {
	lang: string;
	codeChildren: React.ReactNode & React.ReactNode[];
}) => {
	const codeRef = useRef<HTMLElement>(null);

	return (
		<div className="bg-black rounded-md">
			<CodeBar lang={lang} codeRef={codeRef} />
			<div className="p-4 overflow-y-auto">
				<code ref={codeRef} className={`!whitespace-pre hljs language-${lang}`}>
					{codeChildren}
				</code>
			</div>
		</div>
	);
};

const CodeBar = React.memo(
	({
		lang,
		codeRef,
	}: {
		lang: string;
		codeRef: React.RefObject<HTMLElement>;
	}) => {
		const [isCopied, setIsCopied] = useState<boolean>(false);
		return (
			<div className="flex items-center relative text-gray-200 bg-gray-800 px-4 py-2 text-xs font-sans">
				<span className="">{lang}</span>
				<button
					className="flex ml-auto gap-2"
					aria-label="copy codeblock"
					onClick={async () => {
						const codeString = codeRef.current?.textContent;
						if (codeString)
							navigator.clipboard.writeText(codeString).then(() => {
								setIsCopied(true);
								setTimeout(() => setIsCopied(false), 3000);
							});
					}}
				>
					{isCopied ? (
						<>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={1.5}
								stroke="currentColor"
								className="size-4"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
								/>
							</svg>
							Copied!
						</>
					) : (
						<>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={1.5}
								stroke="currentColor"
								className="size-4"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
								/>
							</svg>
							Copy code
						</>
					)}
				</button>
			</div>
		);
	},
);
export default CodeBlock;

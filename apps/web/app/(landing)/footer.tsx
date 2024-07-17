import React from "react";
import LinkArrow from "./linkArrow";

function Footer() {
	return (
		<footer className="mt-20 w-full md:flex overflow-y-hidden items-center justify-between gap-4 px-8 py-8 text-sm text-zinc-500 overflow-hidden text-center">
			<p>© 2024 Supermemory.ai</p>
			<div className="flex gap-5 justify-around my-2">
				<a
					className="group/mail flex items-center"
					target="_blank"
					href="mailto:hi@dhravya.dev"
				>
					Contact
					<LinkArrow classname="group-hover/mail:opacity-100 opacity-0 transition hidden md:block" />
				</a>
				<a
					className="group/twit flex items-center"
					target="_blank"
					href="https://twitter.com/supermemoryai"
				>
					Twitter{" "}
					<LinkArrow classname="group-hover/twit:opacity-100 opacity-0 transition hidden md:block" />
				</a>
				<a
					className="group/git flex items-center"
					target="_blank"
					href="https://github.com/dhravya/supermemory"
				>
					Github{" "}
					<LinkArrow classname="group-hover/git:opacity-100 opacity-0 transition hidden md:block" />
				</a>
			</div>
		</footer>
	);
}

export default Footer;

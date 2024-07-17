"use client";

import { FormEvent, useState } from "react";
import formSubmitAction from "./formSubmitAction";
import { useToast } from "@repo/ui/shadcn/use-toast";
import { Loader } from "lucide-react";

function EmailInput() {
	const [email, setEmail] = useState("");
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	return (
		<form
			onSubmit={async (e: FormEvent<HTMLFormElement>) => {
				e.preventDefault();
				setLoading(true);
				const value = await formSubmitAction(email, "token" as string);

				if (value.success) {
					setEmail("");
					toast({
						title: "You are now on the waitlist! 🎉",
						description:
							"We will notify you when we launch. Check your inbox and spam folder for a surprise! 🎁",
					});
				} else {
					console.error("email submission failed: ", value.value);
					toast({
						variant: "destructive",
						title: "Uh oh! Something went wrong.",
						description: `${value.value}`,
					});
				}
				setLoading(false);
			}}
			className="flex w-full items-center justify-center gap-2"
		>
			<div
				className={`transition-width z-20 rounded-2xl bg-glass-gradient backdrop-blur-sm  dark:[box-shadow:0_-20px_80px_-20px_#8686f01f_inset]  border-[1px] border-white/5 from-gray-200/70 to-transparent p-[0] duration-300 ease-in-out ${email ? "w-[90%] md:w-[42%]" : "w-full md:w-1/2"}`}
			>
				<input
					type="email"
					name="email"
					className={`transition-width py-4 bg-page-gradient flex w-full items-center rounded-xl border-white/5 bg-transparent px-4 outline-none duration-300 focus:outline-none`}
					placeholder="Enter your email"
					value={email}
					required
					onChange={(e) => setEmail(e.target.value)}
				/>
			</div>
			<div
				className="cf-turnstile"
				data-sitekey="0x4AAAAAAAakohhUeXc99J7E"
			></div>
			{email && (
				<button
					type="submit"
					className="transition-width rounded-xl z-20 bg-gray-700 p-4 text-white duration-300"
				>
					{loading ? (
						<Loader className="h-6 w-6 animate-spin" />
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							className="h-6 w-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
							/>
						</svg>
					)}
				</button>
			)}
		</form>
	);
}

export default EmailInput;

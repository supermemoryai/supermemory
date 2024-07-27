"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import TextField from "./TextField";

export default function EmailSignInForm() {
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get("callbackUrl") || "/";

	async function handleSubmit(event: any) {
		event.preventDefault();
		const formData = new FormData(event.target);
		const email = formData.get("email");
		signIn("resend", { email, callbackUrl });
	}

	return (
		<form onSubmit={handleSubmit}>
			<div className="space-y-2 text-white">
				<TextField
					id="email"
					name="email"
					type="email"
					label=""
					placeholder="Signin with your Email"
					autoComplete="email"
					required
				/>
			</div>
			<button type="submit" color="gray" className="mt-3 w-full">
				Continue with email
			</button>
		</form>
	);
}

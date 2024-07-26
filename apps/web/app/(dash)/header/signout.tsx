"use client";
import { signOut } from "next-auth/react";

export default function Signout() {
	return (
		<div>
			<button onClick={() => signOut()}>Sign out</button>
		</div>
	);
}

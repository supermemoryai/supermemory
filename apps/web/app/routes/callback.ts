import { authLoader } from "@supermemory/authkit-remix-cloudflare";

export const loader = authLoader({
	returnPathname: "/onboarding",
});

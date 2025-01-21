import { UserContent } from "ai";

export function assertNotString(value: UserContent) {
	if (typeof value === "string") {
		throw new Error("Value is a string");
	}
	return value;
}

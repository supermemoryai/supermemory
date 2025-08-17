import { customAlphabet } from "nanoid"

export const generateId = () =>
	customAlphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")(
		22,
	)

import { customAlphabet } from "nanoid"

const generate = customAlphabet(
	"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
)

export const generateId = () => generate(22)

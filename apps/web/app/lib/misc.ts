import process from "node:process";

function getRequiredEnvVarFromObj(
	obj: Record<string, string | undefined>,
	key: string,
	devValue: string = `${key}-dev-value`,
) {
	let value = devValue;
	const envVal = obj[key];
	if (envVal) {
		value = envVal;
	} else if (obj.NODE_ENV === "production") {
		throw new Error(`${key} is a required env variable`);
	}
	return value;
}

export function getRequiredServerEnvVar(key: string, devValue: string = `${key}-dev-value`) {
	return getRequiredEnvVarFromObj(process.env, key, devValue);
}

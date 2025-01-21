import { BaseError } from "./baseError";

export type Result<T, E extends Error> =
	| { ok: true; value: T }
	| { ok: false; error: E };

export const Ok = <T>(data: T): Result<T, never> => {
	return { ok: true, value: data };
};

export const Err = <E extends BaseError>(error: E): Result<never, E> => {
	return { ok: false, error };
};

export async function wrap<T, E extends BaseError>(
	p: Promise<T>,
	errorFactory: (err: Error, source: string) => E,
	source: string = "unspecified"
  ): Promise<Result<T, E>> {
	try {
	  return Ok(await p);
	} catch (e) {
	  return Err(errorFactory(e as Error, source));
	}
  }

export function isErr<T, E extends Error>(
	result: Result<T, E>,
): result is { ok: false; error: E } {
	return !result.ok;
}
import * as React from "react";

export const useDebounce = <T>(value: T, delay = 500) => {
	const [debouncedValue, setDebouncedValue] = React.useState(value);

	React.useEffect(() => {
		const handler: NodeJS.Timeout = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		// Cancel the timeout if value changes (also on delay change or unmount)
		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
};

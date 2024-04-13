export function seededRandom(seed: string) {
	let x = [...seed].reduce((acc, cur) => acc + cur.charCodeAt(0), 0);
	return () => {
		x = (x * 9301 + 49297) % 233280;
		return x / 233280;
	};
}

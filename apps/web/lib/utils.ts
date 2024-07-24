export function getRandomSentences(fullQuery: string): string {
	// Split the fullQuery into sentences
	const sentences = fullQuery.match(/[^.!?]+[.!?]+/g) || [];

	// Function to get a random integer between min and max
	function getRandomInt(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min)) + min;
	}

	let selectedSentences = "";
	let totalCharacters = 0;

	// Select random sentences until totalCharacters is at least 1000
	while (totalCharacters < 1000 && sentences.length > 0) {
		const randomIndex = getRandomInt(0, sentences.length);
		const sentence = sentences[randomIndex];
		selectedSentences += sentence;
		totalCharacters += sentence?.length || 0;
		sentences.splice(randomIndex, 1); // Remove the selected sentence from the array
	}

	return selectedSentences;
}

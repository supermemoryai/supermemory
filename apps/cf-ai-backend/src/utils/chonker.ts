import nlp from "compromise";

export default function chunkText(
  text: string,
  maxChunkSize: number,
  overlap: number = 0.2,
): string[] {
  const sentences = nlp(text).sentences().out("array");
  const chunks = [];
  let currentChunk: string[] = [];
  let currentSize = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    currentChunk.push(sentence);
    currentSize += sentence.length;

    if (currentSize >= maxChunkSize) {
      // Calculate overlap
      const overlapSize = Math.floor(currentChunk.length * overlap);
      const chunkText = currentChunk.join(" ");
      chunks.push({
        text: chunkText,
        start: i - currentChunk.length + 1,
        end: i,
      });

      // Prepare the next chunk with overlap
      currentChunk = currentChunk.slice(-overlapSize);
      currentSize = currentChunk.reduce((sum, s) => sum + s.length, 0);
    }
  }

  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(" ");
    chunks.push({
      text: chunkText,
      start: sentences.length - currentChunk.length,
      end: sentences.length,
    });
  }

  return chunks.map((chunk) => chunk.text);
}

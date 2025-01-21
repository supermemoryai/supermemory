import nlp from "compromise";

export default function chunkText(
  text: string,
  maxChunkSize: number,
  overlap: number = 0.2
): string[] {
  // Pre-process text to remove excessive whitespace
  text = text.replace(/\s+/g, " ").trim();

  const sentences = nlp(text).sentences().out("array");
  const chunks: {
    text: string;
    start: number;
    end: number;
    metadata?: {
      position: string;
      context?: string;
    };
  }[] = [];

  let currentChunk: string[] = [];
  let currentSize = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();

    // Skip empty sentences
    if (!sentence) continue;

    // If a single sentence is longer than maxChunkSize, split it
    if (sentence.length > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.join(" "),
          start: i - currentChunk.length,
          end: i - 1,
          metadata: {
            position: `${i - currentChunk.length}-${i - 1}`,
            context: currentChunk[0].substring(0, 100), // First 100 chars for context
          },
        });
        currentChunk = [];
        currentSize = 0;
      }

      // Split long sentence into smaller chunks
      const words = sentence.split(" ");
      let tempChunk: string[] = [];

      for (const word of words) {
        if (tempChunk.join(" ").length + word.length > maxChunkSize) {
          chunks.push({
            text: tempChunk.join(" "),
            start: i,
            end: i,
            metadata: {
              position: `${i}`,
              context: "Split sentence",
            },
          });
          tempChunk = [];
        }
        tempChunk.push(word);
      }

      if (tempChunk.length > 0) {
        chunks.push({
          text: tempChunk.join(" "),
          start: i,
          end: i,
          metadata: {
            position: `${i}`,
            context: "Split sentence remainder",
          },
        });
      }
      continue;
    }

    currentChunk.push(sentence);
    currentSize += sentence.length;

    if (currentSize >= maxChunkSize) {
      const overlapSize = Math.floor(currentChunk.length * overlap);
      chunks.push({
        text: currentChunk.join(" "),
        start: i - currentChunk.length + 1,
        end: i,
        metadata: {
          position: `${i - currentChunk.length + 1}-${i}`,
          context: currentChunk[0].substring(0, 100),
        },
      });

      // Keep overlap sentences for next chunk
      currentChunk = currentChunk.slice(-overlapSize);
      currentSize = currentChunk.reduce((sum, s) => sum + s.length, 0);
    }
  }

  // Handle remaining sentences
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join(" "),
      start: sentences.length - currentChunk.length,
      end: sentences.length - 1,
      metadata: {
        position: `${sentences.length - currentChunk.length}-${sentences.length - 1}`,
        context: currentChunk[0].substring(0, 100),
      },
    });
  }

  return chunks.map((chunk) => chunk.text);
}

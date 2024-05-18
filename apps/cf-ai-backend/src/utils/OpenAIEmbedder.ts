interface OpenAIEmbeddingsParams {
  apiKey: string;
  modelName: string;
}

export class OpenAIEmbeddings {
  private apiKey: string;
  private modelName: string;

  constructor({ apiKey, modelName }: OpenAIEmbeddingsParams) {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const responses = await Promise.all(
      texts.map((text) => this.embedQuery(text)),
    );
    return responses;
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: this.modelName,
      }),
    });

    const data = (await response.json()) as {
      data: {
        embedding: number[];
      }[];
    };

    return data.data[0].embedding;
  }
}

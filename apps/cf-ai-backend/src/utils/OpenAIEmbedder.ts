import { z } from "zod";

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
    const response = await fetch(
      "https://gateway.ai.cloudflare.com/v1/47c2b4d598af9d423c06fc9f936226d5/supermemory/openai/embeddings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: this.modelName,
        }),
      },
    );

    const data = await response.json();

    const zodTypeExpected = z.object({
      data: z.array(
        z.object({
          embedding: z.array(z.number()),
        }),
      ),
    });

    const json = zodTypeExpected.safeParse(data);

    if (!json.success) {
      throw new Error("Invalid response from OpenAI: " + json.error.message);
    }

    return json.data.data[0].embedding;
  }
}

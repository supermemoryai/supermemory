import { Env } from "../types";

export const extractPageContent = async (content: string, env: Env) => {
  const resp = await fetch(`https://r.jina.ai/${content}`);

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch ${content}: ${resp.statusText}` + (await resp.text())
    );
  }

  const metadataResp = await fetch(`https://md.dhr.wtf/metadata?url=${content}`);

  if (!metadataResp.ok) {
    throw new Error(
      `Failed to fetch metadata for ${content}: ${metadataResp.statusText}` +
        (await metadataResp.text())
    );
  }

  const metadata = await metadataResp.json() as {
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
  };

  const responseText = await resp.text();

  try {
    const json:  {
      contentToVectorize: string;
      contentToSave: string;
      title?: string;
      description?: string;
      image?: string;
      favicon?: string;
    } = {
      contentToSave: responseText,
      contentToVectorize: responseText,
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      favicon: metadata.favicon,
    };
    return json;
  } catch (e) {
    throw new Error(`Failed to parse JSON from ${content}: ${e}`);
  }
};

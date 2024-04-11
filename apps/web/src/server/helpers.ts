export async function getMetaData(url: string) {
  const response = await fetch(url);
  const html = await response.text();

  // Extract the base URL
  const baseUrl = new URL(url).origin;

  // Extract title
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1] : "Title not found";

  // Extract meta description
  const descriptionMatch = html.match(
    /<meta name="description" content="(.*?)"\s*\/?>/,
  );
  const description = descriptionMatch
    ? descriptionMatch[1]
    : "Description not found";

  // Extract Open Graph image
  const imageMatch = html.match(
    /<meta property="og:image" content="(.*?)"\s*\/?>/,
  );
  const image = imageMatch ? imageMatch[1] : "Image not found";

  // Prepare the metadata object
  const metadata = {
    title,
    description,
    image,
    baseUrl,
  };
  return metadata;
}

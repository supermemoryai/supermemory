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

  // Extract favicon
  const faviconMatch = html.match(
    /<link rel="(?:icon|shortcut icon)" href="(.*?)"\s*\/?>/,
  );
  const favicon = faviconMatch
    ? faviconMatch[1]
    : "https://supermemory.dhr.wtf/web.svg";

  // Prepare the metadata object
  const metadata = {
    title,
    description,
    image: favicon,
    baseUrl,
  };
  return metadata;
}

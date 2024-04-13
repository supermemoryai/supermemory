"use server";
import * as cheerio from "cheerio";

export async function getMetaData(url: string) {
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);

  // Extract the base URL
  const baseUrl = new URL(url).origin;

  // Extract title
  const title = $("title").text().trim();

  const description = $("meta[name=description]").attr("content") ?? "";

  const _favicon =
    $("link[rel=icon]").attr("href") ?? "https://supermemory.dhr.wtf/web.svg";

  let favicon =
    _favicon.trim().length > 0
      ? _favicon.trim()
      : "https://supermemory.dhr.wtf/web.svg";
  if (favicon.startsWith("/")) {
    favicon = baseUrl + favicon;
  } else if (favicon.startsWith("./")) {
    favicon = baseUrl + favicon.slice(1);
  }

  // Prepare the metadata object
  const metadata = {
    title,
    description,
    image: favicon,
    baseUrl,
  };
  return metadata;
}

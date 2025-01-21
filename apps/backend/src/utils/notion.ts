interface PageContent {
  content: string;
  url: string;
  title: string;
  id: string;
  createdAt: string;
}

interface NotionBlock {
  type: string;
  [key: string]: any;
}

interface SearchResponse {
  results: {
    id: string;
    object: string;
    url: string;
    created_time: string;
    properties: {
      title?: {
        title: Array<{
          plain_text: string;
        }>;
      };
      Name?: {
        title: Array<{
          plain_text: string;
        }>;
      };
    };
  }[];
  next_cursor: string | undefined;
  has_more: boolean;
}

interface BlockResponse {
  results: NotionBlock[];
  next_cursor: string | undefined;
  has_more: boolean;
}

export const getAllNotionPageContents = async (
  token: string,
  onProgress: (progress: number) => Promise<void>
): Promise<PageContent[]> => {
  const pages: PageContent[] = [];
  const NOTION_API_VERSION = "2022-06-28";
  const BASE_URL = "https://api.notion.com/v1";
  const MAX_RETRIES = 3;
  const BATCH_SIZE = 10; // Number of concurrent requests
  const PAGE_SIZE = 100; // Number of pages to fetch per search request

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const notionFetch = async (
    endpoint: string,
    options: RequestInit = {},
    retries = 0
  ): Promise<any> => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_API_VERSION,
          "Content-Type": "application/json",
          ...((options.headers || {}) as Record<string, string>),
        },
      });

      if (response.status === 429) {
        // Rate limit error
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
        if (retries < MAX_RETRIES) {
          await delay(retryAfter * 1000);
          return notionFetch(endpoint, options, retries + 1);
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Notion API error: ${response.statusText}\n${errorText}`
        );
      }

      return response.json();
    } catch (error) {
      if (retries < MAX_RETRIES) {
        await delay(2000 * (retries + 1)); // Exponential backoff
        return notionFetch(endpoint, options, retries + 1);
      }
      throw error;
    }
  };

  const convertBlockToMarkdown = (block: NotionBlock): string => {
    switch (block.type) {
      case "paragraph":
        return (
          block.paragraph?.rich_text
            ?.map((text: any) => text.plain_text)
            .join("") || ""
        );
      case "heading_1":
        return `# ${block.heading_1?.rich_text
          ?.map((text: any) => text.plain_text)
          .join("")}\n`;
      case "heading_2":
        return `## ${block.heading_2?.rich_text
          ?.map((text: any) => text.plain_text)
          .join("")}\n`;
      case "heading_3":
        return `### ${block.heading_3?.rich_text
          ?.map((text: any) => text.plain_text)
          .join("")}\n`;
      case "bulleted_list_item":
        return `* ${block.bulleted_list_item?.rich_text
          ?.map((text: any) => text.plain_text)
          .join("")}\n`;
      case "numbered_list_item":
        return `1. ${block.numbered_list_item?.rich_text
          ?.map((text: any) => text.plain_text)
          .join("")}\n`;
      case "to_do":
        const checked = block.to_do?.checked ? "x" : " ";
        return `- [${checked}] ${block.to_do?.rich_text
          ?.map((text: any) => text.plain_text)
          .join("")}\n`;
      case "code":
        return `\`\`\`${block.code?.language || ""}\n${block.code?.rich_text
          ?.map((text: any) => text.plain_text)
          .join("")}\n\`\`\`\n`;
      case "quote":
        return `> ${block.quote?.rich_text
          ?.map((text: any) => text.plain_text)
          .join("")}\n`;
      default:
        return "";
    }
  };

  const getAllBlocks = async (pageId: string): Promise<NotionBlock[]> => {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined = undefined;

    do {
      const endpoint = `/blocks/${pageId}/children${
        cursor ? `?start_cursor=${cursor}` : ""
      }`;
      const response = (await notionFetch(endpoint)) as BlockResponse;
      blocks.push(...response.results);
      cursor = response.next_cursor;
    } while (cursor);

    return blocks;
  };

  try {
    let hasMore = true;
    let cursor: string | undefined = undefined;
    let allPages: SearchResponse["results"] = [];

    // First, collect all pages
    while (hasMore) {
      const searchResponse = (await notionFetch("/search", {
        method: "POST",
        body: JSON.stringify({
          filter: {
            value: "page",
            property: "object",
          },
          sort: {
            direction: "ascending",
            timestamp: "last_edited_time",
          },
          start_cursor: cursor,
          page_size: PAGE_SIZE,
        }),
      })) as SearchResponse;

      allPages = [...allPages, ...searchResponse.results];
      cursor = searchResponse.next_cursor;
      hasMore = searchResponse.has_more;

      // Report progress for page collection (0-30%)
      const progressPercent = (allPages.length / (allPages.length + searchResponse.results.length)) * 30;
      await onProgress(progressPercent);
    }

    // Process pages in parallel batches
    for (let i = 0; i < allPages.length; i += BATCH_SIZE) {
      const batch = allPages.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (page) => {
          try {
            const blocks = await getAllBlocks(page.id);
            const pageContent = {
              content: blocks.map(convertBlockToMarkdown).join("\n"),
              url: page.url || `https://notion.so/${page.id.replace(/-/g, "")}`,
              title:
                page.properties?.Name?.title?.[0]?.plain_text ||
                page.properties?.title?.title?.[0]?.plain_text ||
                "Untitled",
              id: page.id,
              createdAt: page.created_time,
            };
            return pageContent.content.length > 10 ? pageContent : null;
          } catch (error) {
            console.error(`Error processing page ${page.id}:`, error);
            return null;
          }
        })
      );

      pages.push(
        ...batchResults.filter(
          (result): result is PageContent => result !== null
        )
      );

      // Report progress for page processing (30-100%)
      const progressPercent = 30 + ((i + BATCH_SIZE) / allPages.length) * 70;
      await onProgress(Math.min(progressPercent, 100));

      // Add a small delay between batches to respect rate limits
      if (i + BATCH_SIZE < allPages.length) {
        await delay(1000);
      }
    }

    return pages.filter((page) => page.content.length > 10);
  } catch (error) {
    console.error("Error fetching Notion pages:", error);
    throw error;
  }
};

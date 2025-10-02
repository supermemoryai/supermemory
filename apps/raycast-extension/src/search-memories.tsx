import {
  ActionPanel,
  Detail,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { searchMemories, checkApiConnection, type SearchResult } from "./api";

const extractContent = (memory: SearchResult) => {
  if (memory.chunks && memory.chunks.length > 0) {
    return memory.chunks
      .map((chunk: unknown) => {
        if (typeof chunk === "string") return chunk;
        if (
          chunk &&
          typeof chunk === "object" &&
          "content" in chunk &&
          typeof chunk.content === "string"
        )
          return chunk.content;
        if (
          chunk &&
          typeof chunk === "object" &&
          "text" in chunk &&
          typeof chunk.text === "string"
        )
          return chunk.text;
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "No content available";
};

const extractUrl = (memory: SearchResult) => {
  if (memory.metadata?.url && typeof memory.metadata.url === "string") {
    return memory.metadata.url;
  }
  return null;
};

export default function Command() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkConnection() {
      const connected = await checkApiConnection();
      setIsConnected(connected);
    }
    checkConnection();
  }, []);

  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !isConnected) return;

      try {
        setIsLoading(true);
        setHasSearched(true);

        const results = await searchMemories({
          q: query.trim(),
          limit: 50,
        });

        setSearchResults(results);

        if (results.length === 0) {
          await showToast({
            style: Toast.Style.Success,
            title: "Search Complete",
            message: "No memories found for your query",
          });
        }
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected],
  );

  useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const debounceTimer = setTimeout(() => {
      performSearch(searchText);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchText, performSearch]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  };

  if (isConnected === false) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="API Key Required"
          description="Please configure your Supermemory API key to search memories"
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={() => openExtensionPreferences()}
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your memories..."
      throttle
    >
      {!hasSearched && !searchText.trim() ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Your Memories"
          description="Type to search through your Supermemory collection"
        />
      ) : hasSearched && searchResults.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Memories Found"
          description={`No memories found for "${searchText}"`}
        />
      ) : (
        searchResults.map((memory) => {
          const content = extractContent(memory);
          const url = extractUrl(memory);
          return (
            <List.Item
              key={memory.documentId}
              icon={url ? Icon.Link : Icon.Document}
              title={memory.title || "Untitled Memory"}
              subtitle={truncateContent(content)}
              accessories={[
                { text: formatDate(memory.createdAt) },
                ...(memory.score
                  ? [{ text: `${Math.round(memory.score * 100)}%` }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    target={<MemoryDetail memory={memory} />}
                    icon={Icon.Eye}
                  />
                  <Action
                    title="Copy Content"
                    onAction={() => Clipboard.copy(content)}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  {url && (
                    <Action.OpenInBrowser
                      title="Open URL"
                      url={url}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function MemoryDetail({ memory }: { memory: SearchResult }) {
  const content = extractContent(memory);
  const url = extractUrl(memory);

  const markdown = `
# ${memory.title || "Untitled Memory"}

${content}

---

**Created:** ${new Date(memory.createdAt).toLocaleString()}
${url ? `**URL:** ${url}` : ""}
${memory.score ? `**Relevance:** ${Math.round(memory.score * 100)}%` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Content"
            onAction={() => Clipboard.copy(content)}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {url && (
            <Action.OpenInBrowser
              title="Open URL"
              url={url}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

"""Memory client for Supermemory API integration."""

import os
from typing import Dict, List, Optional, TypedDict
import httpx


class ProfileStructure(TypedDict, total=False):
    """Structure for profile response from Supermemory API."""

    profile: Dict[str, Optional[List[str]]]
    searchResults: Dict[str, List[Dict[str, str]]]


class MemoryClient:
    """Client for interacting with Supermemory's profile API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.supermemory.ai",
        verbose: bool = False,
    ):
        """Initialize the memory client.

        Args:
            api_key: Supermemory API key, defaults to SUPERMEMORY_API_KEY env var
            base_url: Base URL for Supermemory API
            verbose: Enable verbose logging
        """
        self.api_key = api_key or os.getenv("SUPERMEMORY_API_KEY")
        if not self.api_key:
            raise ValueError("SUPERMEMORY_API_KEY is not set")

        self.base_url = base_url
        self.verbose = verbose
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, *args):
        """Async context manager exit - cleanup client."""
        await self.aclose()

    async def aclose(self):
        """Close the httpx client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    def _get_client(self) -> httpx.AsyncClient:
        """Get or create httpx client instance."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                }
            )
        return self._client

    def _log(self, message: str, data: Optional[Dict] = None) -> None:
        """Log message if verbose mode is enabled."""
        if self.verbose:
            if data:
                print(f"[supermemory] {message}: {data}")
            else:
                print(f"[supermemory] {message}")

    async def profile_search(
        self,
        container_tag: str,
        query_text: Optional[str] = None,
    ) -> ProfileStructure:
        """Search for profile information from Supermemory.

        Args:
            container_tag: Container tag for memory search
            query_text: Optional query text for search

        Returns:
            ProfileStructure with profile data and search results

        Raises:
            Exception: If API request fails
        """
        payload = {
            "containerTag": container_tag,
        }
        if query_text:
            payload["q"] = query_text

        self._log("Starting profile search", {
            "containerTag": container_tag,
            "queryText": query_text[:100] + "..." if query_text and len(query_text) > 100 else query_text,
        })

        try:
            client = self._get_client()
            response = await client.post(
                f"{self.base_url}/v4/profile",
                json=payload,
            )

            if not response.is_success:
                error_text = response.text
                self._log("Profile search failed", {
                    "status": response.status_code,
                    "error": error_text,
                })
                raise Exception(
                    f"Supermemory profile search failed: {response.status_code} {response.reason_phrase}. {error_text}"
                )

            result = response.json()

            # Log results
            static_count = len(result.get("profile", {}).get("static", []))
            dynamic_count = len(result.get("profile", {}).get("dynamic", []))
            search_count = len(result.get("searchResults", {}).get("results", []))

            self._log("Profile search completed", {
                "staticMemories": static_count,
                "dynamicMemories": dynamic_count,
                "searchResults": search_count,
            })

            return result

        except httpx.TimeoutException:
            self._log("Profile search timed out")
            raise Exception("Supermemory API request timed out")
        except Exception as error:
            self._log("Profile search error", {"error": str(error)})
            if isinstance(error, Exception) and "Supermemory" in str(error):
                raise error
            raise Exception(f"Supermemory API request failed: {error}")
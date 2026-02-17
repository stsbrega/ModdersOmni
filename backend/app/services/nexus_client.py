import httpx
import asyncio
from app.config import get_settings


class NexusModsClient:
    """Client for the Nexus Mods v2 GraphQL API."""

    BASE_URL = "https://api.nexusmods.com/v2/graphql"

    def __init__(self, api_key: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.nexus_api_key
        self._semaphore = asyncio.Semaphore(10)  # Max concurrent requests

    def _headers(self) -> dict:
        return {
            "apikey": self.api_key,
            "Content-Type": "application/json",
        }

    async def _query(self, query: str, variables: dict | None = None) -> dict:
        async with self._semaphore:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.BASE_URL,
                    headers=self._headers(),
                    json={"query": query, "variables": variables or {}},
                    timeout=30.0,
                )
                response.raise_for_status()
                return response.json()

    async def search_mods(self, game_domain: str, search_term: str) -> list[dict]:
        """Search for mods by name on Nexus Mods."""
        query = """
        query SearchMods($gameDomain: String!, $searchTerm: String!) {
            mods(
                filter: {
                    gameDomainName: { value: $gameDomain }
                    name: { value: $searchTerm, op: WILDCARD }
                }
                sort: { endorsements: { direction: DESC } }
            ) {
                nodes {
                    modId
                    name
                    summary
                    author
                    version
                    endorsementCount
                    modCategory { name }
                }
            }
        }
        """
        result = await self._query(query, {
            "gameDomain": game_domain,
            "searchTerm": f"*{search_term}*",
        })
        return result.get("data", {}).get("mods", {}).get("nodes", [])

    async def get_mod_files(self, game_domain: str, mod_id: int) -> list[dict]:
        """Get available files for a mod."""
        query = """
        query GetModFiles($gameDomain: String!, $modId: Int!) {
            modFiles(
                filter: {
                    gameDomainName: { value: $gameDomain }
                    modId: { value: $modId }
                }
            ) {
                nodes {
                    fileId
                    name
                    version
                    sizeInBytes
                    isPrimary
                }
            }
        }
        """
        result = await self._query(query, {
            "gameDomain": game_domain,
            "modId": mod_id,
        })
        return result.get("data", {}).get("modFiles", {}).get("nodes", [])

    async def get_download_link(self, game_domain: str, mod_id: int, file_id: int) -> str | None:
        """Get download link for a mod file. Requires Nexus Premium for direct links."""
        # Note: Free users get redirected to the Nexus download page
        # Premium users get direct CDN links via the v1 REST API
        # For v2 GraphQL, download links may need the v1 endpoint as fallback
        v1_url = f"https://api.nexusmods.com/v1/games/{game_domain}/mods/{mod_id}/files/{file_id}/download_link.json"
        async with self._semaphore:
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(
                        v1_url,
                        headers={"apikey": self.api_key},
                        timeout=30.0,
                    )
                    if response.status_code == 200:
                        data = response.json()
                        if data:
                            return data[0].get("URI")
                    elif response.status_code == 403:
                        # Free user - return manual download URL
                        return f"https://www.nexusmods.com/{game_domain}/mods/{mod_id}?tab=files&file_id={file_id}"
                except httpx.HTTPError:
                    pass
        return None

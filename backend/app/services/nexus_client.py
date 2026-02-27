import httpx
import asyncio
import logging

logger = logging.getLogger(__name__)


class NexusAPIError(Exception):
    """Raised when the Nexus GraphQL API returns errors in the response body."""

    def __init__(self, errors: list[dict]):
        self.errors = errors
        messages = "; ".join(e.get("message", "Unknown error") for e in errors)
        super().__init__(f"Nexus GraphQL errors: {messages}")


class NexusModsClient:
    """Client for the Nexus Mods v2 GraphQL API."""

    BASE_URL = "https://api.nexusmods.com/v2/graphql"

    # Map friendly sort names to GraphQL sort variable objects
    _SORT_MAP = {
        "endorsements": [{"endorsements": {"direction": "DESC"}}],
        "updated": [{"updatedAt": {"direction": "DESC"}}],
        "name": [{"name": {"direction": "ASC"}}],
    }

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or ""
        self._semaphore = asyncio.Semaphore(10)  # Max concurrent requests

    def _headers(self) -> dict:
        return {
            "apikey": self.api_key,
            "Content-Type": "application/json",
        }

    async def _query(self, query: str, variables: dict | None = None) -> dict:
        """Execute a GraphQL query and return the parsed response.

        Raises NexusAPIError if the response contains GraphQL-level errors.
        Raises httpx.HTTPStatusError for HTTP-level errors.
        """
        async with self._semaphore:
            async with httpx.AsyncClient() as client:
                payload = {"query": query, "variables": variables or {}}
                response = await client.post(
                    self.BASE_URL,
                    headers=self._headers(),
                    json=payload,
                    timeout=30.0,
                )
                response.raise_for_status()
                result = response.json()

                # Check for GraphQL-level errors
                if result.get("errors"):
                    logger.error(
                        "Nexus GraphQL errors: %s | query: %s | variables: %s",
                        result["errors"],
                        query.strip()[:200],
                        variables,
                    )
                    raise NexusAPIError(result["errors"])

                # Warn if data is None (unexpected for a successful query)
                if result.get("data") is None:
                    logger.warning(
                        "Nexus returned null data without errors | query: %s | variables: %s",
                        query.strip()[:200],
                        variables,
                    )

                return result

    async def validate_key(self) -> dict:
        """Validate the API key against the Nexus v1 endpoint.

        Returns user info dict on success, raises on failure.
        """
        async with self._semaphore:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.nexusmods.com/v1/users/validate.json",
                    headers={"apikey": self.api_key},
                    timeout=15.0,
                )
                response.raise_for_status()
                return response.json()

    # Verified working query — uses typed variables ($filter: ModsFilter)
    # instead of interpolating scalar variables into inline filter objects.
    # Confirmed against live API: this format returns results.
    _SEARCH_QUERY = """
    query SearchMods($filter: ModsFilter, $sort: [ModsSort!], $offset: Int, $count: Int) {
        mods(filter: $filter, sort: $sort, offset: $offset, count: $count) {
            nodes {
                modId
                name
                summary
                author
                version
                endorsements
                modCategory { name }
                updatedAt
            }
            totalCount
        }
    }
    """

    async def search_mods(
        self,
        game_domain: str,
        search_term: str,
        sort_by: str = "endorsements",
        offset: int = 0,
    ) -> list[dict]:
        """Search for mods by name on Nexus Mods.

        Uses the v2 GraphQL API with the correct variable-based filter format.
        Key details verified against the live API:
        - Filter must be passed as a $filter: ModsFilter variable (not inline)
        - Each filter field is an array of {value, op} objects
        - WILDCARD operator does partial matching automatically (do NOT wrap in *)
        - Sort must be a list of sort objects
        - Field is 'endorsements' not 'endorsements'

        Args:
            game_domain: Nexus game domain slug (e.g. "skyrimspecialedition")
            search_term: Search query (do NOT wrap in asterisks)
            sort_by: Sort order — "endorsements" (default), "updated", or "name"
            offset: Pagination offset
        """
        sort_var = self._SORT_MAP.get(sort_by, self._SORT_MAP["endorsements"])

        variables = {
            "filter": {
                "gameDomainName": [{"value": game_domain, "op": "EQUALS"}],
                "name": [{"value": search_term, "op": "WILDCARD"}],
            },
            "sort": sort_var,
            "offset": offset,
            "count": 20,
        }

        result = await self._query(self._SEARCH_QUERY, variables)
        data = result.get("data") or {}
        mods_data = data.get("mods") or {}
        nodes = mods_data.get("nodes") or []
        total = mods_data.get("totalCount", 0)

        if not nodes:
            logger.info(
                "Nexus search returned 0 results: game=%s query=%r sort=%s",
                game_domain, search_term, sort_by,
            )
        else:
            logger.debug(
                "Nexus search: game=%s query=%r → %d results (total: %d)",
                game_domain, search_term, len(nodes), total,
            )

        return nodes

    async def get_mod_details(self, game_domain: str, mod_id: int) -> dict | None:
        """Get full mod details including description HTML.

        The description field contains the mod author's full page content,
        which often includes compatibility notes, patch links, and requirements.
        """
        query = """
        query GetModDetails($gameDomain: String!, $modId: Int!) {
            mod(gameDomainName: $gameDomain, modId: $modId) {
                modId
                name
                summary
                description
                author
                version
                endorsements
                modCategory { name }
                createdAt
                updatedAt
            }
        }
        """
        result = await self._query(query, {
            "gameDomain": game_domain,
            "modId": mod_id,
        })
        data = result.get("data") or {}
        return data.get("mod")

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
        data = result.get("data") or {}
        return (data.get("modFiles") or {}).get("nodes") or []

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

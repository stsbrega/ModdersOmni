"""Tests for OAuth endpoints and state management."""

import time

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.oauth import (
    _oauth_states,
    create_oauth_state,
    get_configured_providers,
    validate_oauth_state,
)


# ---------------------------------------------------------------------------
# Unit tests: OAuth state store
# ---------------------------------------------------------------------------


class TestOAuthStateStore:
    def setup_method(self):
        _oauth_states.clear()

    def test_create_state_returns_string(self):
        state = create_oauth_state("google")
        assert isinstance(state, str)
        assert len(state) > 0

    def test_validate_valid_state(self):
        state = create_oauth_state("google")
        assert validate_oauth_state(state, "google") is True

    def test_validate_consumes_state(self):
        """State should only be usable once (prevents replay attacks)."""
        state = create_oauth_state("google")
        assert validate_oauth_state(state, "google") is True
        assert validate_oauth_state(state, "google") is False

    def test_validate_wrong_provider(self):
        state = create_oauth_state("google")
        assert validate_oauth_state(state, "discord") is False

    def test_validate_unknown_state(self):
        assert validate_oauth_state("nonexistent-state", "google") is False

    def test_validate_expired_state(self):
        state = create_oauth_state("google")
        # Manually backdate the state
        provider, _ = _oauth_states[state]
        _oauth_states[state] = (provider, time.time() - 700)
        assert validate_oauth_state(state, "google") is False


# ---------------------------------------------------------------------------
# Unit tests: get_configured_providers
# ---------------------------------------------------------------------------


class TestGetConfiguredProviders:
    def test_returns_list(self):
        result = get_configured_providers()
        assert isinstance(result, list)

    def test_empty_when_no_credentials(self):
        """With default empty config, no providers should be configured."""
        result = get_configured_providers()
        assert result == []


# ---------------------------------------------------------------------------
# Integration tests: OAuth API endpoints
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.mark.asyncio
async def test_oauth_providers_endpoint(client):
    """GET /api/auth/oauth/providers should return configured providers list."""
    resp = await client.get("/api/auth/oauth/providers")
    assert resp.status_code == 200
    data = resp.json()
    assert "providers" in data
    assert isinstance(data["providers"], list)


@pytest.mark.asyncio
async def test_oauth_providers_empty_when_unconfigured(client):
    """With no env vars set, providers list should be empty."""
    resp = await client.get("/api/auth/oauth/providers")
    assert resp.status_code == 200
    assert resp.json()["providers"] == []


@pytest.mark.asyncio
async def test_oauth_authorize_unknown_provider(client):
    """Requesting an unknown provider should return 400."""
    resp = await client.get("/api/auth/oauth/unknown_provider")
    assert resp.status_code == 400
    assert "Unknown OAuth provider" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oauth_authorize_unconfigured_provider(client):
    """Requesting an unconfigured provider should return 501."""
    resp = await client.get("/api/auth/oauth/google")
    assert resp.status_code == 501
    assert "not configured" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oauth_callback_missing_state(client):
    """Callback without state should return 400."""
    resp = await client.get(
        "/api/auth/oauth/google/callback",
        params={"code": "fake_code"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_oauth_callback_invalid_state(client):
    """Callback with invalid state should return 400."""
    resp = await client.get(
        "/api/auth/oauth/google/callback",
        params={"code": "fake_code", "state": "invalid-state"},
    )
    assert resp.status_code == 400

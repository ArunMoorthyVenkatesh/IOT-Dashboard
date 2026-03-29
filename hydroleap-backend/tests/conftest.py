"""
conftest.py — Backend test configuration.

Patches boto3.resource BEFORE any application module is imported so that
DynamoDB Table construction never makes real network calls in tests.
"""
import os
import sys

# ── Must be set before any app module imports ──────────────────────────────
# These override .env values (dotenv won't overwrite existing env vars).
os.environ["JWT_SECRET"] = "test_secret"
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "test_access_key")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "test_secret_key")

from unittest.mock import MagicMock
import boto3

# Intercept boto3.resource so that:
#   • get_table("X") → a fresh MagicMock per table name (no connection)
#   • ensure_table() → describe_table() returns a value (no ClientError raised)
_mock_dynamodb = MagicMock()
_mock_dynamodb.Table.side_effect = lambda name: MagicMock(name=f"mock_table_{name}")
_mock_dynamodb.meta.client.describe_table.return_value = {"Table": {"TableStatus": "ACTIVE"}}

boto3.resource = lambda *args, **kwargs: _mock_dynamodb

# ── App imports (safe now that DynamoDB is mocked) ─────────────────────────
from main import app  # noqa: E402
from fastapi.testclient import TestClient
import jwt
from datetime import datetime, timedelta, timezone
import pytest

TEST_SECRET = "test_secret"


def make_token(email: str, role: str = "user") -> str:
    """Return a signed HS256 JWT for use in test Authorization headers."""
    return jwt.encode(
        {
            "email": email,
            "role": role,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        TEST_SECRET,
        algorithm="HS256",
    )


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture
def user_token():
    return make_token("user@test.com", "user")


@pytest.fixture
def admin_token():
    return make_token("admin@hydroleap.com", "admin")


@pytest.fixture
def company_admin_token():
    return make_token("admin@cds.com", "admin")


@pytest.fixture(autouse=True)
def clear_otp_store():
    """Reset the shared in-memory OTP store before and after every test."""
    from utils import otp_utils
    otp_utils.otp_store.clear()
    yield
    otp_utils.otp_store.clear()

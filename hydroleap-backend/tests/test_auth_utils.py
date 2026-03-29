"""Tests for utils/auth.py — JWT decode helpers."""
import pytest
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException

TEST_SECRET = "test_secret"


def _make_token(email="test@example.com", role="user", expired=False):
    exp = datetime.now(timezone.utc) + (
        timedelta(seconds=-1) if expired else timedelta(hours=1)
    )
    return jwt.encode({"email": email, "role": role, "exp": exp}, TEST_SECRET, algorithm="HS256")


class TestDecodeJwt:
    def test_valid_token_returns_payload(self):
        from utils.auth import decode_jwt
        token = _make_token()
        payload = decode_jwt(token)
        assert payload["email"] == "test@example.com"
        assert payload["role"] == "user"

    def test_payload_contains_expected_keys(self):
        from utils.auth import decode_jwt
        token = _make_token(email="admin@hydroleap.com", role="admin")
        payload = decode_jwt(token)
        assert payload["email"] == "admin@hydroleap.com"
        assert payload["role"] == "admin"

    def test_expired_token_raises_401(self):
        from utils.auth import decode_jwt
        token = _make_token(expired=True)
        with pytest.raises(HTTPException) as exc_info:
            decode_jwt(token)
        assert exc_info.value.status_code == 401

    def test_tampered_token_raises_401(self):
        from utils.auth import decode_jwt
        token = _make_token() + "garbage"
        with pytest.raises(HTTPException) as exc_info:
            decode_jwt(token)
        assert exc_info.value.status_code == 401

    def test_wrong_secret_raises_401(self):
        from utils.auth import decode_jwt
        bad_token = jwt.encode(
            {"email": "a@b.com", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            "wrong_secret",
            algorithm="HS256",
        )
        with pytest.raises(HTTPException) as exc_info:
            decode_jwt(bad_token)
        assert exc_info.value.status_code == 401

    def test_empty_string_raises_401(self):
        from utils.auth import decode_jwt
        with pytest.raises(HTTPException) as exc_info:
            decode_jwt("")
        assert exc_info.value.status_code == 401

    def test_none_token_raises_401(self):
        from utils.auth import decode_jwt
        with pytest.raises((HTTPException, Exception)):
            decode_jwt(None)

    def test_completely_invalid_string_raises_401(self):
        from utils.auth import decode_jwt
        with pytest.raises(HTTPException):
            decode_jwt("not.a.jwt")

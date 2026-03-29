"""Tests for POST /api/login."""
import pytest
from unittest.mock import MagicMock, patch

USER_ROW = {
    "user_id": "u1",
    "email": "user@test.com",
    "password": "Secret1!",
    "name": "Test User",
    "company_name": "TestCo",
    "role": "user",
    "status": "active",
}

ADMIN_ROW = {
    "admin_id": "a1",
    "email": "admin@hydroleap.com",
    "password": "Admin1!",
    "name": "Admin User",
    "company_name": "Hydroleap",
    "role": "admin",
    "status": "active",
}


def _tbl(row):
    """Return a mock DynamoDB table whose scan() returns a single row."""
    tbl = MagicMock()
    tbl.scan.return_value = {"Items": [row]}
    return tbl


def _empty_tbl():
    tbl = MagicMock()
    tbl.scan.return_value = {"Items": []}
    return tbl


class TestLogin:
    def test_valid_user_login_returns_200(self, client):
        with patch("routers.login_router.get_table", return_value=_tbl(USER_ROW)):
            res = client.post("/api/login", json={
                "email": "user@test.com",
                "password": "Secret1!",
                "role": "user",
            })
        assert res.status_code == 200

    def test_valid_user_login_returns_token_and_profile(self, client):
        with patch("routers.login_router.get_table", return_value=_tbl(USER_ROW)):
            res = client.post("/api/login", json={
                "email": "user@test.com",
                "password": "Secret1!",
                "role": "user",
            })
        data = res.json()
        assert "token" in data
        assert "profile" in data
        assert data["profile"]["email"] == "user@test.com"

    def test_password_not_in_profile_response(self, client):
        with patch("routers.login_router.get_table", return_value=_tbl(USER_ROW)):
            res = client.post("/api/login", json={
                "email": "user@test.com",
                "password": "Secret1!",
                "role": "user",
            })
        assert "password" not in res.json().get("profile", {})

    def test_valid_admin_login_returns_200(self, client):
        with patch("routers.login_router.get_table", return_value=_tbl(ADMIN_ROW)):
            res = client.post("/api/login", json={
                "email": "admin@hydroleap.com",
                "password": "Admin1!",
                "role": "admin",
            })
        assert res.status_code == 200
        assert res.json()["role"] == "admin"

    def test_wrong_password_returns_401(self, client):
        with patch("routers.login_router.get_table", return_value=_tbl(USER_ROW)):
            res = client.post("/api/login", json={
                "email": "user@test.com",
                "password": "wrongpass",
                "role": "user",
            })
        assert res.status_code == 401

    def test_unknown_email_returns_401(self, client):
        with patch("routers.login_router.get_table", return_value=_empty_tbl()):
            res = client.post("/api/login", json={
                "email": "nobody@test.com",
                "password": "pass",
                "role": "user",
            })
        assert res.status_code == 401

    def test_invalid_role_returns_400(self, client):
        res = client.post("/api/login", json={
            "email": "user@test.com",
            "password": "pass",
            "role": "superuser",
        })
        assert res.status_code == 400

    def test_missing_password_returns_422(self, client):
        res = client.post("/api/login", json={"email": "user@test.com", "role": "user"})
        assert res.status_code == 422

    def test_missing_email_returns_422(self, client):
        res = client.post("/api/login", json={"password": "pass", "role": "user"})
        assert res.status_code == 422

    def test_email_normalised_to_lowercase(self, client):
        with patch("routers.login_router.get_table", return_value=_tbl(USER_ROW)):
            res = client.post("/api/login", json={
                "email": "USER@TEST.COM",
                "password": "Secret1!",
                "role": "user",
            })
        assert res.status_code == 200

    def test_response_role_matches_request(self, client):
        with patch("routers.login_router.get_table", return_value=_tbl(USER_ROW)):
            res = client.post("/api/login", json={
                "email": "user@test.com",
                "password": "Secret1!",
                "role": "user",
            })
        assert res.json()["role"] == "user"

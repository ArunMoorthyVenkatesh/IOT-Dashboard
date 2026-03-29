"""Tests for user-scoped endpoints: /api/users, /api/user/me, starred, profile update."""
import pytest
from unittest.mock import MagicMock, patch
from conftest import make_token


USER = {
    "user_id": "u1",
    "email": "user@test.com",
    "name": "Test User",
    "phone": "12345678",
    "company_name": "TestCo",
    "role": "user",
    "status": "active",
    "starred_projects": ["P1001"],
}

HL_ADMIN = {
    "admin_id": "a1",
    "email": "admin@hydroleap.com",
    "name": "HL Admin",
    "company_name": "Hydroleap",
}

CDS_ADMIN = {
    "admin_id": "a2",
    "email": "admin@cds.com",
    "name": "CDS Admin",
    "company_name": "CDS Agencies",
}

CDS_USER = {**USER, "user_id": "u2", "email": "user@cds.com", "company_name": "CDS Agencies"}


def _tbl(items):
    m = MagicMock()
    m.scan.return_value = {"Items": items}
    return m


class TestGetAllUsers:
    def test_hydroleap_admin_sees_all_users(self, client):
        token = make_token("admin@hydroleap.com", "admin")
        with patch("routers.user_router.users_table", _tbl([USER, CDS_USER])), \
             patch("routers.user_router.admins_table", _tbl([HL_ADMIN])):
            res = client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert len(res.json()["users"]) == 2

    def test_company_admin_sees_only_own_company_users(self, client):
        token = make_token("admin@cds.com", "admin")
        with patch("routers.user_router.users_table", _tbl([USER, CDS_USER])), \
             patch("routers.user_router.admins_table", _tbl([CDS_ADMIN])):
            res = client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        users = res.json()["users"]
        assert all(u["company_name"] == "CDS Agencies" for u in users)
        assert len(users) == 1

    def test_missing_token_returns_422(self, client):
        res = client.get("/api/users")
        assert res.status_code == 422

    def test_caller_not_admin_returns_401(self, client):
        token = make_token("ghost@test.com", "admin")
        with patch("routers.user_router.users_table", _tbl([USER])), \
             patch("routers.user_router.admins_table", _tbl([])):
            res = client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401

    def test_invalid_token_returns_401(self, client):
        res = client.get("/api/users", headers={"Authorization": "Bearer bad.token.here"})
        assert res.status_code == 401


class TestGetMyProfile:
    def test_returns_own_profile(self, client):
        token = make_token("user@test.com", "user")
        with patch("routers.user_router.users_table", _tbl([USER])):
            res = client.get("/api/user/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json()["email"] == "user@test.com"

    def test_user_not_found_returns_non_200(self, client):
        token = make_token("ghost@test.com", "user")
        with patch("routers.user_router.users_table", _tbl([])):
            res = client.get("/api/user/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code in (401, 404)

    def test_no_token_returns_422(self, client):
        res = client.get("/api/user/me")
        assert res.status_code == 422

    def test_tampered_token_returns_401(self, client):
        res = client.get("/api/user/me", headers={"Authorization": "Bearer invalid.jwt.token"})
        assert res.status_code == 401


class TestRequestProfileUpdate:
    def test_valid_update_request_returns_200(self, client):
        token = make_token("user@test.com", "user")
        mock_pending = MagicMock()
        with patch("routers.user_router.users_table", _tbl([USER])), \
             patch("routers.user_router.pending_profile_updates_table", mock_pending):
            res = client.post(
                "/api/user/request-profile-update",
                json={"name": "New Name"},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert res.status_code == 200
        assert "request_id" in res.json()

    def test_update_request_is_stored_in_pending_table(self, client):
        token = make_token("user@test.com", "user")
        mock_pending = MagicMock()
        with patch("routers.user_router.users_table", _tbl([USER])), \
             patch("routers.user_router.pending_profile_updates_table", mock_pending):
            client.post(
                "/api/user/request-profile-update",
                json={"phone": "99990000"},
                headers={"Authorization": f"Bearer {token}"},
            )
        mock_pending.put_item.assert_called_once()

    def test_empty_fields_returns_400(self, client):
        token = make_token("user@test.com", "user")
        with patch("routers.user_router.users_table", _tbl([USER])), \
             patch("routers.user_router.pending_profile_updates_table", MagicMock()):
            res = client.post(
                "/api/user/request-profile-update",
                json={},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert res.status_code == 400

    def test_user_not_found_returns_non_200(self, client):
        token = make_token("ghost@test.com", "user")
        with patch("routers.user_router.users_table", _tbl([])), \
             patch("routers.user_router.pending_profile_updates_table", MagicMock()):
            res = client.post(
                "/api/user/request-profile-update",
                json={"name": "Ghost"},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert res.status_code in (401, 404, 500)


class TestStarredProjects:
    def test_get_starred_returns_list(self, client):
        token = make_token("user@test.com", "user")
        with patch("routers.user_router.users_table", _tbl([USER])):
            res = client.get("/api/user/starred", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json()["starred"] == ["P1001"]

    def test_get_starred_empty_for_new_user(self, client):
        token = make_token("user@test.com", "user")
        user_no_star = {**USER, "starred_projects": []}
        with patch("routers.user_router.users_table", _tbl([user_no_star])):
            res = client.get("/api/user/starred", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json()["starred"] == []

    def test_toggle_adds_new_project(self, client):
        token = make_token("user@test.com", "user")
        user_no_star = {**USER, "starred_projects": []}
        mock_tbl = _tbl([user_no_star])
        mock_tbl.update_item.return_value = {}
        with patch("routers.user_router.users_table", mock_tbl):
            res = client.post(
                "/api/user/starred/toggle",
                json={"project_id": "P1002"},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert res.status_code == 200
        assert "P1002" in res.json()["starred"]

    def test_toggle_removes_existing_project(self, client):
        token = make_token("user@test.com", "user")
        mock_tbl = _tbl([USER])  # USER has starred_projects: ["P1001"]
        mock_tbl.update_item.return_value = {}
        with patch("routers.user_router.users_table", mock_tbl):
            res = client.post(
                "/api/user/starred/toggle",
                json={"project_id": "P1001"},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert res.status_code == 200
        assert "P1001" not in res.json()["starred"]

    def test_toggle_calls_update_item(self, client):
        token = make_token("user@test.com", "user")
        mock_tbl = _tbl([USER])
        mock_tbl.update_item.return_value = {}
        with patch("routers.user_router.users_table", mock_tbl):
            client.post(
                "/api/user/starred/toggle",
                json={"project_id": "P9999"},
                headers={"Authorization": f"Bearer {token}"},
            )
        mock_tbl.update_item.assert_called_once()

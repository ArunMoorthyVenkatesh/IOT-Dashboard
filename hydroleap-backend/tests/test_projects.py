"""
Tests for GET /api/projects — the company-scoped project listing endpoint.

Key behaviours under test:
  - Hydroleap admins see ALL projects
  - Non-Hydroleap admins see only projects assigned to their company
  - Regular approved users see ALL projects (frontend filters by access IDs)
  - Unauthenticated / unknown callers get 401 / 422
"""
import pytest
from unittest.mock import MagicMock, patch
from conftest import make_token


ALL_PROJECTS = [
    {"projectId": "P1001", "name": "Alpha Plant"},
    {"projectId": "P1002", "name": "Beta Plant"},
    {"projectId": "P1003", "name": "Gamma Plant"},
]

HL_ADMIN = {"admin_id": "a1", "email": "admin@hydroleap.com", "company_name": "Hydroleap"}
CDS_ADMIN = {"admin_id": "a2", "email": "admin@cds.com", "company_name": "CDS Agencies"}

CDS_ACCESS = [
    {"company": "CDS Agencies", "projectId": "P1001"},
    {"company": "CDS Agencies", "projectId": "P1002"},
]

REGULAR_USER = {
    "user_id": "u1",
    "email": "user@test.com",
    "company_name": "TestCo",
    "name": "Test User",
}


def _tbl(items):
    m = MagicMock()
    m.scan.return_value = {"Items": items}
    return m


def _projects_tbl():
    return _tbl(ALL_PROJECTS)


class TestListProjects:
    def test_hydroleap_admin_gets_all_projects(self, client):
        token = make_token("admin@hydroleap.com", "admin")
        with patch("routers.admin_routers.projects_table", _projects_tbl()), \
             patch("routers.admin_routers.admins_table", _tbl([HL_ADMIN])), \
             patch("routers.admin_routers.approved_users_table", _tbl([])), \
             patch("routers.admin_routers.company_project_access_table", _tbl(CDS_ACCESS)):
            res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert len(res.json()["projects"]) == 3

    def test_company_admin_gets_only_assigned_projects(self, client):
        token = make_token("admin@cds.com", "admin")
        with patch("routers.admin_routers.projects_table", _projects_tbl()), \
             patch("routers.admin_routers.admins_table", _tbl([CDS_ADMIN])), \
             patch("routers.admin_routers.approved_users_table", _tbl([])), \
             patch("routers.admin_routers.company_project_access_table", _tbl(CDS_ACCESS)):
            res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        ids = {p["projectId"] for p in res.json()["projects"]}
        assert ids == {"P1001", "P1002"}
        assert "P1003" not in ids

    def test_company_admin_with_no_assignments_gets_empty_list(self, client):
        token = make_token("admin@cds.com", "admin")
        with patch("routers.admin_routers.projects_table", _projects_tbl()), \
             patch("routers.admin_routers.admins_table", _tbl([CDS_ADMIN])), \
             patch("routers.admin_routers.approved_users_table", _tbl([])), \
             patch("routers.admin_routers.company_project_access_table", _tbl([])):
            res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json()["projects"] == []

    def test_regular_user_gets_all_projects(self, client):
        """Users receive all projects; the frontend already filters by their access IDs."""
        token = make_token("user@test.com", "user")
        user_tbl = _tbl([REGULAR_USER])
        with patch("routers.admin_routers.projects_table", _projects_tbl()), \
             patch("routers.admin_routers.admins_table", _tbl([])), \
             patch("routers.admin_routers.approved_users_table", user_tbl), \
             patch("routers.admin_routers.company_project_access_table", _tbl(CDS_ACCESS)):
            res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert len(res.json()["projects"]) == 3

    def test_no_token_returns_422(self, client):
        res = client.get("/api/projects")
        assert res.status_code == 422

    def test_invalid_token_returns_401(self, client):
        res = client.get("/api/projects", headers={"Authorization": "Bearer not.a.real.token"})
        assert res.status_code == 401

    def test_caller_not_in_any_table_returns_401(self, client):
        token = make_token("nobody@example.com", "user")
        with patch("routers.admin_routers.projects_table", _projects_tbl()), \
             patch("routers.admin_routers.admins_table", _tbl([])), \
             patch("routers.admin_routers.approved_users_table", _tbl([])), \
             patch("routers.admin_routers.company_project_access_table", _tbl([])):
            res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401

    def test_response_shape_contains_projects_key(self, client):
        token = make_token("admin@hydroleap.com", "admin")
        with patch("routers.admin_routers.projects_table", _projects_tbl()), \
             patch("routers.admin_routers.admins_table", _tbl([HL_ADMIN])), \
             patch("routers.admin_routers.approved_users_table", _tbl([])), \
             patch("routers.admin_routers.company_project_access_table", _tbl([])):
            res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert "projects" in res.json()

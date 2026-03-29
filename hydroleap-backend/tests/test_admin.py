"""Tests for admin management endpoints: people directory, pending approvals, profile updates."""
import pytest
from unittest.mock import MagicMock, patch
from conftest import make_token


HL_ADMIN = {"admin_id": "a1", "email": "admin@hydroleap.com", "company_name": "Hydroleap"}
CDS_ADMIN = {"admin_id": "a2", "email": "admin@cds.com", "company_name": "CDS Agencies"}
OTHER_ADMIN = {"admin_id": "a3", "email": "admin@other.com", "company_name": "OtherCo"}

PENDING_USER_CDS = {"user_id": "pu1", "email": "pending@cds.com", "company_name": "CDS Agencies", "name": "CDS User"}
PENDING_USER_OTHER = {"user_id": "pu2", "email": "pending@other.com", "company_name": "OtherCo", "name": "Other User"}
PENDING_ADMIN_CDS = {"admin_id": "pa1", "email": "padmin@cds.com", "company_name": "CDS Agencies", "name": "CDS Pending Admin"}


def _tbl(items):
    m = MagicMock()
    m.scan.return_value = {"Items": items}
    return m


class TestGetAllAdmins:
    def test_hydroleap_sees_all_admins(self, client):
        token = make_token("admin@hydroleap.com", "admin")
        with patch("routers.admin_routers.admins_table", _tbl([HL_ADMIN, CDS_ADMIN, OTHER_ADMIN])):
            res = client.get("/api/admins", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert len(res.json()["admins"]) == 3

    def test_company_admin_sees_only_own_company(self, client):
        token = make_token("admin@cds.com", "admin")
        with patch("routers.admin_routers.admins_table", _tbl([HL_ADMIN, CDS_ADMIN, OTHER_ADMIN])):
            res = client.get("/api/admins", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        admins = res.json()["admins"]
        assert all(a["company_name"] == "CDS Agencies" for a in admins)
        assert len(admins) == 1

    def test_missing_token_returns_422(self, client):
        res = client.get("/api/admins")
        assert res.status_code == 422

    def test_unknown_caller_returns_401(self, client):
        token = make_token("ghost@test.com", "admin")
        with patch("routers.admin_routers.admins_table", _tbl([])):
            res = client.get("/api/admins", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401


class TestPendingUsers:
    def test_hydroleap_sees_all_pending_users(self, client):
        token = make_token("admin@hydroleap.com", "admin")
        with patch("routers.admin_routers.admins_table", _tbl([HL_ADMIN])), \
             patch("routers.admin_routers.pending_users_table", _tbl([PENDING_USER_CDS, PENDING_USER_OTHER])):
            res = client.get("/api/admin/pending-users", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_company_admin_sees_own_pending_only(self, client):
        token = make_token("admin@cds.com", "admin")
        with patch("routers.admin_routers.admins_table", _tbl([CDS_ADMIN])), \
             patch("routers.admin_routers.pending_users_table", _tbl([PENDING_USER_CDS, PENDING_USER_OTHER])):
            res = client.get("/api/admin/pending-users", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        results = res.json()
        assert len(results) == 1
        assert results[0]["company_name"] == "CDS Agencies"

    def test_unknown_admin_returns_401(self, client):
        token = make_token("ghost@test.com", "admin")
        with patch("routers.admin_routers.admins_table", _tbl([])), \
             patch("routers.admin_routers.pending_users_table", _tbl([])):
            res = client.get("/api/admin/pending-users", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401


class TestPendingAdmins:
    def test_hydroleap_sees_all_pending_admins(self, client):
        token = make_token("admin@hydroleap.com", "admin")
        with patch("routers.admin_routers.admins_table", _tbl([HL_ADMIN])), \
             patch("routers.admin_routers.pending_admins_table", _tbl([PENDING_ADMIN_CDS, OTHER_ADMIN])):
            res = client.get("/api/admin/pending-admins", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_company_admin_sees_own_pending_only(self, client):
        token = make_token("admin@cds.com", "admin")
        with patch("routers.admin_routers.admins_table", _tbl([CDS_ADMIN])), \
             patch("routers.admin_routers.pending_admins_table", _tbl([PENDING_ADMIN_CDS, OTHER_ADMIN])):
            res = client.get("/api/admin/pending-admins", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        results = res.json()
        assert all(a["company_name"] == "CDS Agencies" for a in results)


class TestHandleUserRequest:
    def test_approve_moves_user_to_approved_table(self, client):
        pending_tbl = MagicMock()
        pending_tbl.get_item.return_value = {"Item": PENDING_USER_CDS}
        approved_tbl = MagicMock()
        with patch("routers.admin_routers.pending_users_table", pending_tbl), \
             patch("routers.admin_routers.approved_users_table", approved_tbl), \
             patch("routers.admin_routers.send_approval_email"):
            res = client.post("/api/admin/handle-user-request",
                              json={"id": "pu1", "action": "approve"})
        assert res.status_code == 200
        approved_tbl.put_item.assert_called_once()
        pending_tbl.delete_item.assert_called_once()

    def test_reject_removes_from_pending_table(self, client):
        pending_tbl = MagicMock()
        pending_tbl.get_item.return_value = {"Item": PENDING_USER_CDS}
        with patch("routers.admin_routers.pending_users_table", pending_tbl), \
             patch("routers.admin_routers.send_rejection_email"):
            res = client.post("/api/admin/handle-user-request",
                              json={"id": "pu1", "action": "reject"})
        assert res.status_code == 200
        pending_tbl.delete_item.assert_called_once()

    def test_invalid_action_returns_400(self, client):
        res = client.post("/api/admin/handle-user-request",
                          json={"id": "pu1", "action": "ban"})
        assert res.status_code == 400

    def test_missing_id_returns_400(self, client):
        res = client.post("/api/admin/handle-user-request",
                          json={"action": "approve"})
        assert res.status_code == 400

    def test_user_not_found_returns_404(self, client):
        pending_tbl = MagicMock()
        pending_tbl.get_item.return_value = {"Item": None}
        with patch("routers.admin_routers.pending_users_table", pending_tbl):
            res = client.post("/api/admin/handle-user-request",
                              json={"id": "nonexistent", "action": "approve"})
        assert res.status_code == 404


class TestHandleAdminRequest:
    def test_approve_admin_moves_to_approved_table(self, client):
        pending_tbl = MagicMock()
        pending_tbl.get_item.return_value = {"Item": PENDING_ADMIN_CDS}
        approved_tbl = MagicMock()
        with patch("routers.admin_routers.pending_admins_table", pending_tbl), \
             patch("routers.admin_routers.admins_table", approved_tbl), \
             patch("routers.admin_routers.send_approval_email"):
            res = client.post("/api/admin/handle-admin-request",
                              json={"id": "pa1", "action": "approve"})
        assert res.status_code == 200
        approved_tbl.put_item.assert_called_once()
        pending_tbl.delete_item.assert_called_once()

    def test_reject_admin_removes_from_pending(self, client):
        pending_tbl = MagicMock()
        pending_tbl.get_item.return_value = {"Item": PENDING_ADMIN_CDS}
        with patch("routers.admin_routers.pending_admins_table", pending_tbl), \
             patch("routers.admin_routers.send_rejection_email"):
            res = client.post("/api/admin/handle-admin-request",
                              json={"id": "pa1", "action": "reject"})
        assert res.status_code == 200
        pending_tbl.delete_item.assert_called_once()

    def test_admin_not_found_returns_404(self, client):
        pending_tbl = MagicMock()
        pending_tbl.get_item.return_value = {"Item": None}
        with patch("routers.admin_routers.pending_admins_table", pending_tbl):
            res = client.post("/api/admin/handle-admin-request",
                              json={"id": "nope", "action": "approve"})
        assert res.status_code == 404


class TestPendingProfileUpdates:
    UPDATE_CDS = {"request_id": "r1", "email": "user@cds.com", "company_name": "CDS Agencies"}
    UPDATE_OTHER = {"request_id": "r2", "email": "user@other.com", "company_name": "OtherCo"}

    def test_hydroleap_sees_all_updates(self, client):
        token = make_token("admin@hydroleap.com", "admin")
        with patch("routers.admin_routers.admins_table", _tbl([HL_ADMIN])), \
             patch("routers.admin_routers.pending_profile_updates_table",
                   _tbl([self.UPDATE_CDS, self.UPDATE_OTHER])):
            res = client.get("/api/admin/pending-profile-updates",
                             headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_company_admin_sees_own_updates_only(self, client):
        token = make_token("admin@cds.com", "admin")
        with patch("routers.admin_routers.admins_table", _tbl([CDS_ADMIN])), \
             patch("routers.admin_routers.pending_profile_updates_table",
                   _tbl([self.UPDATE_CDS, self.UPDATE_OTHER])):
            res = client.get("/api/admin/pending-profile-updates",
                             headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        results = res.json()
        assert len(results) == 1
        assert results[0]["company_name"] == "CDS Agencies"

    def test_missing_token_returns_422(self, client):
        res = client.get("/api/admin/pending-profile-updates")
        assert res.status_code == 422

    def test_handle_approve_applies_fields_and_deletes_record(self, client):
        record = {
            "request_id": "r1",
            "user_id": "u1",
            "email": "user@cds.com",
            "display_name": "CDS User",
            "account_type": "user",
            "requested_fields": {"name": "Updated Name"},
            "company_name": "CDS Agencies",
        }
        pending_tbl = MagicMock()
        pending_tbl.get_item.return_value = {"Item": record}
        users_tbl = MagicMock()
        with patch("routers.admin_routers.pending_profile_updates_table", pending_tbl), \
             patch("routers.admin_routers.approved_users_table", users_tbl), \
             patch("routers.admin_routers.send_approval_email"):
            res = client.post("/api/admin/handle-profile-update",
                              json={"id": "r1", "action": "approve"})
        assert res.status_code == 200
        users_tbl.update_item.assert_called_once()
        pending_tbl.delete_item.assert_called_once()

    def test_handle_reject_deletes_record_without_applying(self, client):
        record = {
            "request_id": "r1",
            "user_id": "u1",
            "email": "user@cds.com",
            "display_name": "CDS User",
            "account_type": "user",
            "requested_fields": {"name": "Updated Name"},
        }
        pending_tbl = MagicMock()
        pending_tbl.get_item.return_value = {"Item": record}
        users_tbl = MagicMock()
        with patch("routers.admin_routers.pending_profile_updates_table", pending_tbl), \
             patch("routers.admin_routers.approved_users_table", users_tbl), \
             patch("routers.admin_routers.send_rejection_email"):
            res = client.post("/api/admin/handle-profile-update",
                              json={"id": "r1", "action": "reject"})
        assert res.status_code == 200
        users_tbl.update_item.assert_not_called()
        pending_tbl.delete_item.assert_called_once()

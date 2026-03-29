"""Tests for POST /api/register."""
import pytest
from unittest.mock import MagicMock, patch


def _empty_tbl():
    tbl = MagicMock()
    tbl.scan.return_value = {"Items": []}
    return tbl


def _tbl_with(row):
    tbl = MagicMock()
    tbl.scan.return_value = {"Items": [row]}
    return tbl


def _base_payload(**overrides):
    return {
        "firstName": "Test",
        "middleName": "",
        "lastName": "User",
        "dob": "1990-01-01",
        "phone": "12345678",
        "gender": "Male",
        "email": "new@test.com",
        "password": "Secret1!",
        "confirmPassword": "Secret1!",
        "companyName": "TestCo",
        "otp": "123456",
        "role": "user",
        **overrides,
    }


def _patch_all_empty():
    """Context manager: all four duplicate-check tables return empty."""
    return patch("routers.register_router.get_table", return_value=_empty_tbl())


class TestRegisterUser:
    def test_valid_user_registration_returns_200(self, client):
        from utils import otp_utils
        otp_utils.otp_store["new@test.com"] = "123456"
        with _patch_all_empty(), \
             patch("routers.register_router.send_registration_success_email"), \
             patch("routers.register_router.send_pending_duplicate_email"), \
             patch("routers.register_router.send_approved_duplicate_email"):
            res = client.post("/api/register", json=_base_payload())
        assert res.status_code == 200

    def test_valid_registration_returns_pending_status(self, client):
        from utils import otp_utils
        otp_utils.otp_store["new@test.com"] = "123456"
        with _patch_all_empty(), \
             patch("routers.register_router.send_registration_success_email"), \
             patch("routers.register_router.send_pending_duplicate_email"), \
             patch("routers.register_router.send_approved_duplicate_email"):
            res = client.post("/api/register", json=_base_payload())
        assert res.json()["status"] == "pending"

    def test_user_registration_returns_user_id(self, client):
        from utils import otp_utils
        otp_utils.otp_store["new@test.com"] = "123456"
        with _patch_all_empty(), \
             patch("routers.register_router.send_registration_success_email"), \
             patch("routers.register_router.send_pending_duplicate_email"), \
             patch("routers.register_router.send_approved_duplicate_email"):
            res = client.post("/api/register", json=_base_payload())
        assert "user_id" in res.json()

    def test_admin_registration_returns_admin_id(self, client):
        from utils import otp_utils
        otp_utils.otp_store["admin@test.com"] = "111111"
        with _patch_all_empty(), \
             patch("routers.register_router.send_registration_success_email"), \
             patch("routers.register_router.send_pending_duplicate_email"), \
             patch("routers.register_router.send_approved_duplicate_email"):
            res = client.post("/api/register", json=_base_payload(
                email="admin@test.com", otp="111111", role="admin"
            ))
        assert res.status_code == 200
        assert "admin_id" in res.json()

    def test_success_email_is_sent(self, client):
        from utils import otp_utils
        otp_utils.otp_store["new@test.com"] = "123456"
        with _patch_all_empty(), \
             patch("routers.register_router.send_registration_success_email") as mock_mail, \
             patch("routers.register_router.send_pending_duplicate_email"), \
             patch("routers.register_router.send_approved_duplicate_email"):
            client.post("/api/register", json=_base_payload())
        mock_mail.assert_called_once()


class TestRegisterValidation:
    def test_password_mismatch_returns_400(self, client):
        res = client.post("/api/register", json=_base_payload(confirmPassword="Different1!"))
        assert res.status_code == 400
        assert "Passwords do not match" in res.json()["detail"]

    def test_invalid_otp_returns_400(self, client):
        from utils import otp_utils
        otp_utils.otp_store["otp@test.com"] = "999999"
        with _patch_all_empty(), \
             patch("routers.register_router.send_pending_duplicate_email"), \
             patch("routers.register_router.send_approved_duplicate_email"), \
             patch("routers.register_router.send_registration_success_email"):
            res = client.post("/api/register", json=_base_payload(
                email="otp@test.com", otp="111111"
            ))
        assert res.status_code == 400
        assert "OTP" in res.json()["detail"]

    def test_no_otp_stored_returns_400(self, client):
        # otp_store is empty (autouse fixture clears it)
        with _patch_all_empty(), \
             patch("routers.register_router.send_pending_duplicate_email"), \
             patch("routers.register_router.send_approved_duplicate_email"), \
             patch("routers.register_router.send_registration_success_email"):
            res = client.post("/api/register", json=_base_payload())
        assert res.status_code == 400


class TestRegisterDuplicates:
    def test_pending_duplicate_returns_400(self, client):
        from utils import otp_utils
        otp_utils.otp_store["dup@test.com"] = "123456"
        dup_tbl = _tbl_with({"email": "dup@test.com"})
        with patch("routers.register_router.get_table", return_value=dup_tbl), \
             patch("routers.register_router.send_pending_duplicate_email") as mock_mail, \
             patch("routers.register_router.send_approved_duplicate_email"), \
             patch("routers.register_router.send_registration_success_email"):
            res = client.post("/api/register", json=_base_payload(email="dup@test.com"))
        assert res.status_code == 400
        mock_mail.assert_called_once()

    def test_approved_duplicate_returns_400(self, client):
        from utils import otp_utils
        otp_utils.otp_store["approved@test.com"] = "123456"
        empty = _empty_tbl()
        approved = _tbl_with({"email": "approved@test.com"})
        call_count = {"n": 0}

        def get_table_side_effect(name):
            call_count["n"] += 1
            # First two calls = pending user/admin checks (empty)
            # Subsequent calls = approved user/admin checks (hit)
            return empty if call_count["n"] <= 2 else approved

        with patch("routers.register_router.get_table", side_effect=get_table_side_effect), \
             patch("routers.register_router.send_approved_duplicate_email") as mock_mail, \
             patch("routers.register_router.send_pending_duplicate_email"), \
             patch("routers.register_router.send_registration_success_email"):
            res = client.post("/api/register", json=_base_payload(email="approved@test.com"))
        assert res.status_code == 400
        mock_mail.assert_called_once()

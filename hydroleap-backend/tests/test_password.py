"""Tests for /api/auth/forgot-password/send-otp and /api/auth/forgot-password/reset."""
import pytest
from unittest.mock import MagicMock, patch


USER_ROW = {
    "user_id": "u1",
    "email": "user@test.com",
    "password": "OldPass1!",
    "company_name": "TestCo",
}

ADMIN_ROW = {
    "admin_id": "a1",
    "email": "admin@test.com",
    "password": "OldAdmin1!",
    "company_name": "Hydroleap",
}


def _tbl(items):
    m = MagicMock()
    m.scan.return_value = {"Items": items}
    return m


class TestSendResetOtp:
    def test_returns_200_for_existing_user(self, client):
        with patch("routers.password_router.get_table", return_value=_tbl([USER_ROW])), \
             patch("routers.password_router.send_otp_email") as mock_mail, \
             patch("routers.password_router.store_otp"):
            res = client.post("/api/auth/forgot-password/send-otp",
                              json={"email": "user@test.com", "role": "user"})
        assert res.status_code == 200
        mock_mail.assert_called_once()

    def test_returns_200_for_nonexistent_email(self, client):
        """Prevents email enumeration — always 200 regardless."""
        with patch("routers.password_router.get_table", return_value=_tbl([])), \
             patch("routers.password_router.send_otp_email"), \
             patch("routers.password_router.store_otp"):
            res = client.post("/api/auth/forgot-password/send-otp",
                              json={"email": "ghost@test.com", "role": "user"})
        assert res.status_code == 200

    def test_invalid_role_returns_422(self, client):
        res = client.post("/api/auth/forgot-password/send-otp",
                          json={"email": "user@test.com", "role": "superuser"})
        assert res.status_code == 422

    def test_invalid_email_returns_422(self, client):
        res = client.post("/api/auth/forgot-password/send-otp",
                          json={"email": "not-an-email", "role": "user"})
        assert res.status_code == 422

    def test_otp_stored_in_store(self, client):
        from utils import otp_utils
        with patch("routers.password_router.get_table", return_value=_tbl([USER_ROW])), \
             patch("routers.password_router.send_otp_email"):
            client.post("/api/auth/forgot-password/send-otp",
                        json={"email": "user@test.com", "role": "user"})
        assert "user@test.com" in otp_utils.otp_store


class TestResetPassword:
    def test_valid_reset_returns_200(self, client):
        from utils import otp_utils
        otp_utils.otp_store["user@test.com"] = "123456"
        mock_tbl = _tbl([USER_ROW])
        with patch("routers.password_router.get_table", return_value=mock_tbl):
            res = client.post("/api/auth/forgot-password/reset", json={
                "email": "user@test.com",
                "role": "user",
                "otp": "123456",
                "new_password": "NewPass1!",
                "confirm_password": "NewPass1!",
            })
        assert res.status_code == 200

    def test_valid_reset_updates_password_in_db(self, client):
        from utils import otp_utils
        otp_utils.otp_store["user@test.com"] = "123456"
        mock_tbl = _tbl([USER_ROW])
        with patch("routers.password_router.get_table", return_value=mock_tbl):
            client.post("/api/auth/forgot-password/reset", json={
                "email": "user@test.com",
                "role": "user",
                "otp": "123456",
                "new_password": "NewPass1!",
                "confirm_password": "NewPass1!",
            })
        mock_tbl.update_item.assert_called_once()

    def test_password_mismatch_returns_400(self, client):
        res = client.post("/api/auth/forgot-password/reset", json={
            "email": "user@test.com",
            "role": "user",
            "otp": "123456",
            "new_password": "NewPass1!",
            "confirm_password": "Different1!",
        })
        assert res.status_code == 400

    def test_wrong_otp_returns_400(self, client):
        from utils import otp_utils
        otp_utils.otp_store["user@test.com"] = "999999"
        with patch("routers.password_router.get_table", return_value=_tbl([USER_ROW])):
            res = client.post("/api/auth/forgot-password/reset", json={
                "email": "user@test.com",
                "role": "user",
                "otp": "111111",
                "new_password": "NewPass1!",
                "confirm_password": "NewPass1!",
            })
        assert res.status_code == 400

    def test_expired_otp_not_in_store_returns_400(self, client):
        # otp_store is empty (autouse fixture)
        with patch("routers.password_router.get_table", return_value=_tbl([USER_ROW])):
            res = client.post("/api/auth/forgot-password/reset", json={
                "email": "user@test.com",
                "role": "user",
                "otp": "123456",
                "new_password": "NewPass1!",
                "confirm_password": "NewPass1!",
            })
        assert res.status_code == 400

    def test_unknown_email_returns_200_silently(self, client):
        """Does not leak whether the email exists."""
        from utils import otp_utils
        otp_utils.otp_store["nobody@test.com"] = "123456"
        with patch("routers.password_router.get_table", return_value=_tbl([])):
            res = client.post("/api/auth/forgot-password/reset", json={
                "email": "nobody@test.com",
                "role": "user",
                "otp": "123456",
                "new_password": "NewPass1!",
                "confirm_password": "NewPass1!",
            })
        assert res.status_code == 200

    def test_admin_password_reset(self, client):
        from utils import otp_utils
        otp_utils.otp_store["admin@test.com"] = "654321"
        mock_tbl = _tbl([ADMIN_ROW])
        with patch("routers.password_router.get_table", return_value=mock_tbl):
            res = client.post("/api/auth/forgot-password/reset", json={
                "email": "admin@test.com",
                "role": "admin",
                "otp": "654321",
                "new_password": "NewAdmin1!",
                "confirm_password": "NewAdmin1!",
            })
        assert res.status_code == 200
        mock_tbl.update_item.assert_called_once()

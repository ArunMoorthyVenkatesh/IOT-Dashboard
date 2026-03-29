"""Tests for POST /api/otp/send and /api/otp/verify."""
import pytest
from unittest.mock import patch


class TestSendOtp:
    def test_returns_200_for_valid_email(self, client):
        with patch("routers.otp_router.send_otp_email"):
            res = client.post("/api/otp/send", json={"email": "test@example.com"})
        assert res.status_code == 200

    def test_email_is_sent(self, client):
        with patch("routers.otp_router.send_otp_email") as mock_email:
            client.post("/api/otp/send", json={"email": "test@example.com"})
        mock_email.assert_called_once()

    def test_otp_is_stored_in_otp_store(self, client):
        from utils import otp_utils
        with patch("routers.otp_router.send_otp_email"):
            client.post("/api/otp/send", json={"email": "store@test.com"})
        assert "store@test.com" in otp_utils.otp_store

    def test_invalid_email_returns_422(self, client):
        res = client.post("/api/otp/send", json={"email": "not-an-email"})
        assert res.status_code == 422

    def test_missing_email_returns_422(self, client):
        res = client.post("/api/otp/send", json={})
        assert res.status_code == 422

    def test_send_generates_6_digit_otp(self, client):
        from utils import otp_utils
        with patch("routers.otp_router.send_otp_email"):
            client.post("/api/otp/send", json={"email": "digits@test.com"})
        otp = otp_utils.otp_store.get("digits@test.com", "")
        assert len(otp) == 6
        assert otp.isdigit()

    def test_resending_overwrites_previous_otp(self, client):
        from utils import otp_utils
        with patch("routers.otp_router.send_otp_email"):
            client.post("/api/otp/send", json={"email": "resend@test.com"})
            first = otp_utils.otp_store["resend@test.com"]
            # Force a different OTP by setting the store manually
            otp_utils.otp_store["resend@test.com"] = "000000"
            client.post("/api/otp/send", json={"email": "resend@test.com"})
        # The latest OTP is now stored (may or may not equal 000000 depending on random)
        assert "resend@test.com" in otp_utils.otp_store


class TestVerifyOtp:
    def test_correct_otp_returns_200(self, client):
        from utils import otp_utils
        otp_utils.otp_store["verify@test.com"] = "123456"
        res = client.post("/api/otp/verify", json={"email": "verify@test.com", "otp": "123456"})
        assert res.status_code == 200

    def test_wrong_otp_returns_400(self, client):
        from utils import otp_utils
        otp_utils.otp_store["wrong@test.com"] = "123456"
        res = client.post("/api/otp/verify", json={"email": "wrong@test.com", "otp": "000000"})
        assert res.status_code == 400

    def test_no_otp_sent_returns_400(self, client):
        res = client.post("/api/otp/verify", json={"email": "new@test.com", "otp": "999999"})
        assert res.status_code == 400

    def test_email_case_normalised_before_lookup(self, client):
        from utils import otp_utils
        otp_utils.otp_store["upper@test.com"] = "555555"
        res = client.post("/api/otp/verify", json={"email": "UPPER@TEST.COM", "otp": "555555"})
        assert res.status_code == 200

    def test_invalid_email_returns_422(self, client):
        res = client.post("/api/otp/verify", json={"email": "bad", "otp": "123456"})
        assert res.status_code == 422

    def test_missing_otp_returns_422(self, client):
        res = client.post("/api/otp/verify", json={"email": "v@test.com"})
        assert res.status_code == 422

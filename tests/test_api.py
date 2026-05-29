from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200


def test_list_funds():
    r = client.get("/api/funds")
    assert r.status_code == 200
    data = r.json()
    assert len(data["funds"]) == 11


def test_nav_no_data():
    r = client.get("/api/funds/005827/nav")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NO_DATA"

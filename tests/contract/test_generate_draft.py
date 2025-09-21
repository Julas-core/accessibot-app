from fastapi.testclient import TestClient
from app import app
from src.services.store import store
from src.models.user_profile import UserProfile
from src.models.subscription import Subscription

client = TestClient(app)


def test_generate_draft_contract():
    user = UserProfile.create()
    store.users[user.user_id] = user
    sub = Subscription.create(user.user_id, "providerx", "basic", 9.99)
    store.subscriptions[sub.subscription_id] = sub
    r = client.post(
        f"/subscriptions/{sub.subscription_id}/draft", json={"tone": "polite"}
    )
    assert r.status_code == 200 or r.status_code == 201
    data = r.json()
    assert "draft_id" in data

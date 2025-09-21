from fastapi.testclient import TestClient
from app import app
from src.services.store import store
from src.models.user_profile import UserProfile
from src.models.subscription import Subscription

client = TestClient(app)


def test_list_subscriptions_contract():
    user = UserProfile.create()
    store.users[user.user_id] = user
    sub = Subscription.create(user.user_id, "providerx", "basic", 9.99)
    sub.usage_metrics["last_active_days"] = 90
    store.subscriptions[sub.subscription_id] = sub
    r = client.get(f"/users/{user.user_id}/subscriptions")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)

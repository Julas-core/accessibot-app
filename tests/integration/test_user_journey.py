from fastapi.testclient import TestClient
from app import app
from src.services.store import store
from src.models.user_profile import UserProfile
from src.models.subscription import Subscription

client = TestClient(app)


def test_user_journey_integration():
    user = UserProfile.create()
    user.consent_status = "granted"
    store.users[user.user_id] = user
    sub = Subscription.create(user.user_id, "providerx", "basic", 14.99)
    sub.usage_metrics["last_active_days"] = 90
    store.subscriptions[sub.subscription_id] = sub

    # generate draft
    r = client.post(
        f"/subscriptions/{sub.subscription_id}/draft", json={"tone": "polite"}
    )
    assert r.status_code in (200, 201)
    draft_id = r.json().get("draft_id")

    # approve draft
    r2 = client.post(f"/drafts/{draft_id}/approve")
    assert r2.status_code == 200
    outcome = r2.json()
    assert "outcome_id" in outcome

from fastapi.testclient import TestClient
from app import app
from src.services.store import store
from src.models.user_profile import UserProfile
from src.models.subscription import Subscription
from src.services.draft_service import generate_draft

client = TestClient(app)


def test_approve_draft_contract():
    user = UserProfile.create()
    store.users[user.user_id] = user
    sub = Subscription.create(user.user_id, "providerx", "basic", 9.99)
    store.subscriptions[sub.subscription_id] = sub
    draft = generate_draft(sub.subscription_id)
    r = client.post(f"/drafts/{draft.draft_id}/approve")
    assert r.status_code == 200
    data = r.json()
    assert "outcome_id" in data and data["result"] in (
        "succeeded",
        "failed",
        "no_response",
    )

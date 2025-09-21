from src.models.user_profile import UserProfile
from src.models.subscription import Subscription
from src.services.store import store
from src.services.draft_service import generate_draft, approve_and_send


def test_userprofile_model():
    u = UserProfile.create()
    assert u.user_id


def test_subscription_model_and_draft_flow():
    u = UserProfile.create()
    store.users[u.user_id] = u
    s = Subscription.create(u.user_id, "prov", "basic", 5.0)
    store.subscriptions[s.subscription_id] = s
    draft = generate_draft(s.subscription_id)
    assert draft.subscription_id == s.subscription_id
    outcome = approve_and_send(draft.draft_id)
    assert outcome.result in ("succeeded", "failed", "no_response")

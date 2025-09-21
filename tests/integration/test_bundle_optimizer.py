from src.services.bundle_optimizer import suggest_bundle
from src.models.subscription import Subscription
from src.services.store import store


def test_bundle_optimizer_integration():
    # prepare subscriptions
    user_id = "test-user"
    s1 = Subscription.create(user_id, "provA", "plan1", 10.0)
    s2 = Subscription.create(user_id, "provA", "plan2", 8.0)
    store.subscriptions[s1.subscription_id] = s1
    store.subscriptions[s2.subscription_id] = s2
    suggestion = suggest_bundle([s1, s2])
    assert suggestion is not None
    assert suggestion.estimated_savings > 0

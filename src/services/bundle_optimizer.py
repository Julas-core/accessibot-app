from src.models.bundle_suggestion import BundleSuggestion


def suggest_bundle(subscriptions):
    if len(subscriptions) < 2:
        return None
    ids = [s.subscription_id for s in subscriptions]
    savings = sum(s.cost for s in subscriptions) * 0.15
    return BundleSuggestion.create(
        subs=ids,
        savings=savings,
        tradeoffs="Reduced per-account features",
        confidence=0.6,
    )

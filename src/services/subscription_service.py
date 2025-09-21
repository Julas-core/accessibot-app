from src.services.store import store


def list_subscriptions(user_id):
    return [s for s in store.subscriptions.values() if s.user_id == user_id]

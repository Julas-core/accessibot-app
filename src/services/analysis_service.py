from src.services.store import store


def flag_low_usage(threshold_days=60):
    flagged = []
    for s in store.subscriptions.values():
        last_active = s.usage_metrics.get("last_active_days", 0)
        if last_active >= threshold_days:
            flagged.append(s)
    return flagged

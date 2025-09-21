from src.services.store import store
from src.models.negotiation_draft import NegotiationDraft
from src.models.negotiation_outcome import NegotiationOutcome


def generate_draft(subscription_id, tone="neutral"):
    sub = store.subscriptions.get(subscription_id)
    if not sub:
        raise ValueError("subscription not found")
    msg = f"Dear {sub.provider_name}, I am a long-time customer and would like a better price on my {sub.plan} plan."
    draft = NegotiationDraft.create(
        subscription_id=subscription_id,
        provider_contact={"email": f"support@{sub.provider_name}.com"},
        message_text=msg,
    )
    store.drafts[draft.draft_id] = draft
    return draft


def approve_and_send(draft_id):
    draft = store.drafts.get(draft_id)
    if not draft:
        raise ValueError("draft not found")
    draft.status = "sent"
    # Simulate provider response
    outcome = NegotiationOutcome.create(
        draft_id=draft.draft_id,
        response_summary="Provider offered 10% off",
        offer_details={"discount": "10%"},
        result="succeeded",
    )
    store.outcomes[outcome.outcome_id] = outcome
    return outcome

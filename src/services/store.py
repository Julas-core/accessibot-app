from typing import Dict
from src.models.user_profile import UserProfile
from src.models.subscription import Subscription
from src.models.negotiation_draft import NegotiationDraft
from src.models.negotiation_outcome import NegotiationOutcome


class Store:
    users: Dict[str, UserProfile] = {}
    subscriptions: Dict[str, Subscription] = {}
    drafts: Dict[str, NegotiationDraft] = {}
    outcomes: Dict[str, NegotiationOutcome] = {}


store = Store()

from dataclasses import dataclass
from typing import Optional, Dict
import uuid
from datetime import datetime, timezone


@dataclass
class NegotiationDraft:
    draft_id: str
    subscription_id: str
    provider_contact: Dict
    message_text: str
    created_at: str
    status: str = "drafted"
    user_approved_at: Optional[str] = None

    @staticmethod
    def create(subscription_id, provider_contact, message_text):
        return NegotiationDraft(
            draft_id=str(uuid.uuid4()),
            subscription_id=subscription_id,
            provider_contact=provider_contact,
            message_text=message_text,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

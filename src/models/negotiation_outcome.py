from dataclasses import dataclass
from typing import Dict
import uuid
from datetime import datetime, timezone


@dataclass
class NegotiationOutcome:
    outcome_id: str
    draft_id: str
    response_summary: str
    offer_details: Dict
    result: str
    timestamp: str

    @staticmethod
    def create(draft_id, response_summary, offer_details, result):
        return NegotiationOutcome(
            outcome_id=str(uuid.uuid4()),
            draft_id=draft_id,
            response_summary=response_summary,
            offer_details=offer_details,
            result=result,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

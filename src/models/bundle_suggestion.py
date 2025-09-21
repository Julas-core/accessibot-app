from dataclasses import dataclass
from typing import List
import uuid


@dataclass
class BundleSuggestion:
    suggestion_id: str
    involved_subscriptions: List[str]
    estimated_savings: float
    tradeoffs: str
    confidence_score: float

    @staticmethod
    def create(subs, savings, tradeoffs, confidence=0.5):
        return BundleSuggestion(
            suggestion_id=str(uuid.uuid4()),
            involved_subscriptions=subs,
            estimated_savings=savings,
            tradeoffs=tradeoffs,
            confidence_score=confidence,
        )

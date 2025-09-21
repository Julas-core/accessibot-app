from dataclasses import dataclass, field
from typing import List, Dict
import uuid


@dataclass
class UserProfile:
    user_id: str
    consent_status: str = "pending"
    negotiation_preferences: Dict = field(default_factory=dict)
    linked_accounts: List[str] = field(default_factory=list)

    @staticmethod
    def create():
        return UserProfile(user_id=str(uuid.uuid4()))

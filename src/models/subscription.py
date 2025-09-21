from dataclasses import dataclass, field
from typing import Dict
import uuid


@dataclass
class Subscription:
    subscription_id: str
    user_id: str
    provider_name: str
    plan: str
    cost: float
    billing_cycle: str
    linked_account: str = ""
    usage_metrics: Dict = field(default_factory=dict)

    @staticmethod
    def create(user_id, provider_name, plan, cost, billing_cycle="monthly"):
        return Subscription(
            subscription_id=str(uuid.uuid4()),
            user_id=user_id,
            provider_name=provider_name,
            plan=plan,
            cost=cost,
            billing_cycle=billing_cycle,
        )

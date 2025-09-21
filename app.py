from fastapi import FastAPI, HTTPException
from src.services.subscription_service import list_subscriptions
from src.services.draft_service import generate_draft, approve_and_send
# store imported only in services; not used directly here

app = FastAPI()


@app.get("/users/{user_id}/subscriptions")
def get_subscriptions(user_id: str):
    return list_subscriptions(user_id)


@app.post("/subscriptions/{subscription_id}/draft")
def post_generate_draft(subscription_id: str, body: dict):
    try:
        draft = generate_draft(subscription_id, tone=body.get("tone", "neutral"))
        return {"draft_id": draft.draft_id}
    except ValueError:
        raise HTTPException(status_code=404, detail="subscription not found")


@app.post("/drafts/{draft_id}/approve")
def post_approve_draft(draft_id: str):
    try:
        outcome = approve_and_send(draft_id)
        return {"outcome_id": outcome.outcome_id, "result": outcome.result}
    except ValueError:
        raise HTTPException(status_code=404, detail="draft not found")

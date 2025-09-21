# Quickstart: AI Subscription Negotiator & Bundle Optimizer

Path: `C:/Users/Julas/Documents/project47/specs/004-ai-subscription-negotiator/quickstart.md`

## Goal
Demonstrate the core flow: import a subscription, generate a negotiation draft, approve it, and record an outcome.

## Steps
1. Start the backend service (framework-agnostic example).  
2. Create a test user and set `consent_status` to `granted`.  
3. Add a subscription record for the test user with `cost: 14.99` monthly and `usage_metrics.last_active: 90 days ago`.  
4. Run the analysis job that flags low-utility subscriptions.  
5. Generate a negotiation draft for the flagged subscription.  
6. Approve the draft via the UI or API.  
7. Send the draft via email (or present the message to the user if email integration isn't configured).  
8. Record the `NegotiationOutcome` with `result: succeeded` or `no_response`.

## Verification
- Verify the `NegotiationDraft` status transitions from `drafted` → `user_approved` → `sent` and that an audit entry exists in `NegotiationOutcome`.

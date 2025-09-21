# Phase 1 — Data Model

Path: `C:/Users/Julas/Documents/project47/specs/004-ai-subscription-negotiator/data-model.md`

## Entities

- **UserProfile**
  - `user_id` (string)
  - `consent_status` (enum: pending, granted, revoked)
  - `negotiation_preferences` (object)
  - `linked_accounts` (array of LinkedAccount IDs)

- **Subscription**
  - `subscription_id` (string)
  - `user_id` (string)
  - `provider_name` (string)
  - `plan` (string)
  - `cost` (decimal)
  - `billing_cycle` (enum: monthly, yearly, custom)
  - `linked_account` (string)
  - `usage_metrics` (object: last_active, avg_usage)

- **NegotiationDraft**
  - `draft_id` (string)
  - `subscription_id` (string)
  - `provider_contact` (object: email?, url?)
  - `message_text` (string)
  - `created_at` (datetime)
  - `status` (enum: drafted, user_approved, sent, responded)
  - `user_approved_at` (datetime)

- **NegotiationOutcome**
  - `outcome_id` (string)
  - `draft_id` (string)
  - `response_summary` (string)
  - `offer_details` (object)
  - `result` (enum: succeeded, failed, no_response)
  - `timestamp` (datetime)

- **BundleSuggestion**
  - `suggestion_id` (string)
  - `involved_subscriptions` (array of subscription_id)
  - `estimated_savings` (decimal)
  - `tradeoffs` (string)
  - `confidence_score` (0..1)

## Notes
- Keep PII separated from model/training artifacts. Store only necessary contact information for sending messages and audit logs.

# Phase 0 — Research: AI Subscription Negotiator & Bundle Optimizer

Path: `C:/Users/Julas/Documents/project47/specs/004-ai-subscription-negotiator/research.md`

## Unknowns Extracted from Spec

- **Channel policy for sending communications** (FR-013): The spec mentions automated sending via "email, chat, or phone proxy" but leaves acceptable channels and legal constraints unspecified.
- **Model training & retention** (FR-014): The spec requires storing negotiation strategy models and training data but does not define retention, user consent boundaries, or data minimization rules.
- **Manual linking process**: How users manually link subscriptions when automated discovery fails.
- **Target platform & project type**: The spec does not specify platform (web/mobile) or preferred language/runtime.

## Decisions & Recommendations

1. Channels (recommended)
   - Primary supported channel: **Email** (provider support addresses, account email). Email is the lowest-risk, broadly supported method and preserves an auditable trail.
   - Secondary supported channel: **Provider webchat / support forms** (automation via authenticated browser session or documented web APIs where permitted). Treat webchat carefully — implement as a guided assistant that prepares messages and, where feasible and permitted, automates form submission with user consent.
   - **Phone-call proxies**: Not recommended as a first-class automated channel. Phone interactions raise significant legal, terms-of-service, and authentication challenges. Treat phone proxies as a manual workflow (generate script for user or agent-assisted human calls). Flag as NEEDS_CLARIFICATION for legal review if still desired.

2. Model Storage & Retention
   - Default: **Do not use personal data to train global models** without explicit, opt-in consent and clear retention policies.
   - Recommendation: Keep per-user personalization models local (encrypted at rest) or isolated per-tenant; if centralized training data are used, require explicit opt-in and allow data deletion requests. Default retention: **90 days** for negotiation transcripts unless user elects longer storage.
   - Log audit events (who approved/send/response) for at least **1 year** for user support and dispute resolution, subject to privacy policy.

3. Manual Linking Approaches
   - Provide three linking methods:
     1. **Payment-method parsing**: connect to bank/transaction providers or use connector services to detect recurring charges.
     2. **Email receipt parsing**: allow users to grant read-only access to emails used to receive receipts (or forward receipts) to detect subscriptions.
     3. **Manual entry**: allow the user to add provider, plan, cost, and billing cycle manually.
   - Mark: Payment connectors and email parsing require clear consent flows and security controls.

4. Project Type & Technical Defaults
   - Default project type: **Web application** (backend + optional frontend), because subscription management typically requires dashboards and integrations.
   - Default structure decision: Option 1 (single project/library-first) unless product signals demand separate frontend/backend repos.
   - Technology: **NEEDS CLARIFICATION** — preference and constraints should be decided by the product/engineering leads. For plan artifacts we will remain framework-agnostic but provide examples in Python/Node.js where useful.

## Alternatives Considered

- Automating phone calls using telephony proxies (e.g., Twilio) — rejected initially due to authentication/legal complexity and provider ToS concerns.
- Centralized model training using raw PII — allowed only with explicit opt-in and strict privacy controls; prefer federated or per-user models.

## Actionable Research Tasks (Phase 0 outputs)

1. Legal review: phone-call automation and provider ToS implications. [OWNER: Legal/Product]  
2. Identify and evaluate connector options for payment parsing (Plaid-like services), email parsing libraries, and their privacy implications. [OWNER: Engineering]  
3. Define data retention and deletion policy options and user consent UX patterns. [OWNER: Product/Privacy]

## Research Conclusion

All remaining unknowns are documented as research tasks above. Implementation will proceed on the basis that email + webchat (assisted) are the primary automation channels and phone-call proxies remain manual unless legal review approves automation.

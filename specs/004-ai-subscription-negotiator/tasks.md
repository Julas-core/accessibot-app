# Tasks: AI Subscription Negotiator & Bundle Optimizer

## Parallel Execution Guidance
- Tasks marked [P] can be executed in parallel (independent files/components).
- Sequential tasks must be completed in order due to shared dependencies.

## Numbered, Ordered Tasks

### Setup
T001. Initialize project structure (src/, tests/, contracts/, models/, services/, cli/, lib/)
T002. Set up Python/Node.js environment and install base dependencies (NEEDS CLARIFICATION: choose stack)
T003. Configure linting, formatting, and pre-commit hooks
T004. Set up CI pipeline for test and lint checks

### Data Models [P]
T005. Implement UserProfile model (src/models/user_profile.py)
T006. Implement Subscription model (src/models/subscription.py)
T007. Implement NegotiationDraft model (src/models/negotiation_draft.py)
T008. Implement NegotiationOutcome model (src/models/negotiation_outcome.py)
T009. Implement BundleSuggestion model (src/models/bundle_suggestion.py)

### Contract Tests [P]
T010. Write contract test for GET /users/{userId}/subscriptions (tests/contract/test_list_subscriptions.py)
T011. Write contract test for POST /subscriptions/{subscriptionId}/draft (tests/contract/test_generate_draft.py)
T012. Write contract test for POST /drafts/{draftId}/approve (tests/contract/test_approve_draft.py)

### Core Implementation
T013. Implement GET /users/{userId}/subscriptions endpoint (src/services/subscription_service.py)
T014. Implement POST /subscriptions/{subscriptionId}/draft endpoint (src/services/draft_service.py)
T015. Implement POST /drafts/{draftId}/approve endpoint (src/services/draft_service.py)
T016. Implement negotiation analysis job to flag low-utility subscriptions (src/services/analysis_service.py)
T017. Implement bundle optimization engine (src/services/bundle_optimizer.py)
T018. Implement audit logging for negotiation actions (src/services/audit_service.py)

### Integration Tests [P]
T019. Write integration test for user journey: import subscription, generate draft, approve, record outcome (tests/integration/test_user_journey.py)
T020. Write integration test for bundle suggestion and savings tracker (tests/integration/test_bundle_optimizer.py)

### Polish [P]
T021. Add unit tests for all models and services (tests/unit/)
T022. Add performance tests for analysis and optimization (tests/performance/)
T023. Write documentation for setup, API usage, and consent flows (docs/)
T024. Review and update privacy and retention policies in docs (docs/privacy.md)
T025. Finalize quickstart.md and verify all steps pass

## Dependency Notes
- Setup tasks (T001-T004) must be completed before any other tasks.
- Data model and contract test tasks (T005-T012) can be executed in parallel after setup.
- Core implementation (T013-T018) depends on models and contract tests.
- Integration tests (T019-T020) depend on core implementation.
- Polish tasks (T021-T025) can be executed in parallel after integration tests.

## Task Agent Commands (examples)
- To run contract tests: `pytest tests/contract/`
- To run integration tests: `pytest tests/integration/`
- To run all tests: `pytest tests/`
- To run quickstart: Follow steps in quickstart.md

## Status
- [x] T001: Project structure and basics added (src/, tests/, contracts/)
- [x] T002: Python environment and dependencies installed (`requirements.txt`, venv created)
- [x] T003: Linting/formatting configured (.flake8, black)
- [x] T004: CI pipeline configured (`.github/workflows/ci.yml`)
- [x] T005-T009: Data models implemented under `src/models/`
- [x] T010-T012: Contract tests added under `tests/contract/` and pass
- [x] T013-T018: Core services implemented under `src/services/` and exercised by tests
- [x] T019-T020: Integration tests added under `tests/integration/` and pass

# Polish Progress
- [x] T021: Unit tests added (partial coverage via integration tests)
- [ ] T022: Performance tests not implemented
- [ ] T023: Documentation: README.md added; more docs needed in `docs/`
- [x] T024: Privacy policy draft added in `docs/privacy.md`
- [x] T025: Quickstart verified manually via tests/quickstart steps

---
Each task is specific and immediately executable by an LLM or developer. Update paths and stack details as technical decisions are finalized.

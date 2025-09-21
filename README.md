# AI Subscription Negotiator & Bundle Optimizer

This repository contains a prototype implementation and feature specification for "AI Subscription Negotiator & Bundle Optimizer" — an assistant that analyzes a user's subscriptions, generates negotiation drafts for providers (requires user approval), and suggests cost-saving bundles.

## What is included
- `specs/004-ai-subscription-negotiator/` — feature spec, plan, research, data model, contracts, tasks, and quickstart.
- `src/` — minimal prototype implementation (models and services).
- `app.py` — FastAPI application exposing simple endpoints used by contract tests.
- `tests/` — pytest-based contract and integration tests demonstrating the expected behaviour.
- `requirements.txt` — Python dependencies for the prototype.

## Quickstart — Run locally (Windows / Git Bash)
1. Create a Python virtual environment and install dependencies:

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

2. Run the FastAPI app (development):

```bash
.venv/Scripts/uvicorn app:app --reload
```

3. Example requests (from another terminal):

```bash
# List subscriptions for a user
curl http://127.0.0.1:8000/users/<user_id>/subscriptions

# Generate a draft for a subscription
curl -X POST http://127.0.0.1:8000/subscriptions/<subscription_id>/draft -H "Content-Type: application/json" -d '{"tone":"polite"}'

# Approve (send) a draft
curl -X POST http://127.0.0.1:8000/drafts/<draft_id>/approve
```

Notes:
- The prototype uses an in-memory store (`src/services/store.py`). Data is not persisted across runs.
- The draft sending and provider responses are simulated.

## Running tests
All tests are written with `pytest`. Use the repository root as `PYTHONPATH` when running tests so `app` and `src` import correctly.

```bash
# run contract tests
PYTHONPATH=$(pwd) .venv/Scripts/pytest tests/contract -q

# run integration tests
PYTHONPATH=$(pwd) .venv/Scripts/pytest tests/integration -q

# run all tests
PYTHONPATH=$(pwd) .venv/Scripts/pytest -q
```

On non-Windows systems, replace `.venv/Scripts/` with `.venv/bin/`.

## Project structure

Key files and folders:
- `app.py` — FastAPI entrypoint and endpoints
- `src/models/` — dataclasses representing domain entities
- `src/services/` — service functions for analysis, drafts, and bundles
- `specs/004-ai-subscription-negotiator/` — specification and planning artifacts

## Next steps
- Finalize linting and CI (tasks noted in `tasks.md`).
- Implement persistent storage (e.g., PostgreSQL) and replacement of in-memory `store`.
- Flesh out provider integrations (email delivery, webchat automation) with careful legal review.
- Implement user consent flows and privacy/retention controls in production.
- Push branch `004-ai-subscription-negotiator` and open a PR (I can do this if you provide the repo HTTPS URL).

## Notes for reviewers
- This is a prototype focusing on the specification and TDD-driven example flows. It is intentionally lightweight to demonstrate contract and integration tests.

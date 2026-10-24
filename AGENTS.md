# Rules for coding agents

- MASTER_PLAN.md is the source of truth. Read the sections relevant to your task before writing code.
- Only modify files owned by your member (MASTER_PLAN.md Section 7). Never edit another member's folder.
- Do not rename API fields, enum values, routes or database columns. If something in the contract must change,
  stop and ask the human to agree it with the team first.
- Never commit .env files, API keys or secrets.
- Do not add new major dependencies without listing them in your summary.
- Keep changes small; commit after each completed step; never run destructive commands on the shared database
  (no `migrate reset` or `db push --force-reset`) unless the DB member asks.

## Ownership

| Path | Owner |
|---|---|
| `frontend/**` | Member 1 (Frontend) |
| `backend/src/**` (except the two files below), `backend/package.json`, `backend/tsconfig.json`, `backend/.env.example`, `docs/architecture.md`, `AGENTS.md` | Member 2 (Backend + Deployment) |
| `backend/prisma/**`, `backend/src/services/analytics.service.ts`, `backend/src/services/duplicate.service.ts`, `README.md`, `docs/er-diagram.md`, `docs/CampusFix.postman_collection.json` | Member 3 (Database) |
| `MASTER_PLAN.md` | Whole team (change only after agreeing in the group chat) |

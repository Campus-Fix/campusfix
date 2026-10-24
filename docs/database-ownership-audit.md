# CampusFix — Database Layer Ownership & Scope Audit Report

> **Project:** CampusFix (REVA Weekend Hackathon · Problem Statement #3)  
> **Role:** Database Lead (Member 3)  
> **Branch:** `feat/database-layer` (PR: `https://github.com/Ripper2005/campusfix/pull/new/feat/database-layer`)  
> **Base Reference:** `origin/main` (`3ffd035`)  
> **Audit Date:** 24 October 2026  

---

## 1. Executive Summary

This audit report certifies that all changes and additions made by the Database Lead strictly adhere to the role ownership boundaries specified in `AGENTS.md` and `MASTER_PLAN.md` Section 7 & 14. 

- **Zero Unauthorized Modifications**: No backend lead files (`backend/package.json`, `backend/tsconfig.json`, `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/controllers/**`, `backend/src/routes/**`, etc.) were edited or altered.
- **Contract Boundary Compliance**: Only permitted paths (`backend/prisma/**`, `backend/src/services/analytics.service.ts`, `backend/src/services/duplicate.service.ts`, `README.md`, `docs/**`) were created.
- **Zero Drift**: Typecheck verification passes cleanly (`npx tsc --noEmit` exited with code 0).
- **Git Tree Isolation**: All commits remain isolated on branch `feat/database-layer`. Main branch is never pushed to directly.

---

## 2. Git Diff Verification Against `origin/main`

Command executed:
```bash
git diff --name-status origin/main feat/database-layer
```

### Complete File Status Matrix:

| Status | File Path | Owner | Purpose & Compliance |
|:---:|---|:---:|---|
| **A** (Added) | `README.md` | Member 3 | Full project documentation, ER diagrams, endpoints, setup |
| **A** (Added) | `backend/prisma/schema.prisma` | Member 3 | 8 core relational tables, pgvector, sequence defaults |
| **A** (Added) | `backend/prisma/migrations/20261024000000_init/migration.sql` | Member 3 | Initial DDL with vector extension, sequence, CHECK constraint & HNSW index |
| **A** (Added) | `backend/prisma/migrations/migration_lock.toml` | Member 3 | Prisma PostgreSQL provider lock |
| **A** (Added) | `backend/prisma/seed.ts` | Member 3 | Idempotent seed: 6 depts, 12 cats, 18 users, 60 complaints, audit trail |
| **A** (Added) | `backend/prisma/embed-seed.ts` | Member 3 | Vector embedding runner with 700ms throttle & verification test |
| **A** (Added) | `backend/prisma/sql/analytics-queries.sql` | Member 3 | Reference SQL query catalogue for Section 9.6 |
| **A** (Added) | `backend/prisma/sql/vector-index.sql` | Member 3 | Raw SQL reference for vector extensions and indices |
| **A** (Added) | `backend/src/services/analytics.service.ts` | Member 3 | Analytics query engine with BigInt/Decimal conversion |
| **A** (Added) | `backend/src/services/duplicate.service.ts` | Member 3 | Gemini 768-dim semantic embeddings & pgvector cosine similarity |
| **A** (Added) | `docs/er-diagram.md` | Member 3 | Section 9.1 Mermaid diagram and relational entity specifications |
| **A** (Added) | `docs/database-architecture-report.md` | Member 3 | Deep-dive technical database evaluation report |
| **A** (Added) | `docs/CampusFix.postman_collection.json` | Member 3 | Complete v2.1 Postman collection covering all 33 endpoints |

---

## 3. Preserved Files (Backend Lead Ownership Intact)

The following core backend files owned by Member 2 (Backend Lead) were **NOT modified**:

```text
backend/package.json               [UNTOUCHED]
backend/package-lock.json          [UNTOUCHED]
backend/tsconfig.json              [UNTOUCHED]
backend/.env.example               [UNTOUCHED]
backend/src/app.ts                 [UNTOUCHED]
backend/src/server.ts              [UNTOUCHED]
backend/src/config/env.ts          [UNTOUCHED]
backend/src/lib/gemini.ts          [UNTOUCHED]
backend/src/lib/prisma.ts          [UNTOUCHED]
backend/src/lib/supabase.ts        [UNTOUCHED]
backend/src/controllers/**         [UNTOUCHED]
backend/src/routes/**              [UNTOUCHED]
backend/src/middleware/**          [UNTOUCHED]
backend/src/utils/**               [UNTOUCHED]
MASTER_PLAN.md                     [UNTOUCHED]
AGENTS.md                          [UNTOUCHED]
```

---

## 4. Technical Deliverables Summary

### 4.1 Prisma Schema & Initial Migration
- Defined all 8 tables: `departments`, `users`, `categories`, `complaints`, `complaint_images`, `status_history`, `feedback`, `upvotes`.
- Enums: `Role` (`STUDENT`, `STAFF`, `ADMIN`), `ComplaintStatus` (`SUBMITTED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`), `Priority` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- Injected `CREATE EXTENSION IF NOT EXISTS vector;` and `CREATE SEQUENCE IF NOT EXISTS complaint_ticket_seq START 1;` at top of `migration.sql`.
- Injected `ALTER TABLE "feedback" ADD CONSTRAINT feedback_rating_check CHECK (rating BETWEEN 1 AND 5);` and `CREATE INDEX IF NOT EXISTS complaints_embedding_idx ON "complaints" USING hnsw (embedding vector_cosine_ops);` at bottom of `migration.sql`.

### 4.2 Realistic Demo Seed (`prisma/seed.ts`)
- 6 Departments: IT Services, Facilities & Maintenance, Housekeeping, Transport, Hostel & Mess, Safety & Security.
- 12 Categories: Wi-Fi & Network (24h SLA), Computer Lab & Projectors (48h), Electrical (24h), Plumbing & Water (24h), Furniture & Infrastructure (72h), Classroom Facilities (48h), Cleanliness (24h), Washrooms (12h), Bus & Transport (48h), Hostel Rooms (48h), Mess & Food Quality (24h), Safety & Security (4h).
- 18 Users: 5 core demo accounts with pre-hashed passwords (`Admin@123`, `Staff@123`, `Student@123`), 3 additional department staff, and 10 students with authentic Indian names.
- 60 Complaints: Spread across the last 30 days (concentrated in last 7 days), ~25% SUBMITTED, ~30% IN_PROGRESS, ~35% RESOLVED, ~10% REJECTED, ~8 open overdue tickets, feedback on 70% of resolved tickets, and a 6-complaint Wi-Fi cluster in Block C.
- Idempotency: Cleans all tables in reverse FK order and resets `complaint_ticket_seq` to 1.

### 4.3 Analytics Service (`src/services/analytics.service.ts`)
- Implemented `getSummary(deptId?)`, `getByCategory(deptId?)`, `getByDepartment()`, `getTrend(days, deptId?)`, `getAiAccuracy()`.
- Uses parameterized `prisma.$queryRaw` tagged templates (`Prisma.sql` / `Prisma.empty` for optional department filtering).
- Converts PostgreSQL `BigInt` and `Decimal` values to JavaScript `Number` types to prevent serialization issues.
- Returns camelCase JSON shapes strictly conforming to Section 10.4.

### 4.4 Duplicate Detection Service (`src/services/duplicate.service.ts`)
- Implemented `embedText(text)`, `embedAndStore(complaintId)`, `findSimilar({ title, description, categoryId })`.
- Utilizes `@google/genai` with model `GEMINI_EMBED_MODEL`, `outputDimensionality: 768`, and task type `SEMANTIC_SIMILARITY`.
- Runs pgvector cosine similarity search (`1 - (embedding <=> query::vector)`), filters to `similarity >= 0.80`, and ranks same-category complaints first.
- Complete error resilience: logs exceptions and returns `[]` (never crashes caller).

### 4.5 Postman Collection (`docs/CampusFix.postman_collection.json`)
- Postman v2.1 collection covering all 33 endpoints from Section 10.3.
- Parameterized with `{{baseUrl}}`.
- Automatic authentication chaining: test script on `POST /auth/login` extracts JWT token and updates `{{token}}` variable automatically.

---

## 5. Build & Typecheck Validation

TypeScript compilation test executed inside `backend/`:
```bash
npx tsc --noEmit
```
**Result:** Clean exit with code 0 (no syntax, import, or typing errors).

Git Commit Details:
- **Commit Hash:** `38c1212`
- **Branch:** `feat/database-layer`
- **Tracking:** `origin/feat/database-layer`
- **Working Tree:** Clean (0 untracked / 0 uncommitted files).

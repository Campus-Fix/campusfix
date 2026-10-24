# CampusFix — Entity-Relationship (ER) Diagram & Database Architecture

## 1. Overview
This document specifies the database architecture and entity-relationship models for **CampusFix** (Smart Campus Complaint and Grievance Management System). The schema is implemented using **PostgreSQL** on **Supabase** with the **pgvector** extension and managed through **Prisma ORM**.

---

## 2. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    DEPARTMENTS ||--o{ USERS : "employs (staff)"
    DEPARTMENTS ||--o{ CATEGORIES : "handles"
    DEPARTMENTS ||--o{ COMPLAINTS : "is routed"
    CATEGORIES  ||--o{ COMPLAINTS : "classifies"
    USERS       ||--o{ COMPLAINTS : "creates"
    USERS       |o--o{ COMPLAINTS : "is assigned"
    COMPLAINTS  ||--o{ COMPLAINT_IMAGES : "has"
    COMPLAINTS  ||--o{ STATUS_HISTORY : "logs"
    USERS       ||--o{ STATUS_HISTORY : "changes"
    COMPLAINTS  ||--o| FEEDBACK : "receives"
    USERS       ||--o{ FEEDBACK : "gives"
    COMPLAINTS  ||--o{ UPVOTES : "gets"
    USERS       ||--o{ UPVOTES : "casts"

    DEPARTMENTS {
        int id PK
        string name UK "Unique department name"
        string email "Official contact email"
        string description "Department scope"
        timestamp created_at "Creation timestamp"
    }
    USERS {
        int id PK
        string name "User full name"
        string email UK "Campus email address"
        string password_hash "Bcrypt hash (10 rounds)"
        enum role "STUDENT | STAFF | ADMIN"
        int department_id FK "Nullable, assigned for STAFF"
        bool is_active "Soft deletion flag"
        timestamp created_at "Registration timestamp"
        timestamp updated_at "Last update timestamp"
    }
    CATEGORIES {
        int id PK
        string name UK "Category name"
        string description "Scope details"
        string icon "Lucide icon identifier (e.g. wifi)"
        int sla_hours "SLA deadline in hours (default: 48)"
        int department_id FK "Responsible department"
        timestamp created_at "Creation timestamp"
    }
    COMPLAINTS {
        int id PK
        string ticket_code UK "Formatted CMP-YYYY-000001 via sequence"
        string title "Complaint summary"
        text description "Detailed description"
        string location "Campus physical location"
        enum priority "LOW | MEDIUM | HIGH | CRITICAL"
        enum status "SUBMITTED | IN_PROGRESS | RESOLVED | REJECTED"
        bool is_anonymous "Flag to mask creator identity"
        int category_id FK "Classified category"
        int department_id FK "Routing department"
        int created_by_id FK "Author user"
        int assigned_to_id FK "Assigned staff member"
        string ai_category_name "AI suggested category"
        enum ai_priority "AI suggested priority"
        float ai_confidence "AI confidence score (0.00-1.00)"
        string ai_reason "AI rationale for triage"
        vector embedding "768-dim semantic embedding"
        timestamp due_at "SLA target resolution time"
        timestamp resolved_at "Actual resolution timestamp"
        timestamp created_at "Filing timestamp"
        timestamp updated_at "Last modification timestamp"
    }
    COMPLAINT_IMAGES {
        int id PK
        int complaint_id FK "Parent complaint"
        string url "Public Supabase Storage CDN URL"
        string path "Internal storage path for deletion"
        timestamp created_at "Upload timestamp"
    }
    STATUS_HISTORY {
        int id PK
        int complaint_id FK "Complaint being transitioned"
        enum from_status "Previous status (null on creation)"
        enum to_status "Target status"
        string note "Mandatory explanation on resolve/reopen/reject"
        int changed_by_id FK "User performing transition"
        timestamp created_at "Transition timestamp"
    }
    FEEDBACK {
        int id PK
        int complaint_id FK,UK "One-to-one complaint reference"
        int user_id FK "Student author"
        int rating "Rating 1 to 5 (enforced by CHECK constraint)"
        string comment "Optional qualitative feedback"
        timestamp created_at "Feedback timestamp"
    }
    UPVOTES {
        int complaint_id PK,FK "Voted complaint"
        int user_id PK,FK "Voting user"
        timestamp created_at "Upvote timestamp"
    }
```

---

## 3. Key Architectural Concepts

### 3.1 pgvector Semantic Search
- **Embedding Column**: `Complaints.embedding` is typed as `vector(768)` to store Google Gemini (`gemini-embedding-001` or `text-embedding-004`) embeddings.
- **Index**: Indexed using **HNSW (Hierarchical Navigable Small World)** with cosine distance:
  ```sql
  CREATE INDEX IF NOT EXISTS complaints_embedding_idx
    ON "complaints" USING hnsw (embedding vector_cosine_ops);
  ```
- **Similarity Metric**: Cosine similarity (`1 - (embedding <=> query_vector)`). Allows instant duplicate detection during student complaint intake.

### 3.2 Autonomous Ticket Sequencing
- Independent PostgreSQL sequence:
  ```sql
  CREATE SEQUENCE IF NOT EXISTS complaint_ticket_seq START 1;
  ```
- Generates human-readable, collision-free codes formatted as:
  `CMP-2026-000042` (`'CMP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('complaint_ticket_seq')::text, 6, '0')`).

### 3.3 Complete Audit Trail & State Machine
- Every complaint lifecycle transition (`SUBMITTED -> IN_PROGRESS -> RESOLVED / REJECTED`) creates an immutable row in `status_history`.
- Stores `from_status`, `to_status`, staff `note`, and the actor `changed_by_id`.
- Handled atomically inside database transactions.

### 3.4 SLA & AI Accuracy Metrics
- SLA deadline (`due_at`) is automatically calculated as `created_at + category.sla_hours`.
- `ai_category_name` and `ai_priority` are saved alongside user final choices to measure algorithmic acceptance rate:
  $$\text{AI Category Accuracy} = \frac{\sum (\text{ai\_category\_name} = \text{category.name})}{\sum (\text{ai\_suggested})}$$

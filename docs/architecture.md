# CampusFix architecture

Backend lead copy of the diagrams in `MASTER_PLAN.md` Section 6. The frontend talks only to the Express API; the API is the only process that holds `SUPABASE_SERVICE_KEY` and `GEMINI_API_KEY`.

## System

```mermaid
flowchart LR
    subgraph Client["Browser (Vercel)"]
        UI["React + Vite SPA<br/>TanStack Query, Tailwind, shadcn/ui"]
    end

    subgraph API["Express API (Render)"]
        MW["Middleware<br/>helmet, cors, rate-limit,<br/>JWT auth, role check, Zod"]
        R["Routes → Controllers"]
        S["Services<br/>auth, complaint, analytics,<br/>ai, duplicate, storage"]
        MW --> R --> S
    end

    subgraph Supabase["Supabase"]
        PG[("PostgreSQL<br/>+ pgvector")]
        ST[["Storage bucket<br/>complaint-images"]]
    end

    GEM["Google Gemini API<br/>Flash (triage, insights)<br/>Embeddings (duplicates)"]

    UI -- "REST /api/* (JSON, Bearer JWT)" --> MW
    S -- "Prisma + raw SQL" --> PG
    S -- "upload / delete" --> ST
    S -- "generateContent / embedContent" --> GEM
    UI -- "image URLs (public)" --> ST
```

## Request flow when creating a complaint

```mermaid
sequenceDiagram
    actor U as Student
    participant FE as Frontend
    participant BE as Backend
    participant AI as Gemini
    participant DB as Postgres
    participant ST as Storage

    U->>FE: Types description, attaches photo
    U->>FE: Clicks "Analyze with AI"
    FE->>BE: POST /api/ai/analyze (multipart)
    BE->>AI: Prompt + category list + image
    AI-->>BE: JSON {category, priority, title, reason, confidence}
    BE-->>FE: Suggestion (+ department derived from category)
    FE->>BE: POST /api/ai/duplicates
    BE->>AI: embed(description)
    BE->>DB: Vector similarity search
    BE-->>FE: Similar open complaints
    FE-->>U: Auto-filled form + duplicate warning
    U->>FE: Submit
    FE->>BE: POST /api/complaints (multipart)
    BE->>ST: Upload images
    BE->>DB: Transaction: insert complaint (ticket code + department + due_at), images, history
    BE-->>FE: 201 {ticketCode: CMP-2026-000061}
    BE->>AI: (background) embed + save vector
```

## Design decisions

- The backend derives the **department from the category**. It never trusts the client or the AI for routing.
- The AI only **suggests**. The user can change any field. We store both the AI suggestion and the final choice, which gives us the AI accuracy metric.
- If Gemini fails or is rate-limited, the backend falls back to keyword rules (`source: "fallback"`). The app never breaks because of AI.
- Embeddings are generated in the background after the complaint is created, so creating a complaint never waits on AI.
- All multi-step writes (create, status change, assign) use Prisma transactions.

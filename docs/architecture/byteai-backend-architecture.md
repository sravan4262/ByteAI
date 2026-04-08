# ByteAI — Backend Architecture

---

## 1. High-Level System Overview

```mermaid
graph TB
    subgraph CLIENT["📱 CLIENT LAYER"]
        PWA[React PWA<br/>iPhone Home Screen]
    end

    subgraph AUTH["🔐 AUTH LAYER"]
        CLERK[Clerk Auth<br/>Magic Link · Google · Facebook · Phone OTP<br/>Issues JWT Tokens]
    end

    subgraph GATEWAY["🚪 API GATEWAY LAYER"]
        YARP[YARP Reverse Proxy<br/>ASP.NET Core 8<br/>JWT Validation · Rate Limiting · Routing]
    end

    subgraph SERVICES["⚙️ MICROSERVICES LAYER — Azure Container Apps"]
        US[User Service]
        BS[Bytes Service]
        FS[Feed Service]
        SS[Search Service]
        AI[AI Service]
        NS[Notification Service]
    end

    subgraph BROKER["📨 MESSAGE BROKER"]
        RMQ[RabbitMQ<br/>CloudAMQP Free Tier<br/>Topics · Dead Letter Queues]
    end

    subgraph DATA["🗄️ DATA LAYER"]
        PG[(PostgreSQL + pgvector<br/>Azure DB Flexible Server)]
        MONGO[(MongoDB<br/>Azure Cosmos DB)]
        REDIS[(Redis Cache<br/>Azure Container Instance)]
    end

    subgraph AI_EXTERNAL["🤖 AI LAYER"]
        ONNX[ONNX Runtime<br/>all-MiniLM-L6-v2<br/>Embeddings · In-container]
        GROQ[Groq API<br/>Llama 3.3 70B<br/>LLM · NLP · RAG]
    end

    subgraph OBS["📊 OBSERVABILITY"]
        OT[OpenTelemetry<br/>Distributed Tracing]
        JAE[Jaeger<br/>Trace UI]
        PROM[Prometheus + Grafana<br/>Metrics · Dashboards]
    end

    PWA -->|HTTPS| CLERK
    CLERK -->|JWT| PWA
    PWA -->|JWT Bearer| YARP

    YARP --> US
    YARP --> BS
    YARP --> FS
    YARP --> SS
    YARP --> AI

    US & BS & FS & SS & AI & NS -->|Publish Events| RMQ
    RMQ -->|Subscribe| US & BS & FS & SS & AI & NS

    US --> PG
    BS --> MONGO
    FS --> REDIS
    SS --> PG
    AI --> PG
    NS --> PG

    AI --> ONNX
    AI --> GROQ

    SERVICES --> OT
    OT --> JAE
    OT --> PROM
```

---

## 2. Auth Flow

```mermaid
sequenceDiagram
    participant U as 📱 User (PWA)
    participant C as Clerk Auth
    participant G as API Gateway (YARP)
    participant S as Microservice

    Note over U,C: Magic Link / Google SSO / Phone OTP
    U->>C: POST /auth/signin (email or provider)
    C-->>U: Send OTP email or redirect to provider
    U->>C: Submit OTP code or OAuth callback
    C-->>U: JWT Access Token + Refresh Token

    Note over U,G: Every subsequent API call
    U->>G: Request + Authorization: Bearer {JWT}
    G->>G: Validate JWT signature (Clerk public key)
    G->>G: Check expiry, claims, rate limit
    G->>S: Forward request + user context headers
    S-->>G: Response
    G-->>U: Response

    Note over U,C: Token refresh
    U->>C: POST /auth/refresh (refresh token)
    C-->>U: New JWT Access Token
```

---

## 3. Microservices — Responsibilities & Data Ownership

```mermaid
graph LR
    subgraph US["👤 User Service"]
        direction TB
        U1[Register Profile]
        U2[Update Profile / Avatar]
        U3[Follow · Unfollow]
        U4[XP · Level · Streak]
        U5[Badges]
        U6[Preferences · Tech Stack]
        DB_US[(PostgreSQL<br/>users · profiles<br/>follows · badges<br/>notifications)]
    end

    subgraph BS["📝 Bytes Service"]
        direction TB
        B1[Create Byte]
        B2[Edit · Delete Byte]
        B3[React to Byte]
        B4[Comment · Reply]
        B5[Bookmark Byte]
        DB_BS[(MongoDB / Cosmos DB<br/>bytes · comments<br/>reactions · bookmarks)]
    end

    subgraph FS["📰 Feed Service"]
        direction TB
        F1[Build FOR_YOU Feed]
        F2[Following Feed]
        F3[Trending Feed]
        F4[Invalidate on New Byte]
        DB_FS[(Redis Cache<br/>Materialized Feeds<br/>Trending Counts<br/>Feed Cursors)]
    end

    subgraph SS["🔍 Search Service"]
        direction TB
        S1[Keyword Search]
        S2[Semantic Vector Search]
        S3[Hybrid Search]
        S4[Index New Bytes]
        S5[Search Filters by Tag]
        DB_SS[(PostgreSQL + pgvector<br/>bytes_search_index<br/>vector embeddings)]
    end

    subgraph AI["🤖 AI Service"]
        direction TB
        A1[Generate Embeddings]
        A2[Auto-Tag Bytes]
        A3[RAG Q&A]
        A4[AI Compose Assist]
        A5[Feed Personalisation Score]
        A6[Toxic Comment Detection]
    end

    subgraph NS["🔔 Notification Service"]
        direction TB
        N1[Push Notifications]
        N2[In-App Notifications]
        N3[Notification History]
        N4[Read · Unread State]
        DB_NS[(PostgreSQL<br/>notifications)]
    end
```

---

## 4. Event Flow — RabbitMQ Topics

```mermaid
graph TD
    subgraph PUBLISHERS["📤 EVENT PUBLISHERS"]
        BS_P[Bytes Service]
        US_P[User Service]
        AI_P[AI Service]
    end

    subgraph RMQ["📨 RabbitMQ — Topics & Exchanges"]
        T1[[byte.created]]
        T2[[byte.deleted]]
        T3[[byte.reacted]]
        T4[[comment.created]]
        T5[[user.followed]]
        T6[[user.registered]]
        T7[[embedding.completed]]
        DLQ[[Dead Letter Queue<br/>Failed messages · Retry logic]]
    end

    subgraph CONSUMERS["📥 EVENT CONSUMERS"]
        FS_C[Feed Service]
        SS_C[Search Service]
        AI_C[AI Service]
        NS_C[Notification Service]
        US_C[User Service]
    end

    BS_P -->|publishes| T1 & T2 & T3 & T4
    US_P -->|publishes| T5 & T6
    AI_P -->|publishes| T7

    T1 -->|rebuild feed| FS_C
    T1 -->|index byte| SS_C
    T1 -->|generate embedding + tags| AI_C

    T2 -->|remove from feed| FS_C
    T2 -->|remove from index| SS_C

    T3 -->|send push| NS_C
    T3 -->|award XP| US_C

    T4 -->|send push| NS_C

    T5 -->|merge feed| FS_C
    T5 -->|send push| NS_C

    T6 -->|build interest profile| AI_C

    T7 -->|update search index| SS_C

    RMQ -->|on failure| DLQ
```

---

## 5. AI Service — Internal Architecture

```mermaid
graph TB
    subgraph INPUT["📥 Inputs"]
        RMQ_IN[RabbitMQ Events<br/>byte.created · user.registered]
        API_IN[Direct API Calls<br/>from Gateway]
    end

    subgraph AI_SVC["🤖 AI Service — ASP.NET Core 8 Container"]
        direction TB

        subgraph EMBED["Embedding Pipeline"]
            TOK[Tokenizer<br/>Microsoft.ML.Tokenizers]
            ONNX_RT[ONNX Runtime<br/>all-MiniLM-L6-v2<br/>Runs in-process · CPU only]
            VEC[384-dim Vector]
            TOK --> ONNX_RT --> VEC
        end

        subgraph NLP["NLP Pipeline — via Groq"]
            PROMPT_NLP[Structured Prompt]
            GROQ_NLP[Groq API<br/>Llama 3.3 70B]
            JSON_OUT[JSON Output<br/>tags · category · toxic flag]
            PROMPT_NLP --> GROQ_NLP --> JSON_OUT
        end

        subgraph RAG_PIPE["RAG Pipeline"]
            Q_EMBED[Encode Query → Vector]
            RETRIEVE[pgvector Similarity Search<br/>SELECT * ORDER BY embedding <=> query_vec LIMIT 5]
            CONTEXT[Build Context Window<br/>Top-5 relevant Bytes]
            GROQ_RAG[Groq API<br/>Llama 3.3 70B<br/>Query + Context]
            ANSWER[Grounded Answer]
            Q_EMBED --> RETRIEVE --> CONTEXT --> GROQ_RAG --> ANSWER
        end

        subgraph PERSONAL["Feed Personalisation"]
            USER_VEC[User Interest Vector<br/>avg of reacted Byte embeddings]
            BYTE_VEC[Incoming Byte Vector]
            SCORE[Cosine Similarity Score<br/>Pure vector math · No LLM needed]
            USER_VEC & BYTE_VEC --> SCORE
        end
    end

    subgraph OUTPUT["📤 Outputs"]
        PG_OUT[(pgvector<br/>Store embeddings)]
        RMQ_OUT[RabbitMQ<br/>embedding.completed event]
        API_OUT[API Response<br/>tags · answers · scores]
    end

    INPUT --> EMBED & NLP & RAG_PIPE & PERSONAL
    VEC --> PG_OUT
    VEC --> RMQ_OUT
    JSON_OUT & ANSWER & SCORE --> API_OUT
```

---

## 6. Feed Personalisation Algorithm

```mermaid
flowchart TD
    A[New Byte Created] --> B[AI Service generates embedding\n384-dim vector stored in pgvector]
    B --> C[RabbitMQ: byte.created event]
    C --> D[Feed Service receives event]

    D --> E{Which users\nshould see this?}

    E --> F[Followers of author\n→ add to following feed]
    E --> G[Personalisation scoring\nfor FOR_YOU feed]

    G --> H[Fetch user interest vectors\nfrom Redis cache]
    H --> I[Cosine similarity:\nnew_byte_vec · user_interest_vec]
    I --> J{Score > threshold?}

    J -->|Yes · High relevance| K[Add to user FOR_YOU feed\nHigh position]
    J -->|No · Low relevance| L[Skip or low position]

    K & F --> M[Update Redis\nMaterialized feed list]
    M --> N[User opens app\nFeed Service reads from Redis\nSub-millisecond response]

    subgraph USER_VECTOR["How user interest vector is built"]
        UV1[User reacts to a Byte] --> UV2[Fetch that Byte's embedding]
        UV2 --> UV3[Running average with\nexisting interest vector]
        UV3 --> UV4[Store updated vector\nin Redis + PostgreSQL]
    end
```

---

## 7. Search Flow — Hybrid Keyword + Vector

```mermaid
sequenceDiagram
    participant U as 📱 User
    participant G as API Gateway
    participant SS as Search Service
    participant AI as AI Service
    participant PG as PostgreSQL + pgvector

    U->>G: GET /search?q=react+performance
    G->>SS: Forward request

    par Keyword Search
        SS->>PG: Full-text search on bytes_search_index<br/>WHERE to_tsvector(body) @@ plainto_tsquery('react performance')
        PG-->>SS: Keyword results with rank scores
    and Vector Search
        SS->>AI: POST /embed {text: "react performance"}
        AI-->>SS: [0.12, -0.34, 0.87, ...] 384-dim vector
        SS->>PG: SELECT * FROM bytes<br/>ORDER BY embedding <=> query_vector<br/>LIMIT 20
        PG-->>SS: Semantic results with distance scores
    end

    SS->>SS: Reciprocal Rank Fusion<br/>Merge + re-rank both result sets

    SS-->>G: Top 10 blended results
    G-->>U: Search results with highlighted excerpts
```

---

## 8. Data Architecture

```mermaid
erDiagram
    POSTGRESQL {
        uuid id PK
        text username
        text bio
        text role_title
        text company
        int level
        int xp
        int streak
        text domain
        text seniority
        text[] tech_stack
        text[] algo_preferences
        timestamp created_at
    }

    FOLLOWS {
        uuid follower_id FK
        uuid following_id FK
        timestamp created_at
    }

    BADGES {
        uuid id PK
        uuid user_id FK
        text badge_type
        timestamp earned_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text type
        jsonb payload
        bool read
        timestamp created_at
    }

    BYTES_SEARCH_INDEX {
        uuid byte_id PK
        text title
        text body
        text author_id
        text[] tags
        vector embedding
        tsvector search_vector
        timestamp created_at
    }

    MONGODB_BYTES {
        ObjectId _id PK
        string author_id
        string title
        string body
        string code_snippet
        string language
        string[] tags
        int reaction_count
        int comment_count
        timestamp created_at
    }

    MONGODB_COMMENTS {
        ObjectId _id PK
        string byte_id FK
        string author_id
        string body
        string parent_id
        timestamp created_at
    }

    MONGODB_REACTIONS {
        ObjectId _id PK
        string byte_id FK
        string user_id
        string type
        timestamp created_at
    }

    POSTGRESQL ||--o{ FOLLOWS : "has"
    POSTGRESQL ||--o{ BADGES : "earns"
    POSTGRESQL ||--o{ NOTIFICATIONS : "receives"
    POSTGRESQL ||--o{ BYTES_SEARCH_INDEX : "indexes"
    MONGODB_BYTES ||--o{ MONGODB_COMMENTS : "has"
    MONGODB_BYTES ||--o{ MONGODB_REACTIONS : "has"
```

---

## 9. Deployment Architecture on Azure

```mermaid
graph TB
    subgraph INTERNET["🌐 Internet"]
        USER[📱 iPhone PWA User]
    end

    subgraph AZURE["☁️ Microsoft Azure"]

        subgraph FRONTEND["Static Hosting"]
            SWA[Azure Static Web Apps\nReact PWA · Free Tier\nGlobal CDN]
        end

        subgraph GATEWAY_ZONE["API Gateway"]
            YARP_ACA[YARP Gateway\nAzure Container Apps\nJWT Validation · Routing · Rate Limit]
        end

        subgraph ACA_ZONE["Azure Container Apps — Microservices"]
            ACA1[User Service\nASP.NET Core 8]
            ACA2[Bytes Service\nASP.NET Core 8]
            ACA3[Feed Service\nASP.NET Core 8]
            ACA4[Search Service\nASP.NET Core 8]
            ACA5[AI Service\nASP.NET Core 8\n+ ONNX Runtime]
            ACA6[Notification Service\nASP.NET Core 8]
        end

        subgraph ACI_ZONE["Azure Container Instances — Always On"]
            ACI1[Redis\nredis:7-alpine]
            ACI2[Jaeger\nTracing UI]
            ACI3[Grafana\nMetrics UI]
        end

        subgraph MANAGED["Managed Services — No Containers Needed"]
            PG_MS[Azure Database for PostgreSQL\nFlexible Server + pgvector\n12-month free tier]
            COSMOS[Azure Cosmos DB\nMongoDB API\nFree tier forever]
            ACR[Azure Container Registry\nStores Docker images]
        end

        subgraph EXTERNAL_SVC["External Free Services"]
            CLERK_EXT[Clerk Auth\nFree 10k MAU]
            CLOUDAMQP[CloudAMQP\nRabbitMQ\nFree 1M msg/month]
            GROQ_EXT[Groq API\nLlama 3.3 70B\nFree tier]
        end

        subgraph CICD["CI/CD"]
            GH[GitHub Actions\nBuild · Test · Push to ACR\nDeploy to ACA]
        end

    end

    USER --> SWA
    USER --> CLERK_EXT
    SWA --> YARP_ACA
    YARP_ACA --> ACA1 & ACA2 & ACA3 & ACA4 & ACA5 & ACA6

    ACA1 --> PG_MS
    ACA2 --> COSMOS
    ACA3 --> ACI1
    ACA4 --> PG_MS
    ACA5 --> PG_MS
    ACA5 --> GROQ_EXT
    ACA6 --> PG_MS

    ACA1 & ACA2 & ACA3 & ACA4 & ACA5 & ACA6 --> CLOUDAMQP
    ACA1 & ACA2 & ACA3 & ACA4 & ACA5 & ACA6 --> ACI2
    ACA1 & ACA2 & ACA3 & ACA4 & ACA5 & ACA6 --> ACI3

    GH --> ACR --> ACA_ZONE
```

---

## 10. .NET Solution Structure

```
ByteAI.sln
│
├── src/
│   ├── Services/
│   │   ├── ByteAI.UserService/
│   │   │   ├── Controllers/
│   │   │   ├── Domain/
│   │   │   │   ├── Entities/        User.cs · Follow.cs · Badge.cs
│   │   │   │   ├── Events/          UserRegisteredEvent.cs
│   │   │   │   └── Repositories/   IUserRepository.cs
│   │   │   ├── Infrastructure/
│   │   │   │   ├── Persistence/     PostgresUserRepository.cs
│   │   │   │   └── Messaging/       UserEventPublisher.cs
│   │   │   ├── Application/
│   │   │   │   ├── Commands/        RegisterUserCommand.cs
│   │   │   │   └── Queries/         GetUserProfileQuery.cs
│   │   │   ├── Consumers/           ByteReactedConsumer.cs
│   │   │   └── Program.cs
│   │   │
│   │   ├── ByteAI.BytesService/     (same structure)
│   │   ├── ByteAI.FeedService/      (same structure)
│   │   ├── ByteAI.SearchService/    (same structure)
│   │   ├── ByteAI.AIService/        (same structure + /Models/)
│   │   └── ByteAI.NotificationService/
│   │
│   ├── Gateway/
│   │   └── ByteAI.Gateway/
│   │       ├── Program.cs           YARP config · JWT validation
│   │       └── appsettings.json     Route mappings
│   │
│   └── Shared/
│       ├── ByteAI.Shared.Contracts/ Shared event contracts · DTOs
│       ├── ByteAI.Shared.Auth/      JWT helpers · ClaimsPrincipal extensions
│       └── ByteAI.Shared.Messaging/ MassTransit setup · Base consumers
│
├── tests/
│   ├── ByteAI.UserService.Tests/    Unit + integration tests
│   ├── ByteAI.BytesService.Tests/
│   └── ByteAI.Integration.Tests/   End-to-end API tests
│
├── infra/
│   ├── docker-compose.yml           Local dev: all services + deps
│   ├── docker-compose.infra.yml     Local dev: Redis · RabbitMQ · PG · Mongo
│   └── bicep/                       Azure IaC
│       ├── main.bicep
│       ├── containerApps.bicep
│       └── databases.bicep
│
└── .github/
    └── workflows/
        ├── ci.yml                   Build + test on PR
        └── cd.yml                   Deploy to Azure on merge to main
```

---

## 11. Key Technology Decisions

| Concern | Choice | Why |
|---|---|---|
| **Auth** | Clerk (free 10k MAU) | Handles Magic Link · Google · Facebook · Phone OTP · issues JWT · zero infra |
| **API Gateway** | YARP (ASP.NET Core) | .NET native · free · JWT validation · rate limiting · path routing |
| **Relational DB** | PostgreSQL (Azure Flexible) | Free 12mo · pgvector built-in · ACID · great with .NET |
| **Document DB** | MongoDB (Cosmos DB free) | Flexible schema for Bytes/comments · Azure-native · free tier |
| **Cache** | Redis (ACI container) | Materialized feeds · sub-ms reads · session cache |
| **Message Broker** | RabbitMQ (CloudAMQP) | Free 1M msg/month · pub/sub · dead letter queues · MassTransit |
| **Vector Search** | pgvector in PostgreSQL | No extra service · free · HNSW index · hybrid with full-text |
| **Embeddings** | all-MiniLM-L6-v2 (ONNX) | In-process · no API · no GPU · 384-dim · 80MB model |
| **LLM + NLP** | Groq — Llama 3.3 70B | Free tier · fastest inference · handles both NLP and generative |
| **Observability** | OpenTelemetry + Jaeger + Grafana | Free · distributed tracing · .NET native SDK |
| **Container Runtime** | Azure Container Apps | Scales to zero · serverless · free tier · best for microservices |
| **CI/CD** | GitHub Actions | Free · Azure integrations · builds Docker images · deploys to ACA |
| **IaC** | Bicep | Azure-native · simpler than Terraform for pure Azure stacks |

---

## 12. Estimated Monthly Cost

| Service | Free Tier | Est. Cost After Free |
|---|---|---|
| Azure Static Web Apps | ✅ Free forever | $0 |
| Azure Container Apps | 180k vCPU-sec/month free | $5–15 |
| Azure DB for PostgreSQL | ✅ Free 12 months | $15/mo after |
| Azure Cosmos DB (MongoDB) | ✅ Free forever (25GB) | $0 |
| Redis (ACI) | No free tier | $10–15 |
| CloudAMQP RabbitMQ | ✅ Free 1M msg/month | $0 |
| Clerk Auth | ✅ Free 10k MAU | $0 |
| Groq API | ✅ Free tier | $0 |
| Azure Container Registry | ✅ Free tier | $0 |
| GitHub Actions | ✅ Free for public repos | $0 |
| **Total** | | **$0–30/month** |
# Architecture Documentation

**Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7**

## System Architecture Overview

The LinguaMaster platform is a cloud-native, serverless application deployed on Google Cloud Platform. The architecture follows microservices principles with clear separation of concerns and scalable components.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Users / Clients                          │
│                    (Web Browsers, Mobile)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloud Load Balancer                           │
│              (SSL Termination, DDoS Protection)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Cloud Run Service                           │
│                    (Auto-scaling Containers)                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Frontend (React + Vite)                      │  │
│  │  - Single Page Application                                │  │
│  │  - TanStack Query for state management                    │  │
│  │  - Tailwind CSS + Shadcn UI                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Backend API (Express + TypeScript)              │  │
│  │  - RESTful API endpoints                                  │  │
│  │  - Authentication & Authorization                         │  │
│  │  - Business logic services                                │  │
│  │  - Middleware stack (security, logging, metrics)          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬──────────────┬──────────────┬─────────────────────┘
             │              │              │
             │              │              │
    ┌────────▼────────┐    │              │
    │   Cloud SQL     │    │              │
    │  (PostgreSQL)   │    │              │
    │                 │    │              │
    │  - Primary DB   │    │              │
    │  - Automated    │    │              │
    │    Backups      │    │              │
    └─────────────────┘    │              │
                           │              │
                  ┌────────▼────────┐     │
                  │ Secret Manager  │     │
                  │                 │     │
                  │ - API Keys      │     │
                  │ - DB Credentials│     │
                  │ - JWT Secrets   │     │
                  └─────────────────┘     │
                                          │
                                 ┌────────▼────────┐
                                 │  External APIs  │
                                 │                 │
                                 │ - Google Gemini │
                                 │ - OpenAI        │
                                 └─────────────────┘
```

## Component Architecture

### Frontend Application

**Technology Stack**:
- React 18 (UI framework)
- Vite (Build tool and dev server)
- TanStack Query (Server state management)
- Wouter (Routing)
- Tailwind CSS (Styling)
- Shadcn UI (Component library)

**Key Features**:
- Single Page Application (SPA)
- Code splitting for optimal loading
- Progressive Web App capabilities
- Responsive design (mobile-first)
- Offline support (service workers)

**Directory Structure**:
```
client/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── analytics/   # Analytics dashboards
│   │   ├── auth/        # Authentication components
│   │   ├── duolingo/    # Duolingo-style components
│   │   ├── gamification/# Gamification features
│   │   ├── layout/      # Layout components
│   │   ├── learning/    # Learning interface components
│   │   └── ui/          # Base UI components (Shadcn)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and configs
│   ├── pages/           # Page components (routes)
│   └── main.tsx         # Application entry point
└── public/              # Static assets
```

### Backend Application

**Technology Stack**:
- Node.js 20+ (Runtime)
- Express.js (Web framework)
- TypeScript (Type safety)
- Drizzle ORM (Database access)
- Passport.js (Authentication)
- Zod (Schema validation)

**Architecture Layers**:

1. **Middleware Layer**
   - Security headers
   - CORS configuration
   - Rate limiting
   - Request logging
   - Error handling
   - Input validation
   - Metrics collection

2. **Route Layer**
   - API endpoint definitions
   - Request/response handling
   - Route-specific middleware
   - Parameter validation

3. **Service Layer**
   - Business logic
   - Data processing
   - External API integration
   - Transaction management

4. **Data Access Layer**
   - Database queries
   - ORM operations
   - Connection pooling
   - Query optimization

**Directory Structure**:
```
server/
├── config/              # Configuration management
│   └── ConfigurationManager.ts
├── middleware/          # Express middleware
│   ├── auth.ts          # Authentication
│   ├── compression.ts   # Response compression
│   ├── errorHandler.ts  # Error handling
│   ├── logging.ts       # Request logging
│   ├── metricsMiddleware.ts # Metrics collection
│   ├── security.ts      # Security headers & rate limiting
│   └── validation.ts    # Input validation
├── routes/              # API route handlers
│   ├── admin.ts         # Admin endpoints
│   ├── curriculum.ts    # Curriculum management
│   ├── exercises.ts     # Exercise endpoints
│   ├── gamification.ts  # Gamification features
│   ├── health.ts        # Health checks
│   ├── learning-path.ts # Learning path
│   ├── metrics.ts       # Metrics endpoint
│   ├── practice.ts      # Practice exercises
│   ├── profiles.ts      # User profiles
│   ├── progress.ts      # Progress tracking
│   ├── sessions.ts      # Session management
│   ├── speech.ts        # Speech recognition
│   ├── tutor.ts         # AI tutor
│   ├── user-settings.ts # User settings
│   ├── user-stats.ts    # User statistics
│   └── voice.ts         # Voice teaching
├── services/            # Business logic services
│   ├── AITeacherService.ts
│   ├── AdaptiveLearningService.ts
│   ├── CurriculumService.ts
│   ├── ExerciseService.ts
│   ├── GamificationService.ts
│   ├── GeminiService.ts
│   ├── LearningProfileService.ts
│   ├── ProgressService.ts
│   ├── SessionContextService.ts
│   ├── SpeechService.ts
│   ├── UserStatsService.ts
│   └── VoiceTeachingService.ts
├── utils/               # Utility functions
│   ├── cache.ts         # Caching utilities
│   ├── logger.ts        # Structured logging
│   ├── MetricsCollector.ts # Metrics collection
│   ├── transactions.ts  # Database transactions
│   └── validation.ts    # Validation helpers
├── db.ts                # Database connection
├── index.ts             # Application entry point
└── routes.ts            # Route registration
```

## Data Flow Diagrams

### User Authentication Flow

```
┌──────┐                                                    ┌──────────┐
│Client│                                                    │ Database │
└──┬───┘                                                    └────┬─────┘
   │                                                             │
   │ 1. POST /api/register                                      │
   │ { email, password, name }                                  │
   ├────────────────────────────────────────────────────────────┤
   │                                                             │
   │ 2. Validate input                                          │
   │ 3. Hash password (bcrypt)                                  │
   │ 4. Create user record                                      │
   │────────────────────────────────────────────────────────────▶
   │                                                             │
   │                                                             │
   │◀────────────────────────────────────────────────────────────
   │ 5. User created                                            │
   │                                                             │
   │ 6. Generate JWT token                                      │
   │ 7. Create session                                          │
   │                                                             │
   │◀────────────────────────────────────────────────────────────
   │ { token, user }                                            │
   │                                                             │
   │ 8. Store token in localStorage                             │
   │ 9. Set Authorization header                                │
   │                                                             │
   │ 10. Subsequent requests                                    │
   │ Authorization: Bearer <token>                              │
   ├────────────────────────────────────────────────────────────┤
   │                                                             │
   │ 11. Verify JWT token                                       │
   │ 12. Load user from session                                 │
   │────────────────────────────────────────────────────────────▶
   │                                                             │
   │◀────────────────────────────────────────────────────────────
   │ 13. Authorized request processed                           │
   │                                                             │
```

### Lesson Completion Flow

```
┌──────┐                                                    ┌──────────┐
│Client│                                                    │ Database │
└──┬───┘                                                    └────┬─────┘
   │                                                             │
   │ 1. POST /api/lessons/:id/complete                          │
   │ { exercises: [...], score: 85 }                            │
   ├────────────────────────────────────────────────────────────┤
   │                                                             │
   │ 2. Authenticate user                                       │
   │ 3. Validate lesson completion data                         │
   │                                                             │
   │ 4. Begin transaction                                       │
   │────────────────────────────────────────────────────────────▶
   │                                                             │
   │ 5. Update lesson progress                                  │
   │────────────────────────────────────────────────────────────▶
   │                                                             │
   │ 6. Award XP points                                         │
   │────────────────────────────────────────────────────────────▶
   │                                                             │
   │ 7. Update streak                                           │
   │────────────────────────────────────────────────────────────▶
   │                                                             │
   │ 8. Check for achievements                                  │
   │────────────────────────────────────────────────────────────▶
   │                                                             │
   │ 9. Unlock new lessons                                      │
   │────────────────────────────────────────────────────────────▶
   │                                                             │
   │ 10. Commit transaction                                     │
   │────────────────────────────────────────────────────────────▶
   │                                                             │
   │◀────────────────────────────────────────────────────────────
   │ 11. Return updated progress                                │
   │ { xp, streak, achievements, unlockedLessons }              │
   │                                                             │
```

### AI Tutor Interaction Flow

```
┌──────┐                    ┌────────┐                  ┌────────────┐
│Client│                    │ Backend│                  │ Gemini API │
└──┬───┘                    └───┬────┘                  └─────┬──────┘
   │                            │                              │
   │ 1. POST /api/tutor/chat    │                              │
   │ { message, context }       │                              │
   ├───────────────────────────▶│                              │
   │                            │                              │
   │                            │ 2. Load session context      │
   │                            │ 3. Build prompt with context │
   │                            │                              │
   │                            │ 4. POST /v1/generateContent  │
   │                            │ { prompt, context }          │
   │                            ├─────────────────────────────▶│
   │                            │                              │
   │                            │                              │
   │                            │◀─────────────────────────────┤
   │                            │ 5. AI response               │
   │                            │                              │
   │                            │ 6. Parse and format response │
   │                            │ 7. Update session context    │
   │                            │ 8. Track token usage         │
   │                            │                              │
   │◀───────────────────────────┤                              │
   │ 9. { response, suggestions }                              │
   │                            │                              │
```

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| TanStack Query | 5.x | Server state management |
| Wouter | 3.x | Routing |
| Tailwind CSS | 3.x | Styling |
| Shadcn UI | Latest | Component library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| TypeScript | 5.x | Type safety |
| Express.js | 4.x | Web framework |
| Drizzle ORM | Latest | Database ORM |
| Passport.js | 0.7.x | Authentication |
| Zod | 3.x | Schema validation |

### Database
| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 15.x | Primary database |
| Cloud SQL | - | Managed database service |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Google Cloud Run | Container hosting |
| Cloud Load Balancer | Traffic distribution, SSL |
| Cloud SQL | Managed PostgreSQL |
| Secret Manager | Credential storage |
| Artifact Registry | Container images |
| Cloud Logging | Log aggregation |
| Cloud Monitoring | Metrics and alerting |

### External Services
| Service | Purpose |
|---------|---------|
| Google Gemini API | AI content generation |
| OpenAI API | AI features (optional) |
| Sentry | Error tracking |

## External Service Dependencies

### Google Gemini API
**Purpose**: AI-powered content generation and tutoring
**Endpoints Used**:
- `/v1/models` - List available models
- `/v1/generateContent` - Generate AI responses

**Integration Points**:
- Lesson content generation
- AI tutor conversations
- Exercise creation
- Pronunciation feedback

**Failure Handling**:
- Circuit breaker pattern
- Fallback to cached content
- Graceful degradation
- User notification

### OpenAI API (Optional)
**Purpose**: Alternative AI provider for specific features
**Endpoints Used**:
- `/v1/chat/completions` - Chat completions
- `/v1/audio/transcriptions` - Speech-to-text

**Integration Points**:
- Voice recognition
- Advanced tutoring features

**Failure Handling**:
- Fallback to Gemini
- Cached responses
- Feature degradation

### Cloud SQL
**Purpose**: Primary data storage
**Configuration**:
- Instance: linguamaster-db
- Version: PostgreSQL 15
- Region: us-central1
- High availability: Optional
- Automated backups: Daily + PITR

**Connection**:
- Private IP via VPC connector
- SSL/TLS encryption
- Connection pooling (max 10)

## Security Architecture

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Authentication Layers                     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. HTTPS/TLS Encryption                                     │
│     └─ All traffic encrypted in transit                      │
│                                                               │
│  2. Security Headers                                         │
│     ├─ Content-Security-Policy                               │
│     ├─ Strict-Transport-Security                             │
│     ├─ X-Frame-Options: DENY                                 │
│     ├─ X-Content-Type-Options: nosniff                       │
│     └─ Referrer-Policy: strict-origin-when-cross-origin      │
│                                                               │
│  3. Rate Limiting                                            │
│     ├─ Unauthenticated: 100 req/15min                        │
│     ├─ Authenticated: 1000 req/15min                         │
│     └─ AI endpoints: 50 req/hour                             │
│                                                               │
│  4. Input Validation                                         │
│     ├─ Schema validation (Zod)                               │
│     ├─ Sanitization                                          │
│     └─ SQL injection prevention (parameterized queries)      │
│                                                               │
│  5. Authentication                                           │
│     ├─ JWT tokens (7-day expiration)                         │
│     ├─ Session management                                    │
│     ├─ Password hashing (bcrypt, 10 rounds)                  │
│     └─ OAuth (Google)                                        │
│                                                               │
│  6. Authorization                                            │
│     ├─ Role-based access control                             │
│     ├─ Resource ownership validation                         │
│     └─ Admin privilege checks                                │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Data Protection

**At Rest**:
- Database encryption (Cloud SQL)
- Secret encryption (Secret Manager)
- Backup encryption

**In Transit**:
- TLS 1.3 for all connections
- HTTPS only (HSTS enforced)
- Secure WebSocket connections

**Sensitive Data Handling**:
- Passwords: bcrypt hashed (10 rounds)
- API keys: Stored in Secret Manager
- JWT secrets: Rotatable, stored in Secret Manager
- PII: Encrypted in database, redacted in logs

## Deployment Architecture

### Google Cloud Run Configuration

**Service Configuration**:
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: linguamaster
  namespace: northerntriberesearch
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      serviceAccountName: linguamaster-sa@northerntriberesearch.iam.gserviceaccount.com
      containers:
      - image: gcr.io/northerntriberesearch/linguamaster:latest
        ports:
        - containerPort: 5000
        resources:
          limits:
            memory: 2Gi
            cpu: "2"
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-url
              key: latest
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: gemini-api-key
              key: latest
```

**Auto-scaling**:
- Min instances: 1 (always warm)
- Max instances: 10
- Target CPU utilization: 70%
- Target concurrency: 80 requests/instance

**Resource Limits**:
- Memory: 2GB per instance
- CPU: 2 vCPU per instance
- Timeout: 300 seconds

### CI/CD Pipeline

**GitLab CI/CD Stages**:
1. **Lint & Type Check** (2-3 min)
   - ESLint
   - TypeScript compilation
   - Prettier formatting

2. **Unit Tests** (3-5 min)
   - Vitest test runner
   - Coverage reporting (80% target)
   - Test result artifacts

3. **Security Scan** (2-3 min)
   - Dependency vulnerability scan (npm audit)
   - SAST analysis
   - Secret detection

4. **Build** (5-7 min)
   - Docker multi-stage build
   - Image optimization
   - Tag with commit SHA
   - Push to Artifact Registry

5. **Deploy Staging** (3-5 min)
   - Deploy to staging environment
   - Run smoke tests
   - Performance checks

6. **Manual Approval** (manual)
   - Review staging results
   - Approve production deployment

7. **Deploy Production** (3-5 min)
   - Canary deployment (10% → 100%)
   - Health check monitoring
   - Automatic rollback on errors

8. **Post-Deployment** (2-3 min)
   - Smoke tests
   - Performance verification
   - Notification

## Design Decisions and Trade-offs

### 1. Serverless Architecture (Cloud Run)

**Decision**: Use Google Cloud Run instead of traditional VMs or Kubernetes

**Rationale**:
- Automatic scaling (0 to N instances)
- Pay-per-use pricing model
- Simplified operations (no server management)
- Built-in load balancing and SSL
- Fast deployment and rollback

**Trade-offs**:
- Cold start latency (mitigated with min instances)
- Vendor lock-in to GCP
- Limited control over infrastructure
- Request timeout limits (300s max)

### 2. Monolithic Deployment

**Decision**: Deploy frontend and backend as single container

**Rationale**:
- Simplified deployment process
- Reduced operational complexity
- Lower latency (no network hop)
- Easier development workflow
- Cost-effective for current scale

**Trade-offs**:
- Cannot scale frontend/backend independently
- Larger container image
- Longer build times
- May need to split as scale increases

### 3. PostgreSQL on Cloud SQL

**Decision**: Use managed PostgreSQL instead of NoSQL or self-hosted

**Rationale**:
- ACID transactions for data integrity
- Rich query capabilities
- Mature ecosystem and tooling
- Managed service (backups, HA, patches)
- Strong consistency guarantees

**Trade-offs**:
- Higher cost than self-hosted
- Vertical scaling limits
- Less flexible schema than NoSQL
- Potential bottleneck at scale

### 4. JWT + Session Hybrid Authentication

**Decision**: Use JWT tokens with server-side session validation

**Rationale**:
- Stateless authentication (JWT)
- Ability to revoke sessions (server-side)
- Good balance of security and performance
- Standard approach with good library support

**Trade-offs**:
- Requires database lookup for session validation
- Token refresh complexity
- Storage overhead for sessions
- Cannot revoke JWTs before expiration

### 5. In-Memory Caching

**Decision**: Use in-memory cache instead of Redis initially

**Rationale**:
- Simpler setup and operations
- Lower latency (no network hop)
- No additional infrastructure cost
- Sufficient for current scale

**Trade-offs**:
- Cache not shared across instances
- Lost on container restart
- Limited by instance memory
- Will need Redis for multi-instance scaling

### 6. Gemini as Primary AI Provider

**Decision**: Use Google Gemini as primary AI service with OpenAI as fallback

**Rationale**:
- Cost-effective (lower token costs)
- Good performance for our use cases
- Integrated with GCP ecosystem
- Generous free tier

**Trade-offs**:
- Less mature than OpenAI
- Fewer features and models
- Potential quality differences
- Dependency on Google ecosystem

## Performance Characteristics

### Response Time Targets
- **p50**: < 500ms
- **p95**: < 2s
- **p99**: < 5s

### Throughput
- **Current**: ~100 requests/second
- **Target**: 1000 requests/second
- **Max tested**: 500 requests/second

### Availability
- **Target**: 99.9% (< 43 minutes downtime/month)
- **Current**: 99.5%

### Scalability
- **Concurrent users**: 1000+ (tested)
- **Database connections**: 10 (pooled)
- **Cloud Run instances**: 1-10 (auto-scaled)

## Monitoring and Observability

### Metrics Collected
- HTTP request count, duration, status codes
- Database query count, duration, slow queries
- AI service requests, tokens, costs
- Memory usage, CPU usage
- Active connections, error rates

### Logging
- Structured JSON logs
- Log levels: DEBUG, INFO, WARN, ERROR, FATAL
- Correlation IDs for request tracing
- Sensitive data redaction

### Alerting
- Error rate > 1% for 5 minutes
- Response time p95 > 2 seconds
- Health check failures
- Resource utilization > 80%
- AI service errors > 5%

### Dashboards
- Cloud Run metrics (requests, latency, errors)
- Database performance (queries, connections)
- AI service usage (requests, tokens, costs)
- System health (memory, CPU, uptime)

## Related Documentation

- [Deployment Runbook](../runbooks/deployment.md)
- [Incident Response Procedures](../runbooks/incident-response.md)
- [Troubleshooting Guide](../runbooks/troubleshooting.md)
- [API Documentation](../api/README.md)

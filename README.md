# LinguaMaster

AI-powered language learning platform developed by NorthernTribe Research.

LinguaMaster is a full-stack application that combines adaptive lessons, AI-generated exercises, voice learning, pronunciation coaching, and learner progress tracking.

## Repository Structure

```text
linguamaster/
|- client/         # React frontend (Vite + TypeScript)
|- server/         # Express API and backend services
|- shared/         # Shared types/schemas
|- db/             # Database schema and persistence assets
|- docs/           # Architecture, deployment, runbooks, API docs
|- scripts/        # Deployment and operations scripts
`- k8s/            # Kubernetes baseline manifests
```

## Technology Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Drizzle ORM
- Session auth (Passport) and JWT support
- Google Gemini and OpenAI integrations

### Frontend
- React 18 + TypeScript
- Vite
- TanStack Query
- Tailwind CSS + shadcn/ui
- Wouter

## Prerequisites

- Node.js 20 or later (recommended)
- npm 8 or later
- PostgreSQL

## Environment Configuration

Copy and edit the template:

```bash
cp .env.example .env
```

### Required
- `DATABASE_URL` (all environments)

### Required In Production
- `SESSION_SECRET`
- `JWT_SECRET`
- `GEMINI_API_KEY`

### Optional But Used By Features
- `OPENAI_API_KEY`
- `GOOGLE_WEB_CLIENT_ID` or `GOOGLE_WEB_CLIENT_IDS` (Google login)
- `STRIPE_SECRET_KEY` (billing flows)
- `UPTIME_ALERT_WEBHOOK_URL` (uptime alert script)

Use `.env.example` as the complete source of supported variables.

## Local Development

```bash
npm install
npm run db:push
npm run dev
```

Default local URL: `http://localhost:5000`

## Build and Run (Production Mode)

```bash
npm run build
npm run start
```

## Docker

Build and run using project scripts:

```bash
npm run docker:build
npm run docker:run
```

Notes:
- `docker:run` loads `.env`, so `PORT` comes from your `.env` file.
- If `PORT` is not set at runtime, the Docker image defaults to port `8080`.

### Example Compose Snippet

```yaml
version: "3.8"
services:
  linguamaster:
    build: .
    ports:
      - "5000:8080"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: linguamaster
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Kubernetes

Baseline manifests are in `k8s/`.

Quick start:

```bash
kubectl create namespace linguamaster
kubectl -n linguamaster create secret generic linguamaster-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=GEMINI_API_KEY='...' \
  --from-literal=OPENAI_API_KEY='...' \
  --from-literal=SESSION_SECRET='...' \
  --from-literal=JWT_SECRET='...'
kubectl apply -k k8s
```

## API Documentation

Interactive API docs are served by the app:

- `GET /api/docs`
- `GET /api/docs/openapi.yaml`
- `GET /api/docs/openapi.json`
- `GET /api/docs/info`

Source spec file: `docs/api/openapi.yaml`

## API Summary (Implemented Routes)

### Health and Metrics
- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/metrics`
- `GET /api/metrics/json`
- `GET /api/metrics/summary`

### Authentication
- `POST /api/register`
- `POST /api/login`
- `POST /api/google-login`
- `POST /api/logout`
- `GET /api/user`
- `PUT /api/auth/profile`

### Core Learning
- `GET /api/languages`
- `GET /api/user/languages`
- `POST /api/user/languages`
- `GET /api/languages/:languageId/lessons`
- `GET /api/user/languages/:languageId/lessons`
- `PATCH /api/user/lessons/:lessonId`
- `GET /api/user/lessons/:lessonId/exercises`
- `GET /api/achievements`
- `GET /api/user/achievements`
- `GET /api/user/daily-challenge`
- `POST /api/user/daily-challenge/:challengeId/complete`
- `GET /api/leaderboard`

### AI Endpoints
- `POST /api/ai/exercise`
- `POST /api/ai/vocabulary`
- `POST /api/ai/grammar`
- `POST /api/ai/explain-answer`
- `POST /api/ai/roleplay`

### Additional Route Modules

The following route modules are also mounted and active under `/api` or scoped subpaths:

- `profiles`
- `curriculum`
- `exercises`
- `practice`
- `voice`
- `speech`
- `tutor`
- `gamification`
- `progress`
- `admin` (mounted at `/api/admin`)
- `cache` (mounted at `/api/cache`)
- `sessions` (mounted at `/api/sessions`)
- `learning-path` (mounted at `/api/learning-path`)
- `user-stats` (mounted at `/api/user-stats`)
- `user-settings`
- `gdpr`

See `server/routes/` for exact route contracts.

## Development Scripts

```bash
npm run dev                  # Start development server
npm run build                # Build frontend and backend artifacts
npm run start                # Run production build
npm run check                # TypeScript type checking
npm run test                 # Unit test suite
npm run test:integration     # Integration test suite
npm run db:push              # Apply schema updates
npm run docker:build         # Build Docker image
npm run docker:run           # Run Docker container
npm run staging:deploy       # Deploy local staging container
npm run staging:rollback     # Roll back local staging deployment
npm run backup:db            # Create PostgreSQL backup
npm run restore:db           # Restore PostgreSQL backup
npm run drill:backup-restore # Validate backup/restore process
npm run monitor:uptime       # Run uptime check
```

## Security and Operations

The project includes:

- Rate limiting
- Input validation and sanitization
- Security headers and CORS controls
- Structured logging
- Health and metrics endpoints
- Backup and rollback scripts

Operational references:

- `docs/runbooks/`
- `docs/deployment/`
- `docs/observability.md`
- `docs/integrations.md`

## License

This project is licensed under the MIT License. See `LICENSE` for details.

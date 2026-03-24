# LinguaMaster

AI-powered language learning platform developed by NorthernTribe Research.

LinguaMaster is a full-stack application designed for production deployment. It combines adaptive curriculum generation, conversational AI, pronunciation coaching, and learner analytics in a modular platform that can be operated in enterprise environments.

## Overview

LinguaMaster provides a digital learning experience with:

- Personalized lesson paths based on learner performance.
- AI-generated lesson content for vocabulary, grammar, and context.
- Voice-led instruction and pronunciation feedback loops.
- Progress tracking, gamification, and daily engagement systems.

## Core Capabilities

### Learning and Engagement
- Adaptive lesson sequencing and difficulty management.
- Interactive lessons with vocabulary, grammar, and cultural context.
- XP, streaks, achievements, and challenge mechanics.

### AI Services
- Curriculum and lesson generation.
- Personalized exercise generation.
- Conversational voice teaching.
- Pronunciation analysis and coaching.

### Platform Operations
- Structured logging and error handling.
- Security middleware and request validation.
- Caching, monitoring, and deployment automation scripts.

## Technology Stack

### Backend
- Node.js, Express, and TypeScript.
- PostgreSQL with Drizzle ORM.
- Google Gemini AI as primary language model integration.
- Optional OpenAI integration for extended AI functionality.

### Frontend
- React 18 with TypeScript.
- Vite for build and development tooling.
- TanStack Query for data synchronization.
- Tailwind CSS and shadcn/ui component foundation.
- Wouter for lightweight routing.

## System Architecture

The platform is structured as a monorepo with clear separation of concerns:

```text
linguamaster/
|- client/          # React frontend
|- server/          # Express API and service layer
|- shared/          # Shared schemas and types
`- db/              # Database schema and persistence assets
```

The backend exposes REST endpoints for authentication, learning operations, and AI features. The frontend consumes these APIs and handles real-time learner interactions.

## Development Setup

### Prerequisites
- Node.js 18 or later.
- npm 8 or later.
- PostgreSQL instance.
- Google Gemini API key.
- OpenAI API key (optional).

### Installation
```bash
npm install
cp .env.example .env
```

### Required Configuration
Update `.env` with values for your environment:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/linguamaster

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Application
NODE_ENV=development
PORT=5000
SESSION_SECRET=your_super_secret_session_key_here
JWT_SECRET=your_super_secret_jwt_secret_here
APP_BASE_URL=http://localhost:5000

# Optional billing support
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### Initialize and Run
```bash
npm run db:push
npm run dev
```

Default local URL: `http://localhost:5000`

## Docker Operations

### Build and Run
```bash
npm run docker:build
npm run docker:run
```

### Example Compose Configuration
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

## Security and Reliability

LinguaMaster includes production-focused controls such as:

- Rate limiting for API protection.
- Input validation and sanitization.
- Security headers and CORS policy enforcement.
- Session and authentication safeguards.
- Structured error handling to reduce information leakage.

## Observability and Operations

Operational tooling includes:

- Structured application logging.
- Health and uptime verification workflows.
- Database backup and restore automation scripts.
- Staging deployment and rollback scripts.

## API Summary

### Authentication and Core
- `POST /api/login`
- `POST /api/register`
- `POST /api/google-login`
- `GET /api/user`
- `GET /api/user/languages`
- `GET /api/languages/:languageId/lessons`

### AI Endpoints
- `POST /api/ai/exercise`
- `POST /api/ai/vocabulary`
- `POST /api/ai/grammar`
- `POST /api/ai/explain-answer`
- `POST /api/ai/roleplay`

### Voice and Pronunciation
- `POST /api/voice/start`
- `POST /api/voice/interact`
- `POST /api/speech/analyze`

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

## Deployment Guidance

Recommended production rollout process:

1. Build artifacts: `npm run build`
2. Set production environment variables and secrets.
3. Provision and validate database connectivity.
4. Deploy application container(s).
5. Configure TLS and reverse proxy as required.
6. Enable monitoring, backup, and rollback processes.

## Roadmap

Current roadmap themes:

- Mobile client support.
- Offline learning mode.
- Group and collaborative learning features.
- Expanded analytics and model-driven insight tooling.
- Additional multimodal learning experiences.

## Support

For support and issue tracking:

- Open an issue in the repository.
- Contact the project maintainers.

## License

This project is licensed under the MIT License. See `LICENSE` for details.

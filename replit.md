# LinguaMaster - AI-Powered Language Learning Platform

## Overview

LinguaMaster is a full-stack language learning application that uses AI (Google Gemini and OpenAI) to deliver personalized language education. It supports multiple languages (Spanish, Mandarin Chinese, English, Hindi, Arabic) with features including adaptive learning paths, AI-powered tutoring, pronunciation coaching, gamification (XP, streaks, achievements, leaderboards), and daily challenges. The app follows a monorepo structure with a React frontend, Express backend, and PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project uses a single repository with three main directories:
- `client/` — React frontend application
- `server/` — Express backend API
- `shared/` — Shared types, schemas, and models used by both client and server

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built with Vite
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack Query (React Query) for server state; no separate client state library
- **UI Components**: shadcn/ui component library built on Radix UI primitives with Tailwind CSS
- **Theming**: Uses `theme.json` with a Replit-specific Vite plugin for shadcn theme integration. Supports light/dark mode via CSS variables
- **Code Splitting**: Lazy-loaded page components with React Suspense
- **Auth**: Context-based auth provider (`AuthProvider`) wrapping the app, with `ProtectedRoute` and `AdminProtectedRoute` wrappers for route protection
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express.js with TypeScript, run via `tsx` in development
- **Build**: Vite builds the frontend; `esbuild` bundles the server for production
- **API Pattern**: RESTful API under `/api/` prefix
- **Service Layer**: All business logic is organized into service classes extending `BaseService`, which provides database access and logging. Services include: `UserService`, `LanguageService`, `LessonService`, `AchievementService`, `ChallengeService`, `OpenAIService`, `GeminiService`, `AITeacherService`, and several AI orchestration services
- **Middleware**: Custom error handling (`errorHandler`), rate limiting (general, auth-specific, and AI-specific tiers), security headers, input validation via Zod schemas
- **Authentication**: Dual auth system — supports both local username/password auth (Passport.js with LocalStrategy, scrypt password hashing) and Replit Auth integration. Sessions stored in PostgreSQL via `connect-pg-simple`
- **Caching**: In-memory cache (`MemoryCache` class) with TTL support and automatic cleanup
- **Logging**: Custom logger utility with configurable log levels (ERROR, WARN, INFO, DEBUG)

### Database
- **Database**: PostgreSQL (required, uses `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-kit` for migrations
- **Connection**: Uses `postgres` driver (via `postgres` npm package) for the main app and `pg.Pool` for session storage
- **Schema Location**: `shared/schema.ts` — defines all tables including `users`, `languages`, `userLanguages`, `lessons`, `userLessons`, `achievements`, `userAchievements`, `challenges`, `dailyChallenges`, and `sessions`
- **Schema Push**: Run `npm run db:push` to push schema changes to the database (uses Drizzle Kit)
- **Key Design Decisions**: 
  - User IDs are varchar (UUID) rather than serial integers, to support Replit Auth integration
  - Relations are defined in Drizzle for query building with joins
  - Sessions table uses the `connect-pg-simple` schema

### AI Services Architecture
The AI layer is the most complex part of the system, organized as multiple specialized services:

- **GeminiService**: Core wrapper around Google Gemini 1.5 Flash API. Used for content generation, response analysis, curriculum planning, and adaptive learning
- **OpenAIService**: Wrapper around OpenAI GPT-4o for exercise generation and translation checking
- **WhisperService**: OpenAI Whisper for speech-to-text and pronunciation analysis
- **AITeacherService**: Manages AI teacher personas for each language, orchestrates conversations using both Gemini and OpenAI
- **CurriculumService**: Generates structured learning paths and lesson plans via Gemini
- **AdaptiveLearningService**: Tracks learning profiles, knowledge states, and adjusts content difficulty
- **AIContentGenerator**: Creates lessons, exercises, vocabulary, and assessments dynamically
- **AIPerformanceAnalyzer**: Evaluates user responses and provides detailed feedback
- **IntelligentSessionManager**: Manages real-time AI-driven learning sessions with conversation flow and adaptation
- **AILearningOrchestrator**: Determines next learning activities and coordinates between services
- **VoiceTeachingService**: Structures voice-based interactive lessons
- **SpeechService**: Pronunciation feedback and speech analysis via Gemini

### Key Pages (Frontend)
- `/auth` — Login/register page
- `/` — Dashboard with language progress, streaks, challenges
- `/lessons` — Browse and filter lessons by language
- `/lessons/:id` — Interactive lesson with exercises and AI teacher
- `/practice` — Practice mode with daily challenges, vocabulary, grammar, pronunciation
- `/ai-learning` — AI-enhanced adaptive learning interface
- `/ai-teacher` — Interactive AI teacher chat sessions
- `/leaderboard` — User rankings
- `/achievements` — Achievement tracking
- `/profile` — User profile management
- `/admin` — Admin dashboard (admin-only)
- `/admin/lessons` — Lesson management (admin-only)

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required)
- `GEMINI_API_KEY` — Google Gemini API key (required for AI features: curriculum generation, pronunciation feedback, adaptive learning, AI teacher)
- `OPENAI_API_KEY` — OpenAI API key (required for exercise generation, translation checking, speech-to-text via Whisper)
- `SESSION_SECRET` — Session encryption secret (falls back to a default if not set)

### Third-Party Services
- **Google Gemini AI** (`@google/generative-ai`): Primary AI backend using Gemini 1.5 Flash model for content generation, response analysis, curriculum planning, and pronunciation coaching
- **OpenAI** (`openai`): Secondary AI backend using GPT-4o for exercise generation and Whisper for speech-to-text
- **PostgreSQL**: Primary data store, also used for session storage via `connect-pg-simple`
- **Neon Database** (`@neondatabase/serverless`): Listed as a dependency (serverless PostgreSQL compatible driver)

### Key NPM Packages
- `drizzle-orm` + `drizzle-kit`: Database ORM and migration tooling
- `passport` + `passport-local`: Authentication strategy
- `express-session` + `connect-pg-simple`: Session management with PostgreSQL backing
- `express-rate-limit`: API rate limiting
- `zod` + `drizzle-zod`: Schema validation
- `date-fns`: Date manipulation for streaks and daily challenges
- `@tanstack/react-query`: Server state management
- `wouter`: Client-side routing
- `react-hook-form` + `@hookform/resolvers`: Form handling with Zod validation
- Full shadcn/ui component set via Radix UI primitives
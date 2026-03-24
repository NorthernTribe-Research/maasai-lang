# LinguaMaster — Production Readiness & Skills Reference

> NorthernTribe Research | v1.0.0

---

## Quick Start

```bash
npm install
cp .env.example .env   # fill in secrets
npm run db:push
npm run dev            # http://localhost:5000
```

---

## Environment Variables (Required)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/linguamaster` |
| `GOOGLE_API_KEY` | Google Gemini AI key | `AIza...` |
| `OPENAI_API_KEY` | OpenAI key (voice/speech) | `sk-proj-...` |
| `SESSION_SECRET` | Express session secret | `openssl rand -base64 32` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `5000` |

Generate strong secrets:
```bash
openssl rand -base64 32   # for SESSION_SECRET
```

---

## Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start dev server (tsx + Vite HMR) |
| `npm run build` | Build frontend + bundle server |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push Drizzle schema to DB |
| `npm test` | Run Vitest test suite |

---

## Production Checklist

### Security
- [ ] `SESSION_SECRET` set to strong random value (32+ bytes)
- [ ] `NODE_ENV=production`
- [ ] `ALLOWED_ORIGINS` set to your domain
- [ ] `.env` is in `.gitignore` (already done)
- [ ] API keys are environment variables only — never in source
- [ ] HTTPS enforced (middleware auto-redirects in production)
- [ ] Rate limiting active (API / auth / AI tiers)
- [ ] CORS whitelist configured

### Database
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] Run `npm run db:push` after deploy
- [ ] Connection pooling configured (pg pool)
- [ ] Performance indexes applied (`db/migrations/add_performance_indexes.sql`)

### Build & Deploy
- [ ] `npm run build` succeeds without errors
- [ ] `npm run check` passes (no TypeScript errors)
- [ ] `npm test` passes
- [ ] Docker image builds (`Dockerfile` present)
- [ ] Health check endpoint responds: `GET /api/health`

### AI Services
- [ ] `GOOGLE_API_KEY` valid and has Gemini 1.5 Flash access
- [ ] `OPENAI_API_KEY` valid (for voice/Whisper features)
- [ ] AI service fallback logic tested (`AIServiceMonitor`)
- [ ] Rate limits respected (AI endpoints have dedicated rate limiter)

---

## Architecture Overview

```
client/src/
  pages/
    landing.tsx          ← Public landing page (parrot hero, features, CTA)
    auth-page.tsx        ← Split-panel login/register with parrot logo
    learn.tsx            ← Main app (Duolingo-style learning path)
    dashboard.tsx        ← Classic dashboard view
    lessons.tsx          ← Lesson browser
    practice.tsx         ← Practice exercises
    leaderboard.tsx      ← Weekly XP leaderboard
    profile.tsx          ← User profile
    settings.tsx         ← User settings
    progress.tsx         ← Analytics & progress
    ai-learning.tsx      ← AI-enhanced learning hub
    ai-teacher.tsx       ← AI tutor chat
  components/
    duolingo/            ← Duolingo-style UI (header, bottom nav, lesson nodes)
    layout/              ← App shell (header, sidebar, mobile nav)
    learning/            ← AI lesson components
    gamification/        ← XP, achievements, streaks, leaderboard
    analytics/           ← Progress dashboard, weakness analysis

server/
  index.ts               ← Express entry point
  auth.ts                ← Passport.js + JWT auth
  routes/                ← All API route handlers
  services/              ← Business logic (AI, curriculum, gamification)
  middleware/            ← Security, validation, logging, error handling
  utils/                 ← Cache, transactions, migrations

shared/
  schema.ts              ← Drizzle ORM schema (single source of truth)
```

---

## Key API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/login` | Login |
| POST | `/api/register` | Register |
| POST | `/api/logout` | Logout |
| GET | `/api/user` | Current user |

### Learning
| Method | Path | Description |
|---|---|---|
| GET | `/api/learning-path` | Duolingo-style learning path |
| GET | `/api/lessons` | All lessons |
| GET | `/api/lessons/:id` | Lesson detail |
| POST | `/api/curriculum/generate` | AI curriculum generation |

### Gamification
| Method | Path | Description |
|---|---|---|
| GET | `/api/user-stats/stats` | XP, level, hearts, streak |
| GET | `/api/user-stats/leaderboard/weekly` | Weekly leaderboard |
| POST | `/api/user-stats/xp/award` | Award XP |
| POST | `/api/user-stats/hearts/lose` | Lose a heart |
| POST | `/api/user-stats/hearts/restore` | Restore hearts |
| POST | `/api/user-stats/streak/update` | Update streak |

### AI
| Method | Path | Description |
|---|---|---|
| POST | `/api/ai/comprehensive-lesson` | Generate full AI lesson |
| POST | `/api/ai/personalized-exercises` | Adaptive exercises |
| POST | `/api/ai/voice/conversation/start` | Start voice session |
| POST | `/api/ai/voice/pronunciation` | Pronunciation coaching |
| POST | `/api/ai/vocabulary` | Vocabulary generation |

---

## Frontend Routes

| Path | Component | Auth Required |
|---|---|---|
| `/landing` | `LandingPage` | No |
| `/auth` | `AuthPage` | No |
| `/` | `Learn` (Duolingo path) | Yes |
| `/dashboard` | `Dashboard` | Yes |
| `/lessons` | `Lessons` | Yes |
| `/lessons/:id` | `LessonDetail` | Yes |
| `/practice` | `Practice` | Yes |
| `/leaderboard` | `Leaderboard` | Yes |
| `/achievements` | `Achievements` | Yes |
| `/profile` | `Profile` | Yes |
| `/ai-learning` | `AILearning` | Yes |
| `/ai-teacher` | `AITeacher` | Yes |
| `/settings` | `Settings` | Yes |
| `/progress` | `Progress` | Yes |
| `/admin` | `AdminDashboard` | Admin only |

---

## Design System

### Brand Colors
- Primary: `hsl(220, 70%, 50%)` — LinguaMaster Blue
- Primary Dark: `hsl(220, 70%, 38%)`
- Primary Light: `hsl(220, 70%, 95%)`
- Duolingo Green: `#58CC02`
- Streak Orange: `#FF9600`
- Hearts Red: `#FF4B4B`
- XP Yellow: `#FFC800`

### Logo
- File: `client/public/logo-icon.png` — the parrot mascot
- **Never replace or alter the parrot logo**
- Used in: nav, auth page, landing hero, DuolingoHeader, lesson complete modal

### Typography
- Font: System sans-serif stack (Inter/Nunito via Tailwind)
- Headings: `font-black` (900 weight)
- Body: `font-medium` (500 weight)
- Radius: `0.75rem` base

---

## Testing

```bash
# Run all tests (single pass)
npx vitest --run

# Test files
server/auth.test.ts
server/services/GamificationService.test.ts
server/services/ExerciseService.test.ts
server/services/GeminiService.test.ts
server/services/SessionContextService.test.ts
server/utils/transactions.test.ts
server/routes/profiles.test.ts
```

---

## Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `users` | Auth, XP, hearts, streak, level |
| `languages` | Supported languages |
| `user_languages` | User ↔ language enrollment |
| `lessons` | Lesson content |
| `user_lessons` | Progress per lesson |
| `exercises` | Exercise bank |
| `achievements` | Achievement definitions |
| `user_achievements` | Earned achievements |
| `xp_gains` | XP history (for leaderboard) |
| `daily_challenges` | Daily challenge definitions |
| `user_settings` | Per-user preferences |

---

## Monitoring & Maintenance

### Daily
- Check error logs
- Monitor AI API usage/quota
- Verify streak reset jobs ran

### Weekly
- Review auth logs for anomalies
- Check rate limit violations
- `npm audit` for dependency vulnerabilities

### Monthly
- Rotate `SESSION_SECRET`
- Review user growth metrics
- Update dependencies

### Quarterly
- Full security audit
- Performance profiling
- Database vacuum/analyze

---

## Known Limitations

1. No WebSocket/real-time — uses polling where needed
2. No offline support — requires internet connection
3. In-memory cache resets on server restart (use Redis for production scale)
4. End-to-end tests deferred (manual testing performed)

---

## Docker

```bash
# Build
docker build -t linguamaster .

# Run
docker run -p 5000:5000 \
  -e DATABASE_URL=... \
  -e GOOGLE_API_KEY=... \
  -e SESSION_SECRET=... \
  -e NODE_ENV=production \
  linguamaster
```

---

*LinguaMaster — Empowering language learners with AI-driven personalized education.*
*© NorthernTribe Research*

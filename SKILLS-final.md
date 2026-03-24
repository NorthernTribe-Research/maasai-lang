# LinguaMaster Launch Skills Matrix (Final)

Last updated: March 22, 2026
Purpose: keep the team focused on shipping an AI-first Android product to Play Store production.

## Current Focus Snapshot (March 22, 2026)

- Android technical gate status:
  - `compileDebugKotlin`: pass
  - `lintDebug`: pass
  - `testDebugUnitTest`: pass
  - `assembleDebug`: pass
  - `bundleRelease`: blocked by signing secrets only
- Primary launch risks now outside code:
  - release keystore + secrets provisioning
  - Play Console compliance/content setup
  - staged rollout monitoring discipline

## 1) Product Skills

### AI Pedagogy Design
- Competency: map AI responses to measurable learning outcomes.
- Scope:
  - feedback quality for grammar/vocabulary/pronunciation
  - lesson progression and adaptive difficulty
  - challenge/streak motivation loops

### Learning Experience Architecture
- Competency: convert user intent into low-friction practice journeys.
- Scope:
  - onboarding to first lesson under 2 minutes
  - profile setup and language goal capture
  - clear practice mode affordances

## 2) Android Engineering Skills

### Kotlin + Compose Production Craft
- Competency: build resilient stateful screens and flows.
- Scope:
  - robust error/loading/empty states
  - lifecycle-safe async handling
  - navigation correctness and deep-link readiness

### Media + Speech Pipeline Integration
- Competency: reliable mic capture and API submission.
- Scope:
  - audio recording lifecycle
  - multipart uploads
  - graceful handling of permission/network failure

### Auth-Linked Session Context
- Competency: ensure every AI endpoint request carries the real authenticated profile/user context.
- Scope:
  - avoid hardcoded fallback IDs
  - resolve profile from session/auth state
  - enforce safe failure states when profile is missing

### Data Layer Contract Discipline
- Competency: keep DTO/API/repository/domain mapping synchronized.
- Scope:
  - strict compile/test checks after API changes
  - typed request/response validation
  - backward compatibility fallbacks

## 3) AI Platform Skills

### Tutor Quality Control
- Competency: ensure tutor answers are useful, safe, and contextual.
- Scope:
  - session context quality
  - hallucination and unsafe-response controls
  - deterministic fallback responses

### Exercise Generation Quality
- Competency: produce pedagogically valid exercises at runtime.
- Scope:
  - question quality and answer validity
  - explanation usefulness
  - difficulty calibration and profile relevance

## 4) Release + Operations Skills

### Play Store Release Management
- Competency: execute repeatable release process.
- Scope:
  - signing pipeline
  - bundle validation
  - staged rollout and rollback strategy

### Reliability and Telemetry
- Competency: detect and resolve production issues fast.
- Scope:
  - crash/ANR monitoring
  - API failure rate tracking
  - user funnel telemetry

## 5) Suggested Execution Cadence

### Daily Launch Loop
- Run build health checks (`compile`, `lint`, `unit tests`, `assemble`) on a full JDK toolchain.
- Validate one core learning journey end-to-end.
- Close at least one P0/P1 backlog item from `todo-final.md`.

### Weekly Launch Gate
- Review crash metrics and top failure points.
- Review tutor/pronunciation response quality from real sessions.
- Decide go/no-go for next rollout stage.

## 6) Definition of Done for “Production Ready”

The app is production-ready when:
- no core flow depends on simulated/mock logic
- auth/session identity is fully real and consistent
- AI tutor + exercise + pronunciation paths work on physical devices
- release bundle is signed and validated
- Play Console policy/content requirements are complete

## 7) Launch-Critical Skill Execution Order

1. Release signing and secure secret management.
2. Physical-device QA for the full AI learning journey.
3. Policy/compliance completion in Play Console.
4. Telemetry and crash/ANR monitoring readiness.

# LinguaMaster Android Production TODO (Final)

Last updated: March 22, 2026
Owner: Android Product Engineering
Target: Play Store production launch (AI-first language learning)

## Current Verification Status (March 22, 2026)

- [x] `:app:compileDebugKotlin` passed
- [x] `:app:lintDebug` passed
- [x] `:app:testDebugUnitTest` passed
- [x] `:app:assembleDebug` passed
- [ ] `:app:bundleRelease` blocked only by release signing secrets
- [ ] Play Console launch steps (policy/listing/tracks rollout) pending

## P0 - Blockers (Must Be Done Before Launch)

- [x] Replace all hardcoded user identity references (`current_user`) with authenticated session-driven user IDs.
- [ ] Remove mock/simulated learning behavior in core flows:
  - [x] Voice lesson interaction
  - [x] Pronunciation scoring
  - [x] Leaderboard entries
- [x] Ensure onboarding and profile creation flow is complete and reachable from navigation.
- [x] Validate AI tutor requests use real active profile/user context.
- [ ] Ensure release signing and secure production config are present:
  - [ ] `KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
  - [ ] `API_BASE_URL=https://api.linguamaster.app/api/`
  - [ ] Privacy/Terms/Deletion URLs set to company endpoints
- [ ] Generate signed `app-release.aab` and validate install on physical device.

## P1 - Release Readiness (Should Be Done Before Launch)

- [ ] Pass full Android verification pipeline:
  - [x] `:app:compileDebugKotlin`
  - [x] `:app:lintDebug`
  - [x] `:app:testDebugUnitTest`
  - [x] `:app:assembleDebug`
  - [ ] `:app:bundleRelease`
- [ ] Add real empty/error states for AI endpoints (tutor/voice/pronunciation/exercises).
- [ ] Confirm offline and retry behavior for unstable network scenarios.
- [ ] Confirm analytics events for key funnel steps:
  - [ ] Register
  - [ ] Login
  - [ ] Create profile
  - [ ] Start lesson
  - [ ] Submit exercise
  - [ ] Voice/pronunciation session
- [ ] Validate account lifecycle:
  - [ ] Login
  - [ ] Logout
  - [ ] Token refresh/expired token behavior
  - [ ] Account deletion URL discoverability

## P2 - Product Quality (Important for Duolingo-Level Competitiveness)

- [ ] Adaptive practice path based on weakness categories.
- [ ] Better real-time pronunciation feedback granularity (phoneme-level guidance in UI).
- [ ] Daily/weekly challenge orchestration from backend (not static card assumptions).
- [ ] Notification strategy for streak retention and lesson reminders.
- [ ] Progressive content difficulty and spaced repetition loops.
- [ ] Experiment/feature-flag support for growth iterations.

## Play Store Launch Checklist

- [ ] Internal test track rollout with QA signoff
- [ ] Closed test track rollout with at least 20 testers
- [ ] Crash-free and ANR health checks in Android Vitals
- [ ] Data Safety and content declarations completed
- [ ] Store listing assets finalized (icon, screenshots, feature graphic, description)
- [ ] Production rollout plan and monitoring window defined

## Launch Decision Gate

Only proceed to Play Store production when:
- [ ] P0 complete
- [ ] P1 complete
- [ ] No Sev-1 or Sev-2 defects open
- [ ] Signed release bundle validated on-device

## Immediate Next 6 Steps (Execution Order)

1. Add production signing secrets in `android-app/local.properties` and verify `KEYSTORE_PATH` file access.
2. Set production API/policy URLs and confirm they point to real company endpoints.
3. Build signed release bundle with `:app:bundleRelease` and test install from `.aab` on a physical Android device.
4. Run smoke tests for onboarding -> profile -> lesson -> practice -> tutor -> voice -> pronunciation.
5. Prepare Play Console assets/policies: Data Safety, content declarations, privacy/deletion links, screenshots.
6. Roll out to Internal track, then Closed track, monitor crashes/ANRs, then promote to Production.

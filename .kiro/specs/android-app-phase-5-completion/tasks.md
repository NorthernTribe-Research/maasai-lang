# Tasks: LinguaMaster Android App - Phase 5 Completion

## Overview

This task list covers the completion of Phase 5 (DAO testing) and Phase 6 (UI integration tests, end-to-end tests, performance testing, and release preparation) for the LinguaMaster Android app.

**Estimated Timeline**: 2-3 weeks  
**Current Status**: Phase 5 at 70% (Repository & Mapper tests complete)

---

## Phase 5: DAO Testing (Week 1)

### 1. Setup DAO Testing Infrastructure

- [x] 1.1 Create BaseDaoTest abstract class
  - [x] 1.1.1 Add Room in-memory database creation in @Before
  - [x] 1.1.2 Add database close in @After
  - [x] 1.1.3 Configure allowMainThreadQueries for tests
  - [x] 1.1.4 Add helper methods for common test operations

- [x] 1.2 Update build.gradle.kts with testing dependencies
  - [x] 1.2.1 Verify androidx.room:room-testing:2.6.1 is included
  - [x] 1.2.2 Verify androidx.test.ext:junit:1.1.5 is included
  - [x] 1.2.3 Verify androidx.test:runner:1.5.2 is included
  - [x] 1.2.4 Add androidx.test:rules:1.5.0 if missing

### 2. Create DAO Tests (8 DAOs)

- [x] 2.1 Create UserDaoTest
  - [x] 2.1.1 Test insertUser and getUserById
  - [x] 2.1.2 Test updateUser
  - [x] 2.1.3 Test deleteUser
  - [x] 2.1.4 Test getUserByEmail (if exists)
  - [x] 2.1.5 Test Flow emissions on data changes

- [x] 2.2 Create LearningProfileDaoTest
  - [x] 2.2.1 Test insertProfile and getProfileById
  - [x] 2.2.2 Test getProfilesByUserId with Flow
  - [x] 2.2.3 Test updateProfile
  - [x] 2.2.4 Test deleteProfile
  - [x] 2.2.5 Test multiple profiles for same user

- [x] 2.3 Create ProfileDaoTest
  - [x] 2.3.1 Test insertProfile and getProfileById
  - [x] 2.3.2 Test getAllProfiles with Flow
  - [x] 2.3.3 Test updateProfile
  - [x] 2.3.4 Test deleteProfile
  - [x] 2.3.5 Test profile with null fields

- [x] 2.4 Create LessonDaoTest
  - [x] 2.4.1 Test insertLesson and getLessonById
  - [x] 2.4.2 Test getLessonsByUnit with Flow
  - [x] 2.4.3 Test updateLessonCompletion
  - [x] 2.4.4 Test deleteLesson
  - [x] 2.4.5 Test query filtering by difficulty
  - [x] 2.4.6 Test query sorting by order

- [x] 2.5 Create ExerciseDaoTest
  - [x] 2.5.1 Test insertExercise and getExerciseById
  - [x] 2.5.2 Test getExercisesByLesson with Flow
  - [x] 2.5.3 Test updateExercise
  - [x] 2.5.4 Test deleteExercise
  - [x] 2.5.5 Test query filtering by type
  - [x] 2.5.6 Test multiple exercises for same lesson

- [x] 2.6 Create UserStatsDaoTest
  - [x] 2.6.1 Test insertUserStats and getUserStats
  - [x] 2.6.2 Test getUserStats Flow emissions
  - [x] 2.6.3 Test updateXp
  - [x] 2.6.4 Test updateStreak
  - [x] 2.6.5 Test updateHearts
  - [x] 2.6.6 Test updateGems
  - [x] 2.6.7 Test REPLACE strategy on conflict

- [x] 2.7 Create AchievementDaoTest
  - [x] 2.7.1 Test insertAchievement and getAchievementById
  - [x] 2.7.2 Test getAllAchievements with Flow
  - [x] 2.7.3 Test getUnlockedAchievements
  - [x] 2.7.4 Test updateAchievementProgress
  - [x] 2.7.5 Test deleteAchievement
  - [x] 2.7.6 Test query filtering by category

- [x] 2.8 Create LearningPathNodeDaoTest
  - [x] 2.8.1 Test insertNode and getNodeById
  - [x] 2.8.2 Test getNodesByPath with Flow
  - [x] 2.8.3 Test updateNodeStatus
  - [x] 2.8.4 Test updateLegendaryUnlocked
  - [x] 2.8.5 Test deleteNode
  - [x] 2.8.6 Test query filtering by unit
  - [x] 2.8.7 Test query sorting by position

### 3. Verify DAO Test Coverage

- [x] 3.1 Run all DAO tests and verify 100% pass rate
- [x] 3.2 Generate test coverage report
- [x] 3.3 Verify 100% coverage of DAO methods
- [x] 3.4 Fix any failing tests
- [x] 3.5 Document any known limitations

---

## Phase 6: UI and Integration Testing (Week 2)

### 4. Setup UI Testing Infrastructure

- [x] 4.1 Create BaseComposeTest abstract class
  - [x] 4.1.1 Add ComposeTestRule setup
  - [x] 4.1.2 Add common test helpers (waitForIdle, etc.)
  - [x] 4.1.3 Add semantic matcher utilities
  - [ ] 4.1.4 Add screenshot capture utilities (optional)

- [x] 4.2 Update build.gradle.kts for UI testing
  - [x] 4.2.1 Verify androidx.compose.ui:ui-test-junit4 is included
  - [x] 4.2.2 Verify androidx.compose.ui:ui-test-manifest is included
  - [x] 4.2.3 Add test orchestration configuration

### 5. Create UI Tests for Core Screens (Priority Screens)

- [x] 5.1 Create HomeScreenTest
  - [x] 5.1.1 Test loading state displays progress indicator
  - [x] 5.1.2 Test success state displays user stats
  - [x] 5.1.3 Test error state displays error message
  - [x] 5.1.4 Test refresh action triggers reload
  - [x] 5.1.5 Test navigation to other screens

- [x] 5.2 Create LessonScreenTest
  - [x] 5.2.1 Test tab navigation (Vocabulary, Grammar, Culture)
  - [x] 5.2.2 Test vocabulary cards display correctly
  - [x] 5.2.3 Test grammar cards display correctly
  - [x] 5.2.4 Test culture cards display correctly
  - [x] 5.2.5 Test complete lesson button navigation

- [x] 5.3 Create ExerciseScreenTest
  - [x] 5.3.1 Test multiple choice exercise rendering
  - [x] 5.3.2 Test fill-in-blank exercise rendering
  - [x] 5.3.3 Test answer selection interaction
  - [x] 5.3.4 Test submit button enables after selection
  - [x] 5.3.5 Test feedback banner displays after submit
  - [x] 5.3.6 Test navigation to results screen

- [x] 5.4 Create LearningPathScreenTest
  - [x] 5.4.1 Test path nodes render correctly
  - [x] 5.4.2 Test node status indicators (locked, available, completed)
  - [x] 5.4.3 Test unit grouping displays correctly
  - [x] 5.4.4 Test node click navigation
  - [x] 5.4.5 Test legendary unlock indicator

- [x] 5.5 Create LearnScreenTest
  - [x] 5.5.1 Test profile cards display correctly
  - [x] 5.5.2 Test profile selection interaction
  - [x] 5.5.3 Test navigation to learning path
  - [x] 5.5.4 Test refresh action

### 6. Create UI Tests for Secondary Screens

- [x] 6.1 Create ProfileScreenTest
  - [x] 6.1.1 Test user stats display
  - [x] 6.1.2 Test achievements display
  - [x] 6.1.3 Test level progress display
  - [x] 6.1.4 Test logout button interaction

- [x] 6.2 Create ProgressScreenTest
  - [x] 6.2.1 Test overview stats display
  - [x] 6.2.2 Test charts render correctly
  - [x] 6.2.3 Test time period filter interaction

- [x] 6.3 Create AchievementsScreenTest
  - [x] 6.3.1 Test achievement cards display
  - [x] 6.3.2 Test category filter interaction
  - [x] 6.3.3 Test locked vs unlocked states

- [x] 6.4 Create LeaderboardScreenTest
  - [x] 6.4.1 Test leaderboard entries display
  - [x] 6.4.2 Test league tabs interaction
  - [x] 6.4.3 Test podium display for top 3

- [x] 6.5 Create SettingsScreenTest
  - [x] 6.5.1 Test settings options display
  - [x] 6.5.2 Test toggle switches interaction
  - [x] 6.5.3 Test logout confirmation dialog

### 7. Setup Integration Testing Infrastructure

- [x] 7.1 Create Hilt test modules
  - [x] 7.1.1 Create TestAppModule with test dependencies
  - [x] 7.1.2 Create TestDatabaseModule with in-memory database
  - [x] 7.1.3 Create TestNetworkModule with MockWebServer

- [x] 7.2 Create BaseIntegrationTest abstract class
  - [x] 7.2.1 Add HiltAndroidRule setup
  - [x] 7.2.2 Add ComposeTestRule setup
  - [x] 7.2.3 Add MockWebServer setup and teardown
  - [x] 7.2.4 Add database cleanup utilities

- [x] 7.3 Update build.gradle.kts for integration testing
  - [x] 7.3.1 Add com.google.dagger:hilt-android-testing:2.48
  - [x] 7.3.2 Add com.squareup.okhttp3:mockwebserver:4.12.0
  - [x] 7.3.3 Configure kspAndroidTest for Hilt compiler

### 8. Create Integration Tests (Critical User Journeys)

- [x] 8.1 Create AuthenticationFlowTest
  - [x] 8.1.1 Test splash screen checks token
  - [x] 8.1.2 Test navigation to login when no token
  - [x] 8.1.3 Test login success navigates to home
  - [x] 8.1.4 Test login failure shows error
  - [x] 8.1.5 Test navigation to home when valid token exists

- [x] 8.2 Create LessonCompletionFlowTest
  - [x] 8.2.1 Test navigation from learn to lesson
  - [x] 8.2.2 Test viewing all lesson tabs
  - [x] 8.2.3 Test completing lesson navigates to exercises
  - [x] 8.2.4 Test completing exercises shows results
  - [x] 8.2.5 Test XP is updated in database
  - [x] 8.2.6 Test lesson status updated to completed

- [x] 8.3 Create PracticeSessionFlowTest
  - [x] 8.3.1 Test navigation to practice screen
  - [x] 8.3.2 Test starting practice session
  - [x] 8.3.3 Test answering practice exercises
  - [x] 8.3.4 Test completing practice shows XP reward
  - [x] 8.3.5 Test database updated with practice results

- [x] 8.4 Create ProfileManagementFlowTest
  - [x] 8.4.1 Test navigation to profile screen
  - [x] 8.4.2 Test viewing profile stats
  - [x] 8.4.3 Test viewing achievements
  - [x] 8.4.4 Test logout flow with confirmation

- [x] 8.5 Create OfflineModeFlowTest
  - [x] 8.5.1 Test app loads cached data when offline
  - [x] 8.5.2 Test offline indicator displays
  - [x] 8.5.3 Test operations queue when offline
  - [x] 8.5.4 Test sync when back online
  - [x] 8.5.5 Test conflict resolution (if applicable)

### 9. Verify Test Coverage

- [x] 9.1 Run all UI tests and verify pass rate
- [x] 9.2 Run all integration tests and verify pass rate
- [x] 9.3 Generate combined test coverage report
- [x] 9.4 Verify overall coverage >80%
- [x] 9.5 Identify and test any uncovered critical paths

---

## Phase 6: Performance Testing (Week 2-3)

### 10. Setup Performance Testing

- [ ] 10.1 Add Macrobenchmark library for startup testing
- [ ] 10.2 Configure Android Profiler for memory/CPU profiling
- [ ] 10.3 Enable Compose Compiler Metrics
- [ ] 10.4 Setup APK Analyzer for size analysis

### 11. Measure and Optimize Performance

- [ ] 11.1 Measure app startup time
  - [ ] 11.1.1 Run Macrobenchmark startup test
  - [ ] 11.1.2 Analyze startup trace
  - [ ] 11.1.3 Optimize if >2 seconds
  - [ ] 11.1.4 Verify improvement

- [ ] 11.2 Measure screen transition performance
  - [ ] 11.2.1 Profile frame rates during navigation
  - [ ] 11.2.2 Identify janky transitions
  - [ ] 11.2.3 Optimize recomposition
  - [ ] 11.2.4 Verify 60 FPS maintained

- [ ] 11.3 Measure memory usage
  - [ ] 11.3.1 Profile memory during typical usage
  - [ ] 11.3.2 Check for memory leaks with LeakCanary
  - [ ] 11.3.3 Optimize if >200MB
  - [ ] 11.3.4 Verify no leaks

- [ ] 11.4 Measure APK size
  - [ ] 11.4.1 Build release APK
  - [ ] 11.4.2 Analyze with APK Analyzer
  - [ ] 11.4.3 Optimize resources if >50MB
  - [ ] 11.4.4 Enable R8 full mode
  - [ ] 11.4.5 Verify final size <50MB

- [ ] 11.5 Measure database performance
  - [ ] 11.5.1 Profile query execution times
  - [ ] 11.5.2 Add indexes for slow queries
  - [ ] 11.5.3 Verify queries <100ms

---

## Phase 6: Accessibility & Localization (Week 3)

### 12. Accessibility Audit and Fixes

- [ ] 12.1 Add content descriptions to all interactive elements
  - [ ] 12.1.1 Audit all screens for missing descriptions
  - [ ] 12.1.2 Add semantics to Compose components
  - [ ] 12.1.3 Test with TalkBack enabled
  - [ ] 12.1.4 Fix any navigation issues

- [ ] 12.2 Verify text contrast ratios
  - [ ] 12.2.1 Audit all text colors
  - [ ] 12.2.2 Fix any failing contrast ratios
  - [ ] 12.2.3 Test in light and dark themes

- [ ] 12.3 Verify touch target sizes
  - [ ] 12.3.1 Audit all interactive elements
  - [ ] 12.3.2 Increase size to 48dp minimum
  - [ ] 12.3.3 Test on physical device

- [ ] 12.4 Test keyboard navigation
  - [ ] 12.4.1 Test tab navigation through screens
  - [ ] 12.4.2 Test enter key for actions
  - [ ] 12.4.3 Fix any focus issues

### 13. Localization Preparation

- [ ] 13.1 Externalize all strings
  - [ ] 13.1.1 Audit code for hardcoded strings
  - [ ] 13.1.2 Move to strings.xml
  - [ ] 13.1.3 Verify no hardcoded strings remain

- [ ] 13.2 Test RTL layout
  - [ ] 13.2.1 Enable RTL in developer options
  - [ ] 13.2.2 Test all screens in RTL mode
  - [ ] 13.2.3 Fix any layout issues
  - [ ] 13.2.4 Use start/end instead of left/right

- [ ] 13.3 Localize date/time formatting
  - [ ] 13.3.1 Use DateFormat with locale
  - [ ] 13.3.2 Test with different locales
  - [ ] 13.3.3 Fix any hardcoded formats

- [ ] 13.4 Localize number formatting
  - [ ] 13.4.1 Use NumberFormat with locale
  - [ ] 13.4.2 Test with different locales
  - [ ] 13.4.3 Fix any hardcoded formats

---

## Phase 6: Release Preparation (Week 3)

### 14. Security Hardening

- [x] 14.1 Externalize API keys and secrets
  - [x] 14.1.1 Move to local.properties
  - [x] 14.1.2 Use BuildConfig for access
  - [x] 14.1.3 Add local.properties to .gitignore
  - [x] 14.1.4 Document setup in README

- [x] 14.2 Enforce HTTPS
  - [x] 14.2.1 Configure network security config
  - [x] 14.2.2 Disable cleartext traffic
  - [x] 14.2.3 Test all network requests use HTTPS

- [ ] 14.3 Enable certificate pinning (optional)
  - [ ] 14.3.1 Add certificate pins to network config
  - [ ] 14.3.2 Test with pinned certificates
  - [ ] 14.3.3 Document pin rotation process

- [ ] 14.4 Encrypt sensitive data
  - [ ] 14.4.1 Use EncryptedSharedPreferences for tokens
  - [ ] 14.4.2 Verify no sensitive data in logs
  - [ ] 14.4.3 Test data encryption

### 15. ProGuard/R8 Configuration

- [x] 15.1 Configure ProGuard rules
  - [x] 15.1.1 Add rules for Retrofit
  - [x] 15.1.2 Add rules for Room
  - [x] 15.1.3 Add rules for Gson
  - [x] 15.1.4 Add rules for Hilt
  - [x] 15.1.5 Add rules for Compose

- [ ] 15.2 Test release build
  - [ ] 15.2.1 Build release APK
  - [ ] 15.2.2 Install and test on device
  - [ ] 15.2.3 Verify all features work
  - [ ] 15.2.4 Fix any ProGuard issues

- [ ] 15.3 Enable R8 full mode
  - [ ] 15.3.1 Set android.enableR8.fullMode=true
  - [ ] 15.3.2 Test release build
  - [ ] 15.3.3 Verify APK size reduction

### 16. Signing Configuration

- [ ] 16.1 Create release keystore
  - [ ] 16.1.1 Generate keystore with keytool
  - [ ] 16.1.2 Store securely (not in repo)
  - [ ] 16.1.3 Document keystore details

- [x] 16.2 Configure signing in build.gradle
  - [x] 16.2.1 Add signingConfigs block
  - [x] 16.2.2 Reference keystore from local.properties
  - [x] 16.2.3 Apply to release build type

- [ ] 16.3 Test signed release build
  - [ ] 16.3.1 Build signed APK
  - [ ] 16.3.2 Verify signature
  - [ ] 16.3.3 Install and test

### 17. Play Store Assets

- [ ] 17.1 Create app icon
  - [ ] 17.1.1 Design 512x512 icon
  - [ ] 17.1.2 Generate adaptive icon
  - [ ] 17.1.3 Add to all density folders
  - [ ] 17.1.4 Test on different devices

- [ ] 17.2 Create feature graphic
  - [ ] 17.2.1 Design 1024x500 graphic
  - [ ] 17.2.2 Export in PNG format
  - [ ] 17.2.3 Verify quality

- [ ] 17.3 Capture screenshots
  - [ ] 17.3.1 Take phone screenshots (5-8)
  - [ ] 17.3.2 Take tablet screenshots (optional)
  - [ ] 17.3.3 Ensure high quality
  - [ ] 17.3.4 Show key features

- [ ] 17.4 Write app description
  - [ ] 17.4.1 Write short description (80 chars)
  - [ ] 17.4.2 Write full description (4000 chars)
  - [ ] 17.4.3 Highlight key features
  - [ ] 17.4.4 Include keywords for SEO

- [ ] 17.5 Create privacy policy
  - [ ] 17.5.1 Document data collection
  - [ ] 17.5.2 Document data usage
  - [ ] 17.5.3 Document third-party services
  - [ ] 17.5.4 Host on public URL

- [ ] 17.6 Write release notes
  - [ ] 17.6.1 List new features
  - [ ] 17.6.2 List improvements
  - [ ] 17.6.3 List bug fixes
  - [ ] 17.6.4 Keep concise and clear

### 18. Code Quality Checks

- [ ] 18.1 Run lint checks
  - [ ] 18.1.1 Run ./gradlew lint
  - [ ] 18.1.2 Review lint report
  - [ ] 18.1.3 Fix critical issues
  - [ ] 18.1.4 Suppress false positives

- [ ] 18.2 Run static analysis
  - [ ] 18.2.1 Run detekt (if configured)
  - [ ] 18.2.2 Review analysis report
  - [ ] 18.2.3 Fix code smells

- [ ] 18.3 Check for memory leaks
  - [ ] 18.3.1 Add LeakCanary dependency
  - [ ] 18.3.2 Run app and test features
  - [ ] 18.3.3 Review leak reports
  - [ ] 18.3.4 Fix any leaks

- [ ] 18.4 Verify test coverage
  - [ ] 18.4.1 Generate coverage report
  - [ ] 18.4.2 Verify >80% coverage
  - [ ] 18.4.3 Add tests for uncovered code

### 19. Beta Testing

- [ ] 19.1 Setup internal testing track
  - [ ] 19.1.1 Create Play Console account
  - [ ] 19.1.2 Create app listing
  - [ ] 19.1.3 Upload first APK/AAB
  - [ ] 19.1.4 Add internal testers

- [ ] 19.2 Conduct internal testing
  - [ ] 19.2.1 Distribute to team (5-10 people)
  - [ ] 19.2.2 Test for 3-5 days
  - [ ] 19.2.3 Collect feedback
  - [ ] 19.2.4 Fix critical bugs

- [ ] 19.3 Setup closed beta track
  - [ ] 19.3.1 Create closed beta release
  - [ ] 19.3.2 Add beta testers (50+ people)
  - [ ] 19.3.3 Distribute beta build

- [ ] 19.4 Conduct closed beta testing
  - [ ] 19.4.1 Test for 1-2 weeks
  - [ ] 19.4.2 Monitor crash reports
  - [ ] 19.4.3 Collect user feedback
  - [ ] 19.4.4 Fix critical bugs
  - [ ] 19.4.5 Release beta updates

- [ ] 19.5 Setup open beta track (optional)
  - [ ] 19.5.1 Create open beta release
  - [ ] 19.5.2 Distribute to wider audience (500+)
  - [ ] 19.5.3 Test for 2-4 weeks
  - [ ] 19.5.4 Monitor and fix issues

### 20. Final Release Preparation

- [ ] 20.1 Final testing checklist
  - [ ] 20.1.1 All tests passing
  - [ ] 20.1.2 No critical bugs
  - [ ] 20.1.3 Performance targets met
  - [ ] 20.1.4 Accessibility verified
  - [ ] 20.1.5 Security hardened

- [ ] 20.2 Prepare production release
  - [ ] 20.2.1 Build signed release AAB
  - [ ] 20.2.2 Verify version code/name
  - [ ] 20.2.3 Test on multiple devices
  - [ ] 20.2.4 Create release tag in git

- [ ] 20.3 Submit to Play Store
  - [ ] 20.3.1 Upload release AAB
  - [ ] 20.3.2 Complete store listing
  - [ ] 20.3.3 Set pricing and distribution
  - [ ] 20.3.4 Submit for review

- [ ] 20.4 Post-launch monitoring
  - [ ] 20.4.1 Monitor crash reports
  - [ ] 20.4.2 Monitor user reviews
  - [ ] 20.4.3 Track analytics
  - [ ] 20.4.4 Plan hotfix if needed

---

## Summary

**Total Tasks**: 20 major tasks, 200+ subtasks  
**Estimated Timeline**: 2-3 weeks  
**Priority Order**: Phase 5 DAO tests → UI tests → Integration tests → Performance → Release prep

**Current Progress**:
- Phase 1-4: ✅ Complete (100%)
- Phase 5: 🔄 In Progress (70% - Repository & Mapper tests done)
- Phase 6: ⏳ Pending (0%)

**Next Immediate Steps**:
1. Complete DAO testing infrastructure (Task 1)
2. Create all 8 DAO tests (Task 2)
3. Verify DAO test coverage (Task 3)
4. Begin UI testing setup (Task 4)

---

**Tasks Status**: Complete  
**Ready for Implementation**: Yes  
**Blockers**: None

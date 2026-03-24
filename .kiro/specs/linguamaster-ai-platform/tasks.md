# Implementation Plan: LinguaMaster AI-Powered Language Learning Platform

## Overview

This implementation plan breaks down the LinguaMaster platform into discrete, actionable coding tasks. The platform uses React 18 + TypeScript for the frontend, Express + TypeScript for the backend, PostgreSQL with Drizzle ORM for data persistence, and integrates Google Gemini and OpenAI services for AI-powered features.

The implementation follows an incremental approach: database schema → backend services → API endpoints → frontend components → integration → testing. Each task builds on previous work to ensure no orphaned code.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize monorepo structure with frontend and backend directories
  - Configure TypeScript for both frontend and backend
  - Set up Vite for frontend build tooling
  - Install core dependencies: React 18, Express, Drizzle ORM, TanStack Query, shadcn/ui, Tailwind CSS
  - Install AI service SDKs: @google/generative-ai, openai
  - Configure environment variables for API keys and database connection
  - Set up ESLint and Prettier for code quality
  - _Requirements: 20.1, 20.2, 21.1, 25.6_

- [x] 2. Implement database schema and ORM configuration
  - [x] 2.1 Create Drizzle schema for core tables
    - Define users table with authentication fields
    - Define learning_profiles table with proficiency tracking
    - Define sessions table for authentication
    - Configure PostgreSQL connection with Drizzle
    - _Requirements: 1.6, 2.2, 19.1, 19.3_
  
  - [x] 2.2 Create Drizzle schema for curriculum and lessons
    - Define curricula table
    - Define lessons table with vocabulary, grammar, and cultural content as JSONB
    - Define lesson_completions table with performance metrics
    - Add foreign key relationships
    - _Requirements: 3.6, 5.6, 19.1_
  
  - [x] 2.3 Create Drizzle schema for exercises and practice
    - Define exercises table with type and difficulty
    - Define exercise_submissions table with results
    - _Requirements: 6.6, 19.1_
  
  - [x] 2.4 Create Drizzle schema for voice and speech
    - Define voice_sessions table with conversation history
    - Define pronunciation_analyses table with phoneme data
    - _Requirements: 7.7, 8.6, 19.1_
  
  - [x] 2.5 Create Drizzle schema for gamification
    - Define achievements table
    - Define user_achievements table with progress tracking
    - Define challenges table
    - Define user_challenges table
    - Define xp_gains table with source tracking
    - _Requirements: 10.4, 11.5, 12.5, 13.4, 19.1_
  
  - [x] 2.6 Create Drizzle schema for AI sessions and analytics
    - Define ai_session_contexts table
    - Define activity_summaries table
    - Define pronunciation_trends table
    - Add indexes for performance optimization
    - _Requirements: 22.4, 23.3, 19.1_
  
  - [x] 2.7 Create database migration system
    - Set up Drizzle migration configuration
    - Create initial migration with all tables
    - Test migration on local PostgreSQL instance
    - _Requirements: 19.1, 19.3_

- [x] 3. Implement AI service integrations
  - [x] 3.1 Create GeminiService for content generation
    - Implement generateCurriculum method using Gemini 1.5 Flash
    - Implement generateLesson method with vocabulary, grammar, and cultural content
    - Implement generateConversationResponse for voice teaching
    - Implement explainConcept for AI tutoring
    - Add error handling and retry logic
    - _Requirements: 3.2, 5.3, 5.4, 5.5, 7.1, 9.2, 18.1_
  
  - [x] 3.2 Create OpenAIService for exercises and translation
    - Implement generateExercises method using GPT-4o
    - Implement translateText method
    - Implement evaluateAnswer method for exercise grading
    - Implement generateCurriculumFallback as backup for Gemini
    - Add error handling and retry logic
    - _Requirements: 6.2, 18.2, 18.4_
  
  - [x] 3.3 Create WhisperService for speech processing
    - Implement transcribeAudio method using Whisper API
    - Implement analyzePronunciation method
    - Handle audio format conversion if needed
    - Add error handling for audio processing failures
    - _Requirements: 7.3, 8.1, 18.3_
  
  - [x] 3.4 Add AI service monitoring and fallback logic
    - Implement service health checks
    - Add fallback from Gemini to OpenAI when Gemini fails
    - Log all AI service requests and responses
    - Track response times and success rates
    - _Requirements: 18.4, 18.5, 18.6, 24.2_

- [x] 4. Implement core backend services
  - [x] 4.1 Create CurriculumService
    - Implement generateLearningPath using GeminiService
    - Implement getNextLesson based on learning profile
    - Implement getLessonById for lesson retrieval
    - Implement markLessonComplete with performance tracking
    - Store generated curriculum in database
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 5.1_
  
  - [x] 4.2 Create AdaptiveLearningService
    - Implement analyzePerformance to track accuracy and error patterns
    - Implement updateProficiencyLevel based on advancement criteria
    - Implement identifyWeaknesses from performance patterns
    - Implement adjustDifficulty based on recent performance
    - Implement recommendNextActivity
    - Maintain history of profile changes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 4.3 Create VoiceTeachingService
    - Implement startVoiceSession with initial prompt
    - Implement processVoiceInput using WhisperService and GeminiService
    - Implement endVoiceSession with transcript storage
    - Implement getSessionHistory
    - Maintain conversation context during session
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [x] 4.4 Create SpeechService
    - Implement analyzePronunciation using WhisperService
    - Implement pronunciation scoring algorithm (0-100 scale)
    - Implement generatePronunciationExercises for problematic phonemes
    - Implement trackPronunciationProgress over time
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [x] 4.5 Create AITeacherService
    - Implement answerQuestion using GeminiService
    - Implement maintainContext for conversation continuity
    - Implement getConversationHistory
    - Implement clearContext for session cleanup
    - Adapt explanation complexity based on proficiency level
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 5. Implement authentication and user management
  - [x] 5.1 Create authentication middleware with Passport.js
    - Configure Passport local strategy
    - Implement JWT token generation and validation
    - Create authentication middleware for protected routes
    - Implement session timeout after 24 hours
    - _Requirements: 1.1, 1.3, 21.4, 25.5_
  
  - [x] 5.2 Create user registration and login endpoints
    - POST /api/auth/register with email validation
    - Hash passwords using bcrypt before storage
    - POST /api/auth/login with credential validation
    - Return JWT token on successful authentication
    - Handle invalid credentials with appropriate error messages
    - _Requirements: 1.2, 1.3, 1.4, 25.1_
  
  - [x] 5.3 Create user profile management endpoints
    - GET /api/auth/me to retrieve current user
    - PUT /api/auth/profile to update user information
    - POST /api/auth/logout to invalidate session
    - _Requirements: 1.5, 1.6_
  
  - [x]* 5.4 Write unit tests for authentication
    - Test registration with valid and invalid data
    - Test login with correct and incorrect credentials
    - Test JWT token validation
    - Test session timeout
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6. Implement language profile endpoints
  - [x] 6.1 Create language and profile management endpoints
    - GET /api/languages to return supported languages (Spanish, Mandarin, English, Hindi, Arabic)
    - POST /api/profiles to create new learning profile
    - Initialize proficiency level as Beginner on profile creation
    - GET /api/profiles/:languageId to retrieve specific profile
    - GET /api/profiles to list all user profiles
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x]* 6.2 Write unit tests for profile management
    - Test profile creation with valid languages
    - Test multiple profile creation for same user
    - Test profile retrieval
    - _Requirements: 2.1, 2.2, 2.5_

- [x] 7. Implement curriculum and lesson endpoints
  - [x] 7.1 Create curriculum generation endpoint
    - POST /api/curriculum/generate using CurriculumService
    - Generate at least 10 lessons per proficiency level
    - Include cultural content in lessons
    - Store curriculum in database
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 7.2 Create lesson delivery endpoints
    - GET /api/lessons/next using AdaptiveLearningService
    - GET /api/lessons/:lessonId for specific lesson retrieval
    - POST /api/lessons/:lessonId/complete with performance metrics
    - Award XP on lesson completion
    - Update learning profile based on performance
    - GET /api/lessons/history for completed lessons
    - _Requirements: 5.1, 5.2, 5.6, 5.7, 10.1_
  
  - [x]* 7.3 Write integration tests for curriculum flow
    - Test curriculum generation for all languages
    - Test lesson progression based on proficiency
    - Test lesson completion and XP award
    - _Requirements: 3.1, 5.1, 5.6_

- [x] 8. Implement exercise generation and evaluation endpoints
  - [x] 8.1 Create exercise endpoints
    - POST /api/exercises/generate using OpenAIService
    - Target identified weakness areas
    - Adjust difficulty based on proficiency level
    - Generate at least 5 exercises per session
    - POST /api/exercises/submit with answer evaluation
    - Provide immediate feedback on correctness
    - Award XP proportional to accuracy
    - Track performance for adaptive engine
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.2_
  
  - [x]* 8.2 Write unit tests for exercise generation
    - Test exercise generation for different weakness areas
    - Test difficulty adjustment
    - Test answer evaluation accuracy
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 9. Implement voice teaching endpoints
  - [x] 9.1 Create voice interaction endpoints
    - POST /api/voice/start using VoiceTeachingService
    - Return initial prompt in target language
    - POST /api/voice/interact with audio data
    - Convert speech to text using WhisperService
    - Generate contextual response using GeminiService
    - Provide corrections and explanations for errors
    - POST /api/voice/end with transcript storage
    - Award XP for voice lesson completion
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 10.3_
  
  - [x]* 9.2 Write integration tests for voice flow
    - Test voice session creation
    - Test speech transcription
    - Test conversation context maintenance
    - Test session completion and storage
    - _Requirements: 7.1, 7.3, 7.7_

- [x] 10. Implement pronunciation coaching endpoints
  - [x] 10.1 Create pronunciation analysis endpoint
    - POST /api/speech/analyze using SpeechService
    - Compare learner speech against native patterns
    - Calculate pronunciation accuracy score (0-100)
    - Identify problematic phonemes
    - Provide audio examples of correct pronunciation
    - Generate targeted pronunciation exercises
    - Track pronunciation improvement in learning profile
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [x]* 10.2 Write unit tests for pronunciation analysis
    - Test pronunciation scoring algorithm
    - Test phoneme identification
    - Test exercise generation for problematic sounds
    - _Requirements: 8.2, 8.3, 8.7_

- [x] 11. Implement AI tutor endpoints
  - [x] 11.1 Create AI tutor interaction endpoints
    - POST /api/tutor/ask using AITeacherService
    - Answer questions about vocabulary, grammar, pronunciation, and culture
    - Provide examples and analogies
    - Maintain conversation context within session
    - Adapt explanation complexity to proficiency level
    - GET /api/tutor/history/:sessionId for conversation review
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [x]* 11.2 Write unit tests for AI tutor
    - Test question answering for different topics
    - Test context maintenance
    - Test explanation complexity adaptation
    - _Requirements: 9.2, 9.3, 9.6_

- [x] 12. Implement gamification endpoints
  - [x] 12.1 Create XP tracking endpoints
    - GET /api/gamification/xp to retrieve total and recent XP
    - Implement XP calculation based on performance and difficulty
    - Award XP for lessons, exercises, and voice sessions
    - Maintain cumulative XP total
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 12.2 Create achievement system endpoints
    - Define achievements for milestones (streaks, XP, lessons, proficiency)
    - GET /api/gamification/achievements to list all achievements
    - Implement achievement unlock detection
    - Send notifications when achievements are unlocked
    - Display earned achievements in profile
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 12.3 Create daily challenge endpoints
    - Generate new daily challenge every 24 hours
    - Tailor challenge to proficiency level and weaknesses
    - GET /api/gamification/daily-challenge for current challenge
    - POST /api/gamification/daily-challenge/complete with bonus XP
    - Reset incomplete challenges after 24 hours
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 12.4 Create streak tracking endpoints
    - GET /api/gamification/streak for current streak
    - Track consecutive days of learning activity
    - Increment streak on daily activity completion
    - Reset streak to zero on missed days
    - Award bonus XP for streak milestones
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 12.5 Create leaderboard endpoints
    - GET /api/gamification/leaderboard with filtering
    - Rank learners by total XP
    - Update rankings in real-time
    - Display top 100 learners
    - Show current user rank if not in top 100
    - Filter by target language
    - Filter by time period (daily, weekly, all-time)
    - Aggregate XP across all languages for rankings
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 17.4_
  
  - [x]* 12.6 Write unit tests for gamification
    - Test XP calculation and awarding
    - Test achievement unlock detection
    - Test daily challenge generation and reset
    - Test streak tracking and reset logic
    - Test leaderboard ranking and filtering
    - _Requirements: 10.1, 11.2, 12.1, 13.2, 14.2_

- [x] 13. Implement progress tracking and analytics endpoints
  - [x] 13.1 Create progress dashboard endpoint
    - GET /api/progress/:profileId for comprehensive progress data
    - Display total XP, current streak, proficiency level
    - Show completed lessons, exercises, voice sessions
    - Calculate average accuracy
    - Track total learning time
    - _Requirements: 15.1, 15.2_
  
  - [x] 13.2 Create analytics endpoints
    - GET /api/progress/:profileId/weaknesses for identified weak areas
    - GET /api/progress/:profileId/pronunciation for pronunciation trends
    - GET /api/progress/:profileId/analytics with time range filtering
    - Provide visualizations data for charts and graphs
    - Show improvement recommendations
    - Display earned and locked achievements
    - _Requirements: 15.3, 15.4, 15.5, 15.6_
  
  - [x]* 13.3 Write unit tests for analytics
    - Test progress calculation accuracy
    - Test weakness identification
    - Test pronunciation trend tracking
    - _Requirements: 15.2, 15.4, 15.5_

- [x] 14. Implement API middleware and security
  - [x] 14.1 Add request validation middleware
    - Validate all API request parameters
    - Sanitize user inputs to prevent injection attacks
    - Return appropriate error messages for invalid requests
    - _Requirements: 21.5, 25.4_
  
  - [x] 14.2 Add security middleware
    - Implement CORS policies
    - Add rate limiting to prevent AI service abuse
    - Implement HTTPS enforcement for production
    - Add security headers
    - _Requirements: 21.7, 25.2, 25.3_
  
  - [x] 14.3 Add error handling middleware
    - Implement global error handler
    - Return appropriate HTTP status codes
    - Log errors with timestamps and stack traces
    - Categorize errors by severity
    - Implement error boundaries
    - _Requirements: 21.6, 24.1, 24.3, 24.4, 24.6_
  
  - [x] 14.4 Add logging middleware
    - Log all API requests and responses
    - Log AI service interactions
    - Implement structured logging
    - _Requirements: 24.1, 24.2_

- [x] 15. Checkpoint - Backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement frontend core layout components
  - [x] 16.1 Create AppLayout component
    - Implement main application shell with navigation
    - Add responsive layout for desktop, tablet, mobile
    - Display authentication state
    - Handle route rendering
    - _Requirements: 20.1, 20.5_
  
  - [x] 16.2 Create Dashboard component
    - Display total XP, current streak, proficiency level
    - Show daily challenge status
    - Provide quick access to next lesson
    - Display recent achievements
    - Use TanStack Query for data fetching
    - _Requirements: 15.1, 20.3_
  
  - [x] 16.3 Create NavigationBar component
    - Implement route navigation between sections
    - Add language switching for multi-language learners
    - Provide profile access
    - Use shadcn/ui components
    - _Requirements: 17.3, 20.4_
  
  - [x]* 16.4 Write component tests for layout
    - Test responsive layout rendering
    - Test navigation functionality
    - Test authentication state display
    - _Requirements: 20.1, 20.5_

- [x] 17. Implement frontend authentication components
  - [x] 17.1 Create registration and login forms
    - Build registration form with email and password validation
    - Build login form with credential validation
    - Display error messages for invalid inputs
    - Handle authentication state with TanStack Query
    - Store JWT token in local storage
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 20.7_
  
  - [x] 17.2 Create profile management component
    - Display user profile information
    - Allow profile updates
    - Show all learning profiles
    - _Requirements: 1.5, 2.5_
  
  - [x]* 17.3 Write component tests for authentication
    - Test form validation
    - Test successful login flow
    - Test error handling
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 18. Implement frontend learning components
  - [x] 18.1 Create LessonViewer component
    - Display vocabulary with translations and pronunciation
    - Display grammar explanations with examples
    - Display cultural content with images
    - Track lesson progress
    - Submit lesson completion with performance metrics
    - Show loading states during data fetching
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 20.6_
  
  - [x] 18.2 Create ExercisePractice component
    - Display exercise questions based on type
    - Collect user answers
    - Submit answers for evaluation
    - Show immediate feedback on correctness
    - Display explanations for incorrect answers
    - Track exercise progress
    - _Requirements: 6.5, 20.6_
  
  - [x] 18.3 Create VoiceLesson component
    - Implement audio recording functionality
    - Display conversation history
    - Submit audio for transcription
    - Show AI responses
    - Display pronunciation feedback
    - Handle recording states (idle, recording, processing)
    - _Requirements: 7.2, 7.4, 7.6, 20.6_
  
  - [x] 18.4 Create PronunciationCoach component
    - Display target phrase for pronunciation
    - Implement audio recording
    - Submit audio for analysis
    - Display pronunciation score (0-100)
    - Show problematic phonemes with feedback
    - Provide audio examples of correct pronunciation
    - _Requirements: 8.2, 8.3, 8.4, 8.5_
  
  - [x] 18.5 Create AITutor component
    - Implement chat interface
    - Display conversation history
    - Send questions to AI teacher
    - Receive and display explanations
    - Maintain conversation context
    - Show typing indicators during AI response
    - _Requirements: 9.1, 9.2, 9.4, 9.5_
  
  - [x]* 18.6 Write component tests for learning features
    - Test lesson content rendering
    - Test exercise submission and feedback
    - Test voice recording and playback
    - Test pronunciation scoring display
    - Test AI tutor conversation flow
    - _Requirements: 5.2, 6.5, 7.2, 8.3, 9.2_

- [x] 19. Implement frontend gamification components
  - [x] 19.1 Create XPDisplay component
    - Show total XP with animated counter
    - Display recent XP gains
    - Show level progress bar
    - _Requirements: 10.4, 10.5_
  
  - [x] 19.2 Create AchievementCard component
    - Display achievement icon, title, description
    - Show unlock status
    - Display progress toward unlock
    - _Requirements: 11.3, 11.4_
  
  - [x] 19.3 Create StreakTracker component
    - Display current streak count
    - Show calendar visualization
    - Highlight milestone indicators
    - _Requirements: 13.4_
  
  - [x] 19.4 Create DailyChallengeCard component
    - Display challenge description
    - Show progress bar
    - Display completion status
    - Show XP reward
    - _Requirements: 12.4_
  
  - [x] 19.5 Create Leaderboard component
    - Display top 100 learners
    - Show current user rank
    - Implement filtering by language and time period
    - Use pagination for large datasets
    - _Requirements: 14.3, 14.4, 14.5, 14.6, 23.6_
  
  - [x]* 19.6 Write component tests for gamification
    - Test XP display and animation
    - Test achievement unlock display
    - Test streak tracking display
    - Test leaderboard filtering
    - _Requirements: 10.5, 11.3, 13.4, 14.5_

- [x] 20. Implement frontend progress and analytics components
  - [x] 20.1 Create ProgressDashboard component
    - Display comprehensive progress statistics
    - Show charts for progress over time
    - Display activity breakdown
    - Implement time range selection
    - Use shadcn/ui chart components
    - _Requirements: 15.2, 15.3, 20.4_
  
  - [x] 20.2 Create WeaknessAnalysis component
    - List identified weakness areas
    - Show improvement trends for each weakness
    - Suggest targeted practice
    - _Requirements: 15.4_
  
  - [x] 20.3 Create PronunciationTrends component
    - Display line chart of pronunciation accuracy over time
    - Show phoneme-specific breakdowns
    - Highlight improvement areas
    - _Requirements: 15.5_
  
  - [x]* 20.4 Write component tests for analytics
    - Test chart rendering with data
    - Test weakness display
    - Test pronunciation trend visualization
    - _Requirements: 15.3, 15.4, 15.5_

- [x] 21. Implement multi-language support
  - [x] 21.1 Add language switching functionality
    - Allow profile creation for multiple languages
    - Implement language switcher in navigation
    - Maintain independent progress for each language
    - Display progress for all languages in dashboard
    - _Requirements: 17.1, 17.2, 17.3, 17.5_
  
  - [x]* 21.2 Write tests for multi-language support
    - Test multiple profile creation
    - Test language switching
    - Test independent progress tracking
    - _Requirements: 17.1, 17.2, 17.3_

- [x] 22. Implement caching and performance optimization
  - [x] 22.1 Configure TanStack Query caching
    - Set up cache configuration for frequently accessed data
    - Implement stale-while-revalidate pattern
    - Cache lesson content, user profiles, achievements
    - Display cached content immediately while fetching updates
    - _Requirements: 20.3, 23.1, 23.5_
  
  - [x] 22.2 Implement backend caching
    - Cache AI-generated content that can be reused
    - Cache curriculum data
    - Implement cache invalidation strategies
    - _Requirements: 23.2_
  
  - [x] 22.3 Optimize database queries
    - Add indexes for frequently queried fields
    - Optimize joins and aggregations
    - Implement pagination for large datasets
    - Ensure API responses within 2 seconds
    - _Requirements: 23.3, 23.4, 23.6_
  
  - [x]* 22.4 Write performance tests
    - Test API response times under load
    - Test cache hit rates
    - Test database query performance
    - _Requirements: 23.3, 23.4_

- [x] 23. Implement session management and context
  - [x] 23.1 Create session context management
    - Create session context on learning session start
    - Maintain conversation history for AI interactions
    - Store session transcripts on session end
    - Allow review of past session transcripts
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_
  
  - [x]* 23.2 Write tests for session management
    - Test session creation and cleanup
    - Test context maintenance
    - Test transcript storage and retrieval
    - _Requirements: 22.1, 22.4, 22.5_

- [x] 24. Implement cultural content integration
  - [x] 24.1 Enhance curriculum generation with cultural content
    - Include customs, traditions, etiquette in lessons
    - Add cultural context to vocabulary and grammar
    - Provide cultural explanations in AI tutor responses
    - Display cultural content with text, images, and media
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [x]* 24.2 Write tests for cultural content
    - Test cultural content inclusion in lessons
    - Test cultural context in AI responses
    - _Requirements: 16.1, 16.3_

- [x] 25. Final integration and end-to-end testing
  - [x] 25.1 Wire all components together
    - Connect frontend components to backend APIs
    - Ensure proper error handling throughout
    - Implement loading states for all async operations
    - Test complete user flows from registration to learning
    - _Requirements: 20.6, 20.7_
  
  - [x] 25.2 Implement database transactions
    - Add transactions for multi-record operations
    - Implement retry logic for failed writes
    - Ensure data consistency
    - _Requirements: 19.4, 19.6_
  
  - [x]* 25.3 Write end-to-end tests
    - Test complete registration and onboarding flow
    - Test lesson completion flow with XP and achievements
    - Test voice lesson flow with pronunciation feedback
    - Test exercise generation and submission flow
    - Test AI tutor interaction flow
    - Test daily challenge completion flow
    - Test leaderboard updates
    - Test multi-language profile management
    - _Requirements: 1.1, 5.6, 7.7, 6.5, 9.2, 12.3, 14.2, 17.3_
  
  - [x] 25.4 Perform security audit
    - Verify password encryption
    - Verify HTTPS enforcement
    - Verify CORS policies
    - Verify input sanitization
    - Verify session timeout
    - Verify API key protection
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6_

- [x] 26. Final checkpoint - Complete platform ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery = but you'll review them and starting working on them too once done = immediately
- Each task references specific requirements for traceability
- The implementation follows an incremental approach to ensure all code is integrated
- AI service integration includes fallback mechanisms for reliability
- Security and performance are addressed throughout the implementation
- The platform supports all 5 languages (Spanish, Mandarin Chinese, English, Hindi, Arabic) from the start
- Gamification features (XP, achievements, streaks, challenges, leaderboards) are core to the platform
- All AI interactions maintain context for natural conversation flow

## NB: what to do after development = open a new folder and proceed with creating an android app for this project 
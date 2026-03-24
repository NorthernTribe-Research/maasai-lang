# Design Document: LinguaMaster AI-Powered Language Learning Platform

## Overview

LinguaMaster is an AI-first language learning platform that leverages Google Gemini and OpenAI services to deliver personalized, adaptive language education. The platform supports five major world languages (Spanish, Mandarin Chinese, English, Hindi, and Arabic) and provides comprehensive learning experiences through AI-powered curriculum generation, voice-based teaching, pronunciation coaching, intelligent tutoring, and gamified learning mechanics.

### Design Philosophy

The platform is built on three core principles:

1. **AI-First Architecture**: AI services are not supplementary features but the primary teaching mechanism, driving curriculum generation, content adaptation, exercise creation, and interactive tutoring.

2. **Adaptive Personalization**: Every learner receives a unique experience tailored to their proficiency level, learning patterns, strengths, and weaknesses through continuous performance analysis.

3. **Engagement Through Gamification**: Learning is sustained through XP systems, achievements, streaks, daily challenges, and leaderboards that provide immediate feedback and long-term motivation.

### Technology Stack

**Frontend:**
- React 18 with TypeScript for type-safe component development
- Vite for fast development and optimized production builds
- TanStack Query for server state management and caching
- shadcn/ui for accessible, consistent UI components
- Tailwind CSS for utility-first styling

**Backend:**
- Express with TypeScript for RESTful API services
- Passport.js for authentication middleware
- Drizzle ORM for type-safe database operations
- PostgreSQL for relational data persistence

**AI Services:**
- Google Gemini 1.5 Flash (primary content generation, curriculum planning, voice teaching)
- OpenAI GPT-4o (exercise generation, translation, fallback)
- OpenAI Whisper (speech-to-text, pronunciation analysis)

## Architecture

### System Architecture

The platform follows a three-tier architecture with clear separation between presentation, business logic, and data layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   React UI   │  │  TanStack    │  │   shadcn/ui  │     │
│  │  Components  │  │    Query     │  │  Components  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTPS/REST API
                            │
┌─────────────────────────────────────────────────────────────┐
│                     Backend Layer                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Express API Server                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │   Auth     │  │   Lesson   │  │  Progress  │    │  │
│  │  │  Routes    │  │   Routes   │  │   Routes   │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              AI Service Layer                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │  Gemini    │  │  OpenAI    │  │  Whisper   │    │  │
│  │  │  Service   │  │  Service   │  │  Service   │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │ Curriculum │  │  Adaptive  │  │   Voice    │    │  │
│  │  │  Service   │  │  Learning  │  │  Teaching  │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Data Access Layer                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │  Drizzle   │  │   Cache    │  │   Session  │    │  │
│  │  │    ORM     │  │   Layer    │  │   Store    │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │  Redis Cache │  │  File Store  │     │
│  │   Database   │  │   (Optional) │  │   (Audio)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### AI Service Architecture

The AI service layer is organized into specialized services that coordinate multiple AI providers:

```
┌─────────────────────────────────────────────────────────────┐
│                  AI Service Orchestration                   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│ GeminiService  │  │ OpenAIService  │  │   Whisper   │
│                │  │                │  │   Service   │
│ - Content Gen  │  │ - Exercises    │  │ - STT       │
│ - Curriculum   │  │ - Translation  │  │ - Analysis  │
│ - Conversation │  │ - Fallback     │  └─────────────┘
└────────────────┘  └────────────────┘
        │                   │
        └───────────────────┼───────────────────┐
                            │                   │
        ┌───────────────────▼───────┐  ┌────────▼────────┐
        │  CurriculumService        │  │  AITeacherService│
        │                           │  │                  │
        │  - Path Generation        │  │  - Q&A          │
        │  - Lesson Creation        │  │  - Explanations │
        │  - Content Structuring    │  │  - Context Mgmt │
        └───────────────────────────┘  └─────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│ Adaptive       │  │ Voice          │  │  Speech     │
│ Learning       │  │ Teaching       │  │  Service    │
│ Service        │  │ Service        │  │             │
│ - Performance  │  │ - Conversation │  │ - Pronunc.  │
│ - Difficulty   │  │ - Context      │  │ - Scoring   │
│ - Proficiency  │  │ - Adaptation   │  │ - Feedback  │
└────────────────┘  └────────────────┘  └─────────────┘
```

### Request Flow Examples

**Lesson Delivery Flow:**
```
User → Frontend → GET /api/lessons/next
                      ↓
                  Auth Middleware
                      ↓
                  Lesson Controller
                      ↓
                  Adaptive Learning Service
                      ↓
                  Database (Learning Profile)
                      ↓
                  Curriculum Service
                      ↓
                  Database (Lessons)
                      ↓
                  Response → Frontend → Render Lesson
```

**Voice Lesson Flow:**
```
User Speech → Frontend → POST /api/voice/interact
                             ↓
                         Auth Middleware
                             ↓
                         Voice Controller
                             ↓
                         Whisper Service (STT)
                             ↓
                         Voice Teaching Service
                             ↓
                         Gemini Service (Response)
                             ↓
                         Speech Service (Analysis)
                             ↓
                         Database (Session Log)
                             ↓
                         Response → Frontend → Audio Playback
```

## Components and Interfaces

### Frontend Components


#### Core Layout Components

**AppLayout**
- Purpose: Main application shell with navigation, header, and content area
- Props: `children: ReactNode`, `user: User`
- State: Navigation state, sidebar visibility
- Responsibilities: Route rendering, authentication state display, responsive layout

**Dashboard**
- Purpose: Primary landing page showing learner progress and quick actions
- Props: `userId: string`
- State: Progress data, active language, streak info
- Responsibilities: Display XP, streak, achievements, daily challenge status, quick lesson access

**NavigationBar**
- Purpose: Primary navigation between major sections
- Props: `activeRoute: string`, `languages: Language[]`
- Responsibilities: Route navigation, language switching, profile access

#### Learning Components

**LessonViewer**
- Purpose: Display and interact with lesson content
- Props: `lessonId: string`, `onComplete: (metrics: PerformanceMetrics) => void`
- State: Current section, completion status, user responses
- Responsibilities: Render vocabulary, grammar, cultural content, track progress, submit completion

**ExercisePractice**
- Purpose: Interactive exercise interface
- Props: `exercises: Exercise[]`, `onSubmit: (answers: Answer[]) => void`
- State: Current exercise, user answers, feedback
- Responsibilities: Display questions, collect answers, show immediate feedback, track accuracy

**VoiceLesson**
- Purpose: Voice-based interactive teaching interface
- Props: `sessionId: string`, `language: Language`
- State: Recording status, transcript, AI responses, conversation history
- Responsibilities: Audio recording, speech submission, display conversation, pronunciation feedback

**PronunciationCoach**
- Purpose: Pronunciation practice and feedback
- Props: `targetPhrase: string`, `language: Language`
- State: Recording, analysis results, score
- Responsibilities: Record audio, submit for analysis, display score and feedback, provide examples

**AITutor**
- Purpose: Chat interface with AI teacher
- Props: `sessionId: string`, `context: LearningContext`
- State: Message history, input text, loading state
- Responsibilities: Display conversation, send questions, receive explanations, maintain context

#### Gamification Components

**XPDisplay**
- Purpose: Show current XP and recent gains
- Props: `totalXP: number`, `recentGain?: number`
- Responsibilities: Animated XP counter, level progress bar

**AchievementCard**
- Purpose: Display individual achievement
- Props: `achievement: Achievement`, `unlocked: boolean`
- Responsibilities: Show icon, title, description, unlock status, progress toward unlock

**StreakTracker**
- Purpose: Display current learning streak
- Props: `streakDays: number`, `lastActivity: Date`
- Responsibilities: Show streak count, calendar visualization, milestone indicators

**DailyChallengeCard**
- Purpose: Display and track daily challenge
- Props: `challenge: Challenge`, `progress: number`
- Responsibilities: Show challenge description, progress bar, completion status, reward

**Leaderboard**
- Purpose: Display ranked learners
- Props: `filter: LeaderboardFilter`, `currentUserId: string`
- State: Rankings, filter options
- Responsibilities: Display top learners, current user rank, filtering by language/time period

#### Progress Components

**ProgressDashboard**
- Purpose: Comprehensive progress visualization
- Props: `userId: string`, `language: Language`
- State: Progress data, time range selection
- Responsibilities: Display charts, statistics, weakness areas, recommendations

**WeaknessAnalysis**
- Purpose: Show identified weak areas and recommendations
- Props: `weaknesses: WeaknessArea[]`
- Responsibilities: List weak topics, show improvement trends, suggest practice

**PronunciationTrends**
- Purpose: Visualize pronunciation improvement over time
- Props: `data: PronunciationData[]`, `timeRange: TimeRange`
- Responsibilities: Line chart of accuracy scores, phoneme-specific breakdowns

### Backend API Endpoints

#### Authentication Endpoints

```typescript
POST   /api/auth/register
Body:  { email: string, password: string, nativeLanguage: string }
Response: { user: User, token: string }

POST   /api/auth/login
Body:  { email: string, password: string }
Response: { user: User, token: string }

POST   /api/auth/logout
Response: { success: boolean }

GET    /api/auth/me
Response: { user: User }

PUT    /api/auth/profile
Body:  { updates: Partial<User> }
Response: { user: User }
```

#### Language and Profile Endpoints

```typescript
GET    /api/languages
Response: { languages: Language[] }

POST   /api/profiles
Body:  { targetLanguage: string, nativeLanguage: string }
Response: { profile: LearningProfile }

GET    /api/profiles/:languageId
Response: { profile: LearningProfile }

GET    /api/profiles
Response: { profiles: LearningProfile[] }
```

#### Curriculum and Lesson Endpoints

```typescript
POST   /api/curriculum/generate
Body:  { profileId: string }
Response: { curriculum: Curriculum, lessonCount: number }

GET    /api/lessons/next
Query: { profileId: string }
Response: { lesson: Lesson }

GET    /api/lessons/:lessonId
Response: { lesson: Lesson }

POST   /api/lessons/:lessonId/complete
Body:  { metrics: PerformanceMetrics }
Response: { xpAwarded: number, profileUpdates: ProfileUpdates }

GET    /api/lessons/history
Query: { profileId: string, limit?: number }
Response: { lessons: Lesson[] }
```

#### Exercise Endpoints

```typescript
POST   /api/exercises/generate
Body:  { profileId: string, count: number }
Response: { exercises: Exercise[] }

POST   /api/exercises/submit
Body:  { exerciseId: string, answers: Answer[] }
Response: { results: ExerciseResult[], xpAwarded: number }
```

#### Voice and Speech Endpoints

```typescript
POST   /api/voice/start
Body:  { profileId: string }
Response: { sessionId: string, initialPrompt: string }

POST   /api/voice/interact
Body:  { sessionId: string, audioData: Blob }
Response: { transcript: string, response: string, feedback: Feedback }

POST   /api/voice/end
Body:  { sessionId: string }
Response: { transcript: Conversation[], xpAwarded: number }

POST   /api/speech/analyze
Body:  { audioData: Blob, targetText: string, language: string }
Response: { score: number, feedback: PronunciationFeedback, problematicPhonemes: string[] }
```

#### AI Tutor Endpoints

```typescript
POST   /api/tutor/ask
Body:  { sessionId: string, question: string, context: LearningContext }
Response: { answer: string, examples: string[] }

GET    /api/tutor/history/:sessionId
Response: { conversation: Message[] }
```

#### Gamification Endpoints

```typescript
GET    /api/gamification/xp
Response: { totalXP: number, recentGains: XPGain[] }

GET    /api/gamification/achievements
Response: { achievements: Achievement[], unlocked: string[], locked: string[] }

GET    /api/gamification/streak
Response: { currentStreak: number, longestStreak: number, lastActivity: Date }

GET    /api/gamification/daily-challenge
Response: { challenge: Challenge, progress: number, completed: boolean }

POST   /api/gamification/daily-challenge/complete
Response: { xpAwarded: number, bonusXP: number }

GET    /api/gamification/leaderboard
Query: { language?: string, period?: 'daily' | 'weekly' | 'all-time', limit?: number }
Response: { rankings: LeaderboardEntry[], currentUserRank: number }
```

#### Progress Endpoints

```typescript
GET    /api/progress/:profileId
Response: { progress: ProgressData }

GET    /api/progress/:profileId/weaknesses
Response: { weaknesses: WeaknessArea[] }

GET    /api/progress/:profileId/pronunciation
Query: { timeRange?: TimeRange }
Response: { trends: PronunciationTrend[] }

GET    /api/progress/:profileId/analytics
Query: { startDate?: Date, endDate?: Date }
Response: { analytics: AnalyticsData }
```

### Backend Service Interfaces

#### GeminiService

```typescript
interface GeminiService {
  generateCurriculum(params: {
    targetLanguage: string;
    nativeLanguage: string;
    proficiencyLevel: ProficiencyLevel;
  }): Promise<Curriculum>;

  generateLesson(params: {
    topic: string;
    proficiencyLevel: ProficiencyLevel;
    targetLanguage: string;
    nativeLanguage: string;
  }): Promise<Lesson>;

  generateConversationResponse(params: {
    conversationHistory: Message[];
    userInput: string;
    proficiencyLevel: ProficiencyLevel;
    language: string;
  }): Promise<string>;

  explainConcept(params: {
    question: string;
    context: LearningContext;
    proficiencyLevel: ProficiencyLevel;
  }): Promise<Explanation>;
}
```

#### OpenAIService

```typescript
interface OpenAIService {
  generateExercises(params: {
    weaknesses: WeaknessArea[];
    proficiencyLevel: ProficiencyLevel;
    targetLanguage: string;
    count: number;
  }): Promise<Exercise[]>;

  translateText(params: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<string>;

  evaluateAnswer(params: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
  }): Promise<EvaluationResult>;

  // Fallback for Gemini operations
  generateCurriculumFallback(params: CurriculumParams): Promise<Curriculum>;
}
```

#### WhisperService

```typescript
interface WhisperService {
  transcribeAudio(params: {
    audioData: Buffer;
    language: string;
  }): Promise<Transcription>;

  analyzePronunciation(params: {
    audioData: Buffer;
    targetText: string;
    language: string;
  }): Promise<PronunciationAnalysis>;
}
```

#### CurriculumService

```typescript
interface CurriculumService {
  generateLearningPath(params: {
    profileId: string;
    targetLanguage: string;
    nativeLanguage: string;
  }): Promise<Curriculum>;

  getNextLesson(profileId: string): Promise<Lesson>;

  getLessonById(lessonId: string): Promise<Lesson>;

  markLessonComplete(params: {
    lessonId: string;
    profileId: string;
    metrics: PerformanceMetrics;
  }): Promise<CompletionResult>;
}
```

#### AdaptiveLearningService

```typescript
interface AdaptiveLearningService {
  analyzePerformance(params: {
    profileId: string;
    activityType: ActivityType;
    metrics: PerformanceMetrics;
  }): Promise<AnalysisResult>;

  updateProficiencyLevel(profileId: string): Promise<ProficiencyLevel>;

  identifyWeaknesses(profileId: string): Promise<WeaknessArea[]>;

  adjustDifficulty(params: {
    currentDifficulty: number;
    recentPerformance: PerformanceMetrics[];
  }): Promise<number>;

  recommendNextActivity(profileId: string): Promise<ActivityRecommendation>;
}
```

#### VoiceTeachingService

```typescript
interface VoiceTeachingService {
  startVoiceSession(profileId: string): Promise<VoiceSession>;

  processVoiceInput(params: {
    sessionId: string;
    transcript: string;
    audioData: Buffer;
  }): Promise<VoiceResponse>;

  endVoiceSession(sessionId: string): Promise<SessionSummary>;

  getSessionHistory(sessionId: string): Promise<Conversation[]>;
}
```

#### SpeechService

```typescript
interface SpeechService {
  analyzePronunciation(params: {
    audioData: Buffer;
    targetText: string;
    language: string;
    proficiencyLevel: ProficiencyLevel;
  }): Promise<PronunciationResult>;

  generatePronunciationExercises(params: {
    problematicPhonemes: string[];
    language: string;
  }): Promise<PronunciationExercise[]>;

  trackPronunciationProgress(profileId: string): Promise<PronunciationTrend[]>;
}
```

#### AITeacherService

```typescript
interface AITeacherService {
  answerQuestion(params: {
    question: string;
    sessionId: string;
    context: LearningContext;
    proficiencyLevel: ProficiencyLevel;
  }): Promise<Answer>;

  maintainContext(sessionId: string, message: Message): Promise<void>;

  getConversationHistory(sessionId: string): Promise<Message[]>;

  clearContext(sessionId: string): Promise<void>;
}
```

## Data Models

### User and Authentication

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  nativeLanguage: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
```

### Learning Profile and Progress

```typescript
interface LearningProfile {
  id: string;
  userId: string;
  targetLanguage: string;
  nativeLanguage: string;
  proficiencyLevel: ProficiencyLevel;
  currentXP: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  weaknesses: WeaknessArea[];
  strengths: string[];
  createdAt: Date;
  updatedAt: Date;
}

type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Fluent';

interface WeaknessArea {
  topic: string;
  category: 'vocabulary' | 'grammar' | 'pronunciation' | 'listening';
  severity: number; // 0-100
  identifiedAt: Date;
  improvementRate: number;
}

interface PerformanceMetrics {
  accuracy: number; // 0-100
  completionTime: number; // seconds
  errorsCount: number;
  errorPatterns: string[];
  timestamp: Date;
}
```

### Curriculum and Lessons

```typescript
interface Curriculum {
  id: string;
  profileId: string;
  targetLanguage: string;
  lessons: string[]; // lesson IDs in order
  generatedAt: Date;
  updatedAt: Date;
}

interface Lesson {
  id: string;
  curriculumId: string;
  title: string;
  proficiencyLevel: ProficiencyLevel;
  orderIndex: number;
  vocabulary: VocabularyItem[];
  grammar: GrammarSection[];
  culturalContent: CulturalSection[];
  estimatedDuration: number; // minutes
  createdAt: Date;
}

interface VocabularyItem {
  word: string;
  translation: string;
  pronunciation: string;
  partOfSpeech: string;
  exampleSentences: string[];
  audioUrl?: string;
}

interface GrammarSection {
  topic: string;
  explanation: string;
  examples: string[];
  rules: string[];
}

interface CulturalSection {
  topic: string;
  content: string;
  imageUrls?: string[];
  relevance: string;
}

interface LessonCompletion {
  id: string;
  lessonId: string;
  profileId: string;
  completedAt: Date;
  metrics: PerformanceMetrics;
  xpAwarded: number;
}
```

### Exercises

```typescript
interface Exercise {
  id: string;
  type: ExerciseType;
  question: string;
  options?: string[]; // for multiple choice
  correctAnswer: string;
  explanation: string;
  difficulty: number; // 1-10
  targetWeakness?: string;
  createdAt: Date;
}

type ExerciseType = 'translation' | 'fill-in-blank' | 'multiple-choice' | 'matching';

interface ExerciseSubmission {
  id: string;
  exerciseId: string;
  profileId: string;
  userAnswer: string;
  isCorrect: boolean;
  submittedAt: Date;
  timeTaken: number; // seconds
}

interface ExerciseResult {
  exerciseId: string;
  isCorrect: boolean;
  feedback: string;
  correctAnswer: string;
  explanation: string;
}
```

### Voice and Speech

```typescript
interface VoiceSession {
  id: string;
  profileId: string;
  startedAt: Date;
  endedAt?: Date;
  conversationHistory: Message[];
  totalTurns: number;
  xpAwarded: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

interface PronunciationAnalysis {
  score: number; // 0-100
  transcript: string;
  targetText: string;
  problematicPhonemes: PhonemeAnalysis[];
  overallFeedback: string;
  timestamp: Date;
}

interface PhonemeAnalysis {
  phoneme: string;
  accuracy: number; // 0-100
  position: number; // position in word
  feedback: string;
}

interface PronunciationResult {
  analysisId: string;
  profileId: string;
  analysis: PronunciationAnalysis;
  exercises: PronunciationExercise[];
  savedAt: Date;
}

interface PronunciationExercise {
  targetPhoneme: string;
  practiceWords: string[];
  exampleAudioUrl: string;
  instructions: string;
}
```

### Gamification

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: AchievementCategory;
  requirement: AchievementRequirement;
  xpReward: number;
}

type AchievementCategory = 'streak' | 'xp' | 'lessons' | 'proficiency' | 'social';

interface AchievementRequirement {
  type: 'streak_days' | 'total_xp' | 'lessons_completed' | 'proficiency_reached';
  value: number;
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number; // 0-100
}

interface Challenge {
  id: string;
  type: 'daily' | 'weekly' | 'special';
  title: string;
  description: string;
  requirement: ChallengeRequirement;
  xpReward: number;
  bonusXP: number;
  expiresAt: Date;
  createdAt: Date;
}

interface ChallengeRequirement {
  activityType: 'lesson' | 'exercise' | 'voice' | 'pronunciation';
  count: number;
  targetAccuracy?: number;
}

interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  progress: number;
  completed: boolean;
  completedAt?: Date;
  xpAwarded: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalXP: number;
  language?: string;
  avatarUrl?: string;
}

interface XPGain {
  id: string;
  userId: string;
  amount: number;
  source: XPSource;
  sourceId: string;
  timestamp: Date;
}

type XPSource = 'lesson' | 'exercise' | 'voice' | 'pronunciation' | 'challenge' | 'streak_bonus';
```

### AI Session Context

```typescript
interface AISessionContext {
  id: string;
  userId: string;
  sessionType: 'tutor' | 'voice' | 'general';
  conversationHistory: Message[];
  learningContext: LearningContext;
  startedAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

interface LearningContext {
  profileId: string;
  currentLesson?: string;
  recentTopics: string[];
  weaknesses: WeaknessArea[];
  proficiencyLevel: ProficiencyLevel;
}
```

### Analytics and Progress

```typescript
interface ProgressData {
  profileId: string;
  totalXP: number;
  currentStreak: number;
  proficiencyLevel: ProficiencyLevel;
  lessonsCompleted: number;
  exercisesCompleted: number;
  voiceSessionsCompleted: number;
  averageAccuracy: number;
  totalLearningTime: number; // minutes
  weaknesses: WeaknessArea[];
  strengths: string[];
  recentActivity: ActivitySummary[];
}

interface ActivitySummary {
  date: Date;
  activityType: ActivityType;
  count: number;
  xpEarned: number;
  averageAccuracy: number;
}

type ActivityType = 'lesson' | 'exercise' | 'voice' | 'pronunciation' | 'tutor';

interface PronunciationTrend {
  date: Date;
  averageScore: number;
  phonemeScores: Map<string, number>;
  improvementRate: number;
}

interface AnalyticsData {
  timeRange: { start: Date; end: Date };
  totalActivities: number;
  xpEarned: number;
  accuracyTrend: { date: Date; accuracy: number }[];
  activityBreakdown: { type: ActivityType; count: number }[];
  weaknessProgress: { weakness: string; improvement: number }[];
  streakHistory: { date: Date; active: boolean }[];
}
```

### Database Schema (Drizzle ORM)

```typescript
// Example schema definitions
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nativeLanguage: varchar('native_language', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
});

export const learningProfiles = pgTable('learning_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  targetLanguage: varchar('target_language', { length: 50 }).notNull(),
  nativeLanguage: varchar('native_language', { length: 50 }).notNull(),
  proficiencyLevel: varchar('proficiency_level', { length: 20 }).notNull(),
  currentXP: integer('current_xp').default(0).notNull(),
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastActivityDate: timestamp('last_activity_date'),
  weaknesses: jsonb('weaknesses').default([]),
  strengths: jsonb('strengths').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  curriculumId: uuid('curriculum_id').references(() => curricula.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  proficiencyLevel: varchar('proficiency_level', { length: 20 }).notNull(),
  orderIndex: integer('order_index').notNull(),
  vocabulary: jsonb('vocabulary').notNull(),
  grammar: jsonb('grammar').notNull(),
  culturalContent: jsonb('cultural_content').notNull(),
  estimatedDuration: integer('estimated_duration').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Additional tables follow similar patterns...
```


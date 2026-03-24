# Learning Components

This directory contains the frontend learning components for the LinguaMaster AI Platform. These components provide interactive learning experiences including lessons, exercises, voice conversations, pronunciation coaching, and AI tutoring.

## Components

### 1. LessonViewer

**Purpose**: Display and interact with structured lesson content including vocabulary, grammar, and cultural sections.

**Requirements**: 5.2, 5.3, 5.4, 5.5, 5.6, 20.6

**Features**:
- Display vocabulary with translations and pronunciation
- Display grammar explanations with examples
- Display cultural content with images
- Track lesson progress across sections
- Submit lesson completion with performance metrics
- Show loading states during data fetching

**Props**:
```typescript
interface LessonViewerProps {
  lessonId: string;        // ID of the lesson to display
  profileId: string;       // User's learning profile ID
  onComplete?: (xpAwarded: number) => void;  // Callback when lesson is completed
}
```

**Usage**:
```tsx
import { LessonViewer } from '@/components/learning';

<LessonViewer
  lessonId="lesson-123"
  profileId="profile-456"
  onComplete={(xp) => console.log('Earned XP:', xp)}
/>
```

**API Endpoints**:
- `GET /api/lessons/:lessonId` - Fetch lesson data
- `POST /api/lessons/:lessonId/complete` - Submit lesson completion

---

### 2. ExercisePractice

**Purpose**: Interactive exercise interface with multiple question types and immediate feedback.

**Requirements**: 6.5, 20.6

**Features**:
- Display exercise questions based on type (translation, fill-in-blank, multiple-choice)
- Collect user answers
- Submit answers for evaluation
- Show immediate feedback on correctness
- Display explanations for incorrect answers
- Track exercise progress

**Props**:
```typescript
interface ExercisePracticeProps {
  exercises: Exercise[];   // Array of exercises to practice
  profileId: string;       // User's learning profile ID
  onComplete?: (totalXP: number, accuracy: number) => void;  // Callback when all exercises are completed
}

interface Exercise {
  id: string;
  type: 'translation' | 'fill-in-blank' | 'multiple-choice' | 'matching';
  question: string;
  options?: string[];      // For multiple-choice questions
  correctAnswer: string;
  explanation: string;
  difficulty: number;      // 1-10
}
```

**Usage**:
```tsx
import { ExercisePractice } from '@/components/learning';

const exercises = [
  {
    id: '1',
    type: 'multiple-choice',
    question: 'What is the Spanish word for "hello"?',
    options: ['Hola', 'Adiós', 'Gracias', 'Por favor'],
    correctAnswer: 'Hola',
    explanation: 'Hola is the most common way to say hello in Spanish.',
    difficulty: 3
  }
];

<ExercisePractice
  exercises={exercises}
  profileId="profile-456"
  onComplete={(xp, accuracy) => console.log('XP:', xp, 'Accuracy:', accuracy)}
/>
```

**API Endpoints**:
- `POST /api/exercises/submit` - Submit exercise answer for evaluation

---

### 3. VoiceLesson

**Purpose**: Voice-based interactive teaching interface with conversation history.

**Requirements**: 7.2, 7.4, 7.6, 20.6

**Features**:
- Implement audio recording functionality
- Display conversation history
- Submit audio for transcription
- Show AI responses
- Display pronunciation feedback
- Handle recording states (idle, recording, processing)

**Props**:
```typescript
interface VoiceLessonProps {
  profileId: string;       // User's learning profile ID
  topic?: string;          // Optional conversation topic
  onComplete?: (xpAwarded: number) => void;  // Callback when session ends
}
```

**Usage**:
```tsx
import { VoiceLesson } from '@/components/learning';

<VoiceLesson
  profileId="profile-456"
  topic="Basic Greetings"
  onComplete={(xp) => console.log('Earned XP:', xp)}
/>
```

**API Endpoints**:
- `POST /api/voice/start` - Start voice session
- `POST /api/voice/interact` - Process voice input (multipart/form-data)
- `POST /api/voice/end` - End voice session

**Browser Requirements**:
- Requires microphone access via `navigator.mediaDevices.getUserMedia()`
- Uses `MediaRecorder` API for audio recording
- Audio format: `audio/webm;codecs=opus`

---

### 4. PronunciationCoach

**Purpose**: Pronunciation practice and feedback with detailed analysis.

**Requirements**: 8.2, 8.3, 8.4, 8.5

**Features**:
- Display target phrase for pronunciation
- Implement audio recording
- Submit audio for analysis
- Display pronunciation score (0-100)
- Show problematic phonemes with feedback
- Provide audio examples of correct pronunciation
- Track pronunciation progress over multiple attempts

**Props**:
```typescript
interface PronunciationCoachProps {
  targetPhrase: string;    // Phrase to practice
  targetLanguage: string;  // Language of the phrase
  profileId: string;       // User's learning profile ID
  onComplete?: () => void; // Callback when practice is completed
}
```

**Usage**:
```tsx
import { PronunciationCoach } from '@/components/learning';

<PronunciationCoach
  targetPhrase="Hola, ¿cómo estás?"
  targetLanguage="Spanish"
  profileId="profile-456"
  onComplete={() => console.log('Practice completed')}
/>
```

**API Endpoints**:
- `POST /api/speech/analyze` - Analyze pronunciation (multipart/form-data)

**Browser Requirements**:
- Requires microphone access via `navigator.mediaDevices.getUserMedia()`
- Uses `MediaRecorder` API for audio recording
- Audio format: `audio/webm;codecs=opus`

---

### 5. AITutor

**Purpose**: Chat interface with AI teacher for questions and explanations.

**Requirements**: 9.1, 9.2, 9.4, 9.5

**Features**:
- Implement chat interface
- Display conversation history
- Send questions to AI teacher
- Receive and display explanations
- Maintain conversation context
- Show typing indicators during AI response
- Display examples, related concepts, and practice exercises

**Props**:
```typescript
interface AITutorProps {
  profileId: string;       // User's learning profile ID
  context?: {              // Optional learning context
    currentLesson?: string;
    recentTopics?: string[];
  };
}
```

**Usage**:
```tsx
import { AITutor } from '@/components/learning';

<AITutor
  profileId="profile-456"
  context={{
    currentLesson: 'Basic Greetings',
    recentTopics: ['Greetings', 'Introductions']
  }}
/>
```

**API Endpoints**:
- `GET /api/tutor/sessions` - Get or create tutor session
- `POST /api/tutor/ask` - Ask question to AI tutor
- `GET /api/tutor/history/:sessionId` - Get conversation history

---

## Common Features

All learning components include:

1. **Loading States**: Display loading indicators during API requests
2. **Error Handling**: Show user-friendly error messages with toast notifications
3. **Responsive Design**: Work on desktop, tablet, and mobile devices
4. **Accessibility**: Use semantic HTML and ARIA attributes
5. **TanStack Query Integration**: Efficient data fetching and caching
6. **shadcn/ui Components**: Consistent UI design system

## State Management

Components use:
- **TanStack Query** for server state (API data fetching and caching)
- **React useState** for local component state
- **React useEffect** for side effects (audio recording, auto-scrolling)

## Audio Recording

Voice and pronunciation components use the browser's MediaRecorder API:

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000
  }
});

const recorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus'
});
```

## Text-to-Speech

Components use the browser's Speech Synthesis API for audio playback:

```typescript
const utterance = new SpeechSynthesisUtterance(text);
utterance.rate = 0.8;  // Slightly slower for learning
utterance.pitch = 1;
speechSynthesis.speak(utterance);
```

## Testing

To test these components:

1. Navigate to `/learning-demo` page
2. Each component has its own tab with demo data
3. Test microphone access for voice and pronunciation components
4. Verify API integration with backend services

## Dependencies

- React 18
- TypeScript
- TanStack Query
- shadcn/ui components
- Tailwind CSS
- Lucide React (icons)

## Future Enhancements

Potential improvements:
- Offline support with service workers
- Real-time collaboration features
- Advanced analytics and progress tracking
- Gamification elements (badges, achievements)
- Social features (share progress, compete with friends)

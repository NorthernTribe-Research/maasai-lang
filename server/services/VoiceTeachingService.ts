import { BaseService } from './BaseService';
import { GeminiService } from './GeminiService';

export interface VoiceLesson {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  duration: number;
  sections: VoiceSection[];
  vocabulary: VoiceVocabulary[];
  exercises: VoiceExercise[];
}

export interface VoiceSection {
  id: string;
  type: 'introduction' | 'explanation' | 'practice' | 'assessment';
  title: string;
  content: string;
  audioScript: string;
  interactionPoints: InteractionPoint[];
  expectedResponses: string[];
}

export interface InteractionPoint {
  timestamp: number;
  type: 'pause' | 'question' | 'repeat' | 'feedback';
  prompt: string;
  expectedResponse?: string;
  hints: string[];
}

export interface VoiceVocabulary {
  word: string;
  translation: string;
  pronunciation: string;
  audioScript: string;
  examples: string[];
  difficulty: number;
}

export interface VoiceExercise {
  id: string;
  type: 'pronunciation' | 'comprehension' | 'conversation' | 'repetition';
  instruction: string;
  audioScript: string;
  targetPhrase: string;
  feedback: VoiceFeedback[];
}

export interface VoiceFeedback {
  condition: string;
  response: string;
  audioScript: string;
  encouragement: string;
}

export interface ConversationContext {
  userId: number;
  languageId: number;
  currentTopic: string;
  conversationHistory: ConversationTurn[];
  learnerLevel: string;
  weakAreas: string[];
  preferences: {
    pace: 'slow' | 'normal' | 'fast';
    style: 'formal' | 'casual' | 'encouraging';
    focusAreas: string[];
  };
}

export interface ConversationTurn {
  timestamp: Date;
  speaker: 'learner' | 'teacher';
  content: string;
  audioTranscript?: string;
  confidence?: number;
  feedback?: string;
}

/**
 * AI-powered voice teaching service that handles all verbal instruction
 */
export class VoiceTeachingService extends BaseService {
  private geminiService: GeminiService;
  private activeConversations: Map<string, ConversationContext> = new Map();

  constructor(geminiService: GeminiService) {
    super();
    this.geminiService = geminiService;
    this.log("Voice Teaching service initialized", "info");
  }

  /**
   * Generate a complete voice-based lesson
   */
  async generateVoiceLesson(
    language: string,
    topic: string,
    level: string,
    duration: number,
    learnerProfile: {
      weakAreas: string[];
      preferences: any;
      previousLessons: string[];
    }
  ): Promise<VoiceLesson> {
    try {
      const prompt = `Create a comprehensive voice-based language lesson for ${language}.

Topic: ${topic}
Level: ${level}
Duration: ${duration} minutes
Learner weak areas: ${learnerProfile.weakAreas.join(', ')}
Previous lessons: ${learnerProfile.previousLessons.join(', ')}

Design a complete spoken lesson with:
1. Engaging introduction with clear objectives
2. Step-by-step explanations with natural speech patterns
3. Interactive practice segments with pauses for responses
4. Vocabulary introduction with proper pronunciation guides
5. Guided exercises with immediate audio feedback
6. Assessment through conversation and repetition
7. Encouraging conclusion with progress reinforcement

For each section, provide:
- Natural, conversational audio scripts
- Strategic interaction points for learner engagement
- Expected response patterns and alternatives
- Adaptive feedback based on different learner responses
- Pronunciation guides in phonetic notation
- Cultural context and real-world usage examples

Return comprehensive JSON structure with all audio scripts and interaction flows.`;

      const response = await this.geminiService.generateContent(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.handleError(error, "VoiceTeachingService.generateVoiceLesson");
      return this.getDefaultVoiceLesson(language, topic, level);
    }
  }

  /**
   * Start an interactive voice conversation session
   */
  async startVoiceConversation(
    userId: number,
    languageId: number,
    topic: string,
    level: string
  ): Promise<{
    sessionId: string;
    initialGreeting: string;
    audioScript: string;
    suggestedResponses: string[];
  }> {
    try {
      const sessionId = `voice_${userId}_${Date.now()}`;
      
      const context: ConversationContext = {
        userId,
        languageId,
        currentTopic: topic,
        conversationHistory: [],
        learnerLevel: level,
        weakAreas: [],
        preferences: {
          pace: 'normal',
          style: 'encouraging',
          focusAreas: [topic]
        }
      };

      this.activeConversations.set(sessionId, context);

      const prompt = `Start a voice conversation for ${level} level learner about ${topic}.

Create an engaging opening that:
1. Welcomes the learner warmly in the target language
2. Introduces the conversation topic clearly
3. Sets expectations for the interaction
4. Provides initial phrases to help them start
5. Uses encouraging, patient tone
6. Includes proper pronunciation guidance

Provide both the greeting text and a natural audio script with:
- Proper pacing markers [PAUSE]
- Emphasis markers [EMPHASIZE: word]
- Tone guidance [ENCOURAGING] [PATIENT]
- Speed adjustments [SLOW] [NORMAL]

Return JSON with greeting, audioScript, and 3-5 suggested learner responses.`;

      const response = await this.geminiService.generateContent(prompt);
      const result = JSON.parse(response);

      // Add initial greeting to conversation history
      context.conversationHistory.push({
        timestamp: new Date(),
        speaker: 'teacher',
        content: result.initialGreeting,
        audioTranscript: result.audioScript
      });

      return {
        sessionId,
        ...result
      };
    } catch (error) {
      this.handleError(error, "VoiceTeachingService.startVoiceConversation");
      return {
        sessionId: 'fallback',
        initialGreeting: "Hello! Let's practice together.",
        audioScript: "[ENCOURAGING] Hello! [PAUSE] Let's practice together. [PAUSE] How are you today?",
        suggestedResponses: ["I'm good, thank you", "I'm ready to learn", "Hello teacher"]
      };
    }
  }

  /**
   * Process learner's voice input and provide intelligent response
   */
  async processVoiceInput(
    sessionId: string,
    audioTranscript: string,
    confidence: number,
    audioData?: string
  ): Promise<{
    response: string;
    audioScript: string;
    feedback: string;
    nextPrompt: string;
    corrections?: Array<{
      original: string;
      corrected: string;
      explanation: string;
    }>;
    encouragement: string;
  }> {
    try {
      const context = this.activeConversations.get(sessionId);
      if (!context) {
        throw new Error('Conversation session not found');
      }

      // Add learner's input to history
      context.conversationHistory.push({
        timestamp: new Date(),
        speaker: 'learner',
        content: audioTranscript,
        confidence
      });

      const recentHistory = context.conversationHistory.slice(-6); // Last 3 exchanges

      const prompt = `As an AI language teacher, respond to the learner's voice input.

Current topic: ${context.currentTopic}
Learner level: ${context.learnerLevel}
Confidence: ${confidence}%

Conversation history:
${recentHistory.map(turn => `${turn.speaker}: ${turn.content}`).join('\n')}

Learner just said: "${audioTranscript}"

Provide a comprehensive response that:
1. Acknowledges what they said positively
2. Corrects any errors gently and naturally
3. Expands on their response with related vocabulary
4. Asks an engaging follow-up question
5. Provides pronunciation feedback if needed
6. Maintains encouraging, supportive tone
7. Adapts complexity to their demonstrated level

If confidence is low (<70%), provide extra encouragement and simpler alternatives.
If they made errors, correct them naturally within conversation flow.

Return JSON with:
- response: Natural conversational response
- audioScript: Detailed script with pacing and emphasis
- feedback: Specific feedback on their pronunciation/grammar
- nextPrompt: Question or prompt to continue conversation
- corrections: Array of any corrections made
- encouragement: Positive reinforcement message`;

      const result = await this.geminiService.generateContent(prompt);
      const response = JSON.parse(result);

      // Add teacher's response to history
      context.conversationHistory.push({
        timestamp: new Date(),
        speaker: 'teacher',
        content: response.response,
        audioTranscript: response.audioScript,
        feedback: response.feedback
      });

      return response;
    } catch (error) {
      this.handleError(error, "VoiceTeachingService.processVoiceInput");
      return {
        response: "That's great! Keep practicing.",
        audioScript: "[ENCOURAGING] That's great! [PAUSE] Keep practicing.",
        feedback: "Good effort!",
        nextPrompt: "What would you like to talk about next?",
        encouragement: "You're doing well!"
      };
    }
  }

  /**
   * Generate pronunciation coaching for specific words/phrases
   */
  async generatePronunciationCoaching(
    language: string,
    targetPhrase: string,
    userAttempt: string,
    difficulty: string
  ): Promise<{
    coaching: string;
    audioScript: string;
    breakdown: Array<{
      sound: string;
      pronunciation: string;
      tips: string[];
      commonMistakes: string[];
    }>;
    practiceExercises: string[];
  }> {
    try {
      const prompt = `Provide detailed pronunciation coaching for ${language}.

Target phrase: "${targetPhrase}"
User's attempt: "${userAttempt}"
Difficulty level: ${difficulty}

Create comprehensive coaching that includes:
1. Phonetic breakdown of each sound
2. Mouth position and tongue placement instructions
3. Common mistakes for English speakers
4. Step-by-step pronunciation guide
5. Practice exercises and repetition drills
6. Cultural pronunciation variations
7. Confidence-building encouragement

Make the coaching:
- Clear and easy to follow
- Encouraging and supportive
- Technically accurate but accessible
- Progressive from simple to complex
- Includes audio script with detailed timing

Return detailed JSON structure with all coaching elements.`;

      const response = await this.geminiService.generateContent(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.handleError(error, "VoiceTeachingService.generatePronunciationCoaching");
      return {
        coaching: "Let's work on pronunciation together.",
        audioScript: "[PATIENT] Let's work on pronunciation together. [PAUSE]",
        breakdown: [],
        practiceExercises: ["Repeat after me slowly", "Try breaking it into syllables"]
      };
    }
  }

  /**
   * Generate adaptive listening comprehension exercises
   */
  async generateListeningExercise(
    language: string,
    level: string,
    topic: string,
    duration: number
  ): Promise<{
    exercise: {
      title: string;
      instructions: string;
      audioScript: string;
      content: string;
      questions: Array<{
        question: string;
        options?: string[];
        correctAnswer: string;
        explanation: string;
      }>;
    };
    followUp: {
      discussion: string[];
      vocabulary: string[];
      expressions: string[];
    };
  }> {
    try {
      const prompt = `Create a listening comprehension exercise for ${language} at ${level} level.

Topic: ${topic}
Duration: ${duration} minutes

Design an engaging listening exercise with:
1. Natural, conversational content about the topic
2. Appropriate speed and complexity for the level
3. Comprehension questions that test understanding
4. Follow-up discussion prompts
5. Key vocabulary and expressions highlighted
6. Cultural context and real-world relevance

The audio should sound natural with:
- Proper pacing and pauses
- Natural intonation patterns
- Background context setting
- Clear pronunciation examples
- Interactive elements

Return complete exercise structure with audio script and assessment.`;

      const response = await this.geminiService.generateContent(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.handleError(error, "VoiceTeachingService.generateListeningExercise");
      return {
        exercise: {
          title: "Listening Practice",
          instructions: "Listen and answer the questions",
          audioScript: "[CLEAR] Listen carefully to this conversation. [PAUSE]",
          content: "Sample listening content",
          questions: []
        },
        followUp: {
          discussion: ["What did you understand?"],
          vocabulary: [],
          expressions: []
        }
      };
    }
  }

  /**
   * End conversation session and provide summary
   */
  async endVoiceSession(sessionId: string): Promise<{
    summary: string;
    progress: {
      topicsDiscussed: string[];
      pronunciationImprovements: string[];
      areasForPractice: string[];
      overallAssessment: string;
    };
    nextSessionRecommendations: string[];
  }> {
    try {
      const context = this.activeConversations.get(sessionId);
      if (!context) {
        throw new Error('Session not found');
      }

      const prompt = `Analyze this voice learning session and provide comprehensive summary.

Session details:
- Topic: ${context.currentTopic}
- Level: ${context.learnerLevel}
- Total exchanges: ${context.conversationHistory.length}

Conversation history:
${context.conversationHistory.map(turn => 
  `${turn.speaker}: ${turn.content} ${turn.confidence ? `(confidence: ${turn.confidence}%)` : ''}`
).join('\n')}

Provide:
1. Encouraging session summary
2. Progress assessment with specific improvements noticed
3. Areas that need more practice
4. Pronunciation feedback summary
5. Recommendations for next session
6. Confidence and motivation boost

Keep tone positive and constructive, focusing on growth and achievements.`;

      const response = await this.geminiService.generateContent(prompt);
      const result = JSON.parse(response);

      // Clean up session
      this.activeConversations.delete(sessionId);

      return result;
    } catch (error) {
      this.handleError(error, "VoiceTeachingService.endVoiceSession");
      return {
        summary: "Great practice session!",
        progress: {
          topicsDiscussed: [],
          pronunciationImprovements: [],
          areasForPractice: [],
          overallAssessment: "Making good progress"
        },
        nextSessionRecommendations: ["Continue practicing"]
      };
    }
  }

  /**
   * Get active conversation context
   */
  getConversationContext(sessionId: string): ConversationContext | null {
    return this.activeConversations.get(sessionId) || null;
  }

  /**
   * Default fallback lesson
   */
  private getDefaultVoiceLesson(language: string, topic: string, level: string): VoiceLesson {
    return {
      id: `default_${Date.now()}`,
      title: `${topic} - ${language}`,
      description: `Basic ${topic} lesson for ${level} learners`,
      language,
      level,
      duration: 30,
      sections: [
        {
          id: 'intro',
          type: 'introduction',
          title: 'Welcome',
          content: `Welcome to your ${topic} lesson`,
          audioScript: "[WELCOMING] Welcome to your lesson about " + topic,
          interactionPoints: [],
          expectedResponses: []
        }
      ],
      vocabulary: [],
      exercises: []
    };
  }
}
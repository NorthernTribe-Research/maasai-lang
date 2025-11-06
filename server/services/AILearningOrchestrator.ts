import { BaseService } from "./base";
import { OpenAIService } from "./OpenAIService";
import { GeminiService } from "./GeminiService";
import { WhisperService } from "./WhisperService";
import { AITeacherService } from "./AITeacherService";
import { AdaptiveLearningService } from "./AdaptiveLearningService";
import OpenAI from "openai";

/**
 * AI Learning Orchestrator - Central intelligence for determining what users should learn next
 * This service analyzes user data and dynamically creates personalized learning paths
 */
export class AILearningOrchestrator extends BaseService {
  private openAIService: OpenAIService;
  private geminiService: GeminiService;
  private whisperService: WhisperService;
  private aiTeacherService: AITeacherService;
  private adaptiveLearningService: AdaptiveLearningService;
  private openai: OpenAI;

  constructor() {
    super();
    this.openAIService = new OpenAIService();
    this.geminiService = new GeminiService();
    this.whisperService = new WhisperService();
    this.aiTeacherService = new AITeacherService(this.openAIService, this.geminiService);
    this.adaptiveLearningService = new AdaptiveLearningService(this.geminiService);
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'demo-api-key') {
      this.openai = new OpenAI({ apiKey });
    }
    
    this.log("AI Learning Orchestrator initialized", "info");
  }

  /**
   * Determine what the user should learn next based on comprehensive AI analysis
   */
  async determineNextLearningActivity(
    userId: number,
    languageId: number,
    userProfile: {
      skillLevels: { [key: string]: number };
      masteredConcepts: string[];
      strugglingConcepts: string[];
      interests: string[];
      goals: string[];
      recentPerformance: Array<{
        concept: string;
        accuracy: number;
        timestamp: Date;
      }>;
    }
  ): Promise<{
    activityType: 'conversation' | 'lesson' | 'practice' | 'assessment' | 'review';
    topic: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    reasoning: string;
    estimatedDuration: number;
    learningObjectives: string[];
    aiTeacherPersona?: string;
  }> {
    try {
      if (!this.openai) {
        return this.getDefaultNextActivity(userProfile);
      }

      const prompt = `You are an expert language learning AI orchestrator. Analyze the learner's profile and determine the optimal next learning activity.

User Profile:
- Skill Levels: ${JSON.stringify(userProfile.skillLevels)}
- Mastered Concepts: ${userProfile.masteredConcepts.join(', ')}
- Struggling Concepts: ${userProfile.strugglingConcepts.join(', ')}
- Interests: ${userProfile.interests.join(', ')}
- Goals: ${userProfile.goals.join(', ')}
- Recent Performance: ${JSON.stringify(userProfile.recentPerformance)}

Analyze:
1. What skill needs the most attention right now?
2. What type of activity would be most effective? (conversation, lesson, practice, assessment, review)
3. What specific topic should be covered?
4. What difficulty level is appropriate?
5. What are the specific learning objectives?

Return JSON:
{
  "activityType": "conversation|lesson|practice|assessment|review",
  "topic": "specific topic to cover",
  "difficulty": "beginner|intermediate|advanced",
  "reasoning": "brief explanation of why this is recommended",
  "estimatedDuration": minutes_number,
  "learningObjectives": ["objective1", "objective2", "objective3"],
  "aiTeacherPersona": "friendly|professional|patient|energetic"
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result;
    } catch (error) {
      this.handleError(error, "determining next learning activity");
      return this.getDefaultNextActivity(userProfile);
    }
  }

  /**
   * Generate a complete AI-driven learning session
   */
  async generateAILearningSession(
    userId: number,
    languageId: number,
    languageName: string,
    activityType: string,
    topic: string,
    difficulty: string,
    userProfile: any
  ): Promise<{
    sessionId: string;
    sessionType: string;
    content: any;
    interactionFlow: Array<{
      step: number;
      type: string;
      content: string;
      expectedResponse?: string;
      hints?: string[];
    }>;
    adaptationRules: any;
  }> {
    try {
      const sessionId = `ai_session_${userId}_${Date.now()}`;

      const prompt = `Create a complete AI-driven language learning session.

Language: ${languageName}
Activity Type: ${activityType}
Topic: ${topic}
Difficulty: ${difficulty}
User Interests: ${userProfile.interests?.join(', ') || 'general'}
User Goals: ${userProfile.goals?.join(', ') || 'fluency'}

Create a comprehensive session with:
1. Clear learning objectives
2. Step-by-step interactive flow
3. AI-generated content for each step
4. Expected responses and variations
5. Hints and guidance
6. Adaptation rules based on user performance
7. Assessment criteria

Return JSON with complete session structure including all content, interaction flow, and adaptation rules.`;

      const response = await this.geminiService.generateContent(prompt);
      const sessionData = JSON.parse(response);

      return {
        sessionId,
        sessionType: activityType,
        content: sessionData.content || {},
        interactionFlow: sessionData.interactionFlow || [],
        adaptationRules: sessionData.adaptationRules || {}
      };
    } catch (error) {
      this.handleError(error, "generating AI learning session");
      return this.getDefaultSession(userId, activityType, topic, difficulty);
    }
  }

  /**
   * Analyze user response in real-time and provide AI feedback
   */
  async analyzeUserResponse(
    sessionId: string,
    userId: number,
    languageId: number,
    context: {
      currentStep: number;
      expectedResponse: string;
      userResponse: string;
      conversationHistory: Array<{ role: string; content: string }>;
    }
  ): Promise<{
    isCorrect: boolean;
    accuracy: number;
    feedback: string;
    corrections: string[];
    encouragement: string;
    nextStep: string;
    adaptation: {
      shouldAdjustDifficulty: boolean;
      newDifficulty?: string;
      reasoning: string;
    };
  }> {
    try {
      if (!this.openai) {
        return this.getDefaultAnalysis(context.userResponse, context.expectedResponse);
      }

      const prompt = `You are an expert language teacher analyzing a student's response. Provide detailed, encouraging feedback.

Expected Response: "${context.expectedResponse}"
User's Response: "${context.userResponse}"
Conversation History: ${JSON.stringify(context.conversationHistory.slice(-5))}

Analyze:
1. Is the response correct or appropriate?
2. What's the accuracy level (0-100)?
3. What specific feedback should be given?
4. What corrections are needed?
5. What encouragement is appropriate?
6. Should difficulty be adjusted based on performance?

Return JSON:
{
  "isCorrect": boolean,
  "accuracy": number_0_to_100,
  "feedback": "detailed constructive feedback",
  "corrections": ["correction1", "correction2"],
  "encouragement": "positive encouraging message",
  "nextStep": "what to do next",
  "adaptation": {
    "shouldAdjustDifficulty": boolean,
    "newDifficulty": "easier|same|harder",
    "reasoning": "why to adjust or not"
  }
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      this.handleError(error, "analyzing user response");
      return this.getDefaultAnalysis(context.userResponse, context.expectedResponse);
    }
  }

  /**
   * Generate personalized AI curriculum for the user
   */
  async generatePersonalizedCurriculum(
    userId: number,
    languageId: number,
    languageName: string,
    userProfile: any,
    timeframe: number = 30 // days
  ): Promise<{
    weeks: Array<{
      week: number;
      theme: string;
      days: Array<{
        day: number;
        activities: Array<{
          type: string;
          topic: string;
          duration: number;
        }>;
      }>;
    }>;
    milestones: Array<{
      week: number;
      description: string;
      skills: string[];
    }>;
  }> {
    try {
      const prompt = `Create a personalized ${timeframe}-day language learning curriculum.

Language: ${languageName}
User Level: ${userProfile.skillLevels?.vocabulary || 50}/100
Interests: ${userProfile.interests?.join(', ') || 'general topics'}
Goals: ${userProfile.goals?.join(', ') || 'conversational fluency'}
Learning Style: ${userProfile.learningStyle || 'mixed'}
Weak Areas: ${userProfile.strugglingConcepts?.join(', ') || 'none identified'}

Create a week-by-week curriculum with:
1. Progressive themes that build on each other
2. Daily activities mixing different learning types
3. Clear milestones every week
4. Adaptation to user's interests and goals
5. Balance between skills (speaking, listening, reading, writing)

Return complete JSON structure for ${Math.ceil(timeframe / 7)} weeks.`;

      const response = await this.geminiService.generateContent(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.handleError(error, "generating personalized curriculum");
      return this.getDefaultCurriculum(languageName, timeframe);
    }
  }

  /**
   * Get AI-powered insights about user's learning
   */
  async getLearningInsights(
    userId: number,
    languageId: number,
    userProfile: any,
    recentSessions: any[]
  ): Promise<{
    overallProgress: number;
    strengths: string[];
    areasForImprovement: string[];
    recommendations: string[];
    motivationalMessage: string;
    nextMilestone: string;
    estimatedTimeToGoal: string;
  }> {
    try {
      if (!this.openai) {
        return this.getDefaultInsights(userProfile);
      }

      const prompt = `Provide comprehensive learning insights for a language learner.

User Profile: ${JSON.stringify(userProfile)}
Recent Sessions: ${JSON.stringify(recentSessions)}

Analyze and provide:
1. Overall progress assessment (0-100)
2. Key strengths
3. Areas that need improvement
4. Specific actionable recommendations
5. Motivational message
6. Next milestone to achieve
7. Estimated time to reach their goal

Return JSON with all insights.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.5
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      this.handleError(error, "getting learning insights");
      return this.getDefaultInsights(userProfile);
    }
  }

  // Default fallback methods
  private getDefaultNextActivity(userProfile: any) {
    const weakestSkill = Object.entries(userProfile.skillLevels || {})
      .sort(([, a]: any, [, b]: any) => a - b)[0];

    return {
      activityType: 'conversation' as const,
      topic: weakestSkill ? weakestSkill[0] : 'basic conversation',
      difficulty: 'beginner' as const,
      reasoning: 'Practice through conversation to build confidence',
      estimatedDuration: 15,
      learningObjectives: ['Improve conversational skills', 'Build vocabulary', 'Practice pronunciation'],
      aiTeacherPersona: 'friendly'
    };
  }

  private getDefaultSession(userId: number, activityType: string, topic: string, difficulty: string) {
    return {
      sessionId: `ai_session_${userId}_${Date.now()}`,
      sessionType: activityType,
      content: {
        introduction: `Let's practice ${topic} at ${difficulty} level`,
        exercises: []
      },
      interactionFlow: [
        {
          step: 1,
          type: 'introduction',
          content: `Welcome! Today we'll work on ${topic}. Are you ready to begin?`,
          expectedResponse: 'yes',
          hints: ['Take your time', 'Feel free to ask questions']
        }
      ],
      adaptationRules: {
        adjustOnAccuracy: true,
        thresholds: { easy: 90, hard: 50 }
      }
    };
  }

  private getDefaultAnalysis(userResponse: string, expectedResponse: string) {
    const isCorrect = userResponse.toLowerCase().trim() === expectedResponse.toLowerCase().trim();
    return {
      isCorrect,
      accuracy: isCorrect ? 100 : 50,
      feedback: isCorrect ? 'Great job!' : 'Good effort! Let me help you improve.',
      corrections: isCorrect ? [] : ['Try to match the expected response more closely'],
      encouragement: 'Keep practicing!',
      nextStep: 'Continue with the next exercise',
      adaptation: {
        shouldAdjustDifficulty: false,
        reasoning: 'Need more data to adjust difficulty'
      }
    };
  }

  private getDefaultCurriculum(languageName: string, timeframe: number) {
    const weeks = Math.ceil(timeframe / 7);
    return {
      weeks: Array.from({ length: weeks }, (_, i) => ({
        week: i + 1,
        theme: `Week ${i + 1}: Building foundations`,
        days: Array.from({ length: 7 }, (_, d) => ({
          day: d + 1,
          activities: [
            { type: 'vocabulary', topic: 'Daily words', duration: 10 },
            { type: 'conversation', topic: 'Practice speaking', duration: 15 }
          ]
        }))
      })),
      milestones: Array.from({ length: weeks }, (_, i) => ({
        week: i + 1,
        description: `Complete week ${i + 1} foundations`,
        skills: ['vocabulary', 'conversation']
      }))
    };
  }

  private getDefaultInsights(userProfile: any) {
    return {
      overallProgress: 50,
      strengths: ['Consistent practice', 'Good effort'],
      areasForImprovement: ['Vocabulary', 'Grammar'],
      recommendations: ['Practice daily', 'Focus on weak areas'],
      motivationalMessage: 'You\'re making progress! Keep going!',
      nextMilestone: 'Complete 10 more sessions',
      estimatedTimeToGoal: '3-6 months with consistent practice'
    };
  }
}

export const aiLearningOrchestrator = new AILearningOrchestrator();

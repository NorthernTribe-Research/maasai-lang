import { BaseService } from './BaseService';
import { GeminiService } from './GeminiService';
import { Language, Lesson, InsertLesson } from '../../shared/schema';
import { storage } from '../storage';

export interface CurriculumTopic {
  id: string;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: 'grammar' | 'vocabulary' | 'conversation' | 'culture' | 'pronunciation';
  prerequisites: string[];
  estimatedTime: number; // in minutes
  skills: string[];
}

export interface LessonPlan {
  title: string;
  description: string;
  level: string;
  duration: number;
  objectives: string[];
  activities: LessonActivity[];
  vocabulary: VocabularyItem[];
  grammar: GrammarPoint[];
  assessment: AssessmentItem[];
}

export interface LessonActivity {
  type: 'reading' | 'listening' | 'speaking' | 'writing' | 'exercise';
  title: string;
  description: string;
  content: string;
  duration: number;
  difficulty: number;
}

export interface VocabularyItem {
  word: string;
  translation: string;
  pronunciation: string;
  example: string;
  difficulty: number;
}

export interface GrammarPoint {
  concept: string;
  explanation: string;
  examples: string[];
  exercises: string[];
  difficulty: number;
}

export interface AssessmentItem {
  type: 'multiple_choice' | 'fill_blank' | 'translation' | 'speaking';
  question: string;
  answer: string;
  options?: string[];
  feedback: string;
}

/**
 * AI-powered curriculum generation and management service
 */
export class CurriculumService extends BaseService {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    super();
    this.geminiService = geminiService;
    this.log("Curriculum service initialized", "info");
  }

  /**
   * Generate a comprehensive curriculum for a language
   */
  async generateCurriculum(
    language: Language,
    level: 'beginner' | 'intermediate' | 'advanced',
    focusAreas: string[] = [],
    duration: number = 30 // days
  ): Promise<CurriculumTopic[]> {
    try {
      const prompt = `
        Create a comprehensive ${duration}-day curriculum for learning ${language.name} at ${level} level.
        ${focusAreas.length > 0 ? `Focus areas: ${focusAreas.join(', ')}` : ''}
        
        Generate 20-30 curriculum topics covering:
        1. Essential grammar concepts
        2. Vocabulary themes (daily life, work, travel, etc.)
        3. Conversation scenarios
        4. Cultural understanding
        5. Pronunciation patterns
        
        Return JSON array with this structure:
        {
          "topics": [
            {
              "id": "unique_id",
              "name": "Topic name",
              "description": "Detailed description",
              "level": "${level}",
              "category": "grammar|vocabulary|conversation|culture|pronunciation",
              "prerequisites": ["prerequisite_topic_ids"],
              "estimatedTime": minutes_to_complete,
              "skills": ["specific_skills_learned"]
            }
          ]
        }
      `;

      const result = await this.geminiService.generateCurriculum(language.name, level, focusAreas, duration);
      
      return result.topics || [];
    } catch (error) {
      this.handleError(error, "CurriculumService.generateCurriculum");
      return [];
    }
  }

  /**
   * Generate a detailed lesson plan
   */
  async generateLessonPlan(
    language: Language,
    topic: CurriculumTopic,
    userLevel: string,
    userPreferences: { 
      learningStyle: string;
      interests: string[];
      timeAvailable: number;
    }
  ): Promise<LessonPlan> {
    try {
      const prompt = `
        Create a detailed lesson plan for ${language.name} on topic: "${topic.name}".
        
        Topic details:
        - Level: ${topic.level}
        - Category: ${topic.category}
        - Description: ${topic.description}
        - Skills to learn: ${topic.skills.join(', ')}
        
        User preferences:
        - Learning style: ${userPreferences.learningStyle}
        - Interests: ${userPreferences.interests.join(', ')}
        - Available time: ${userPreferences.timeAvailable} minutes
        
        Create a comprehensive lesson with:
        1. Clear learning objectives
        2. Structured activities (varied types)
        3. Relevant vocabulary (8-12 words)
        4. Grammar explanations with examples
        5. Assessment questions
        
        Return JSON with this structure:
        {
          "title": "lesson_title",
          "description": "lesson_description",
          "level": "${userLevel}",
          "duration": ${userPreferences.timeAvailable},
          "objectives": ["objective1", "objective2"],
          "activities": [
            {
              "type": "reading|listening|speaking|writing|exercise",
              "title": "activity_title",
              "description": "what_to_do",
              "content": "actual_content",
              "duration": minutes,
              "difficulty": 1-5
            }
          ],
          "vocabulary": [
            {
              "word": "word",
              "translation": "translation",
              "pronunciation": "pronunciation_guide",
              "example": "example_sentence",
              "difficulty": 1-5
            }
          ],
          "grammar": [
            {
              "concept": "grammar_concept",
              "explanation": "clear_explanation",
              "examples": ["example1", "example2"],
              "exercises": ["exercise1", "exercise2"],
              "difficulty": 1-5
            }
          ],
          "assessment": [
            {
              "type": "multiple_choice|fill_blank|translation|speaking",
              "question": "question_text",
              "answer": "correct_answer",
              "options": ["option1", "option2", "option3", "option4"],
              "feedback": "feedback_text"
            }
          ]
        }
      `;

      const response = await this.openAIService.generateContent(prompt, { format: 'json' });
      return JSON.parse(response);
    } catch (error) {
      this.handleError(error, "CurriculumService.generateLessonPlan");
      return this.getDefaultLessonPlan(language, topic);
    }
  }

  /**
   * Generate vocabulary list for a specific theme
   */
  async generateVocabularyList(
    language: Language,
    theme: string,
    level: string,
    count: number = 20
  ): Promise<VocabularyItem[]> {
    try {
      const prompt = `
        Generate ${count} vocabulary words for ${language.name} on theme: "${theme}" at ${level} level.
        
        Include:
        - Common, useful words
        - Native language translations
        - Pronunciation guides
        - Example sentences
        - Difficulty ratings (1-5)
        
        Return JSON array:
        [
          {
            "word": "word_in_target_language",
            "translation": "english_translation",
            "pronunciation": "pronunciation_guide",
            "example": "example_sentence_in_target_language",
            "difficulty": 1-5
          }
        ]
      `;

      const response = await this.openAIService.generateContent(prompt, { format: 'json' });
      return JSON.parse(response);
    } catch (error) {
      this.handleError(error, "CurriculumService.generateVocabularyList");
      return [];
    }
  }

  /**
   * Create adaptive lesson based on user performance
   */
  async createAdaptiveLesson(
    language: Language,
    userId: number,
    weakAreas: string[],
    strongAreas: string[],
    recentMistakes: string[]
  ): Promise<LessonPlan> {
    try {
      const prompt = `
        Create an adaptive lesson for ${language.name} based on user performance analysis.
        
        User performance data:
        - Weak areas: ${weakAreas.join(', ')}
        - Strong areas: ${strongAreas.join(', ')}
        - Recent mistakes: ${recentMistakes.join(', ')}
        
        Focus on:
        1. Reinforcing weak areas with targeted practice
        2. Building on strong areas for confidence
        3. Addressing recent mistakes with corrective exercises
        4. Providing varied difficulty levels
        
        Create a personalized lesson that adapts to their needs.
        Return the same JSON structure as generateLessonPlan.
      `;

      return await this.geminiService.generateLessonPlan(
        language.name,
        'Adaptive Practice',
        'intermediate', 
        30,
        {
          learningStyle: 'adaptive',
          interests: weakAreas,
          timeAvailable: 30
        }
      );
    } catch (error) {
      this.handleError(error, "CurriculumService.createAdaptiveLesson");
      return this.getDefaultLessonPlan(language, {
        name: 'Adaptive Practice',
        description: 'Personalized practice session',
        level: 'intermediate',
        category: 'grammar',
        id: 'adaptive',
        prerequisites: [],
        estimatedTime: 30,
        skills: ['review', 'practice']
      } as CurriculumTopic);
    }
  }

  /**
   * Get default lesson plan fallback
   */
  private getDefaultLessonPlan(language: Language, topic: CurriculumTopic): LessonPlan {
    const languageName = language?.name || 'Spanish';
    const topicName = topic?.name || 'Basic Conversation';
    const topicCategory = topic?.category || 'speaking';
    
    return {
      title: `${topicName} - ${languageName}`,
      description: topic?.description || `Learn ${topicName}`,
      level: topic?.level || 'beginner',
      duration: topic?.estimatedTime || 30,
      objectives: [`Learn ${topicName}`, `Practice ${topicCategory} skills`],
      activities: [
        {
          type: 'reading',
          title: 'Introduction',
          description: `Introduction to ${topic.name}`,
          content: `Let's learn about ${topic.name} in ${language.name}.`,
          duration: 10,
          difficulty: 2
        }
      ],
      vocabulary: [],
      grammar: [],
      assessment: []
    };
  }
}
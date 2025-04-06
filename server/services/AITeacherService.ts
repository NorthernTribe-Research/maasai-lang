import { BaseService } from './BaseService';
import { OpenAIService } from './OpenAIService';
import { GeminiService } from './GeminiService';

/**
 * Teacher persona interface
 */
export interface TeacherPersona {
  id: number;
  name: string;
  avatar: string;
  description: string;
  language: string;
  languageCode: string;
  level: string;
  personality: string;
  teachingStyle: string;
  specialties: string[];
}

/**
 * Service for AI-powered language teachers
 */
export class AITeacherService extends BaseService {
  private openAIService: OpenAIService;
  private geminiService: GeminiService;
  private teacherPersonas: TeacherPersona[];

  constructor(openAIService: OpenAIService, geminiService: GeminiService) {
    super();
    this.openAIService = openAIService;
    this.geminiService = geminiService;
    this.teacherPersonas = this.initializeTeacherPersonas();
    this.log("AI Teacher service initialized", "info");
  }

  /**
   * Get a list of teacher personas for a specific language
   * @param languageId The language ID
   * @returns Array of teacher personas for the language
   */
  async getTeacherPersonas(languageId: number): Promise<TeacherPersona[]> {
    try {
      // Get language code from ID (this should be replaced with actual DB lookup)
      const languageCode = this.getLanguageCodeFromId(languageId);
      
      // Filter personas by language code
      const personas = this.teacherPersonas.filter(
        persona => persona.languageCode === languageCode
      );
      
      if (personas.length === 0) {
        // If no personas found for this language, return default personas
        const defaultPersonas = this.teacherPersonas.filter(
          persona => persona.languageCode === 'universal'
        );
        return defaultPersonas;
      }
      
      return personas;
    } catch (error) {
      throw this.handleError(error, "getting teacher personas");
    }
  }

  /**
   * Get a response from an AI language teacher
   * @param languageId The language ID
   * @param teacherPersonaId The teacher persona ID
   * @param message The user's message
   * @param history Previous conversation history
   * @returns The teacher's response
   */
  async getTeacherResponse(
    languageId: number,
    teacherPersonaId: number,
    message: string,
    history: { role: string; content: string }[]
  ): Promise<string> {
    try {
      // Get language code from ID (this should be replaced with actual DB lookup)
      const languageCode = this.getLanguageCodeFromId(languageId);
      
      // Find the teacher persona
      const teacherPersona = this.teacherPersonas.find(p => p.id === teacherPersonaId) || 
        this.teacherPersonas.find(p => p.languageCode === languageCode && p.level === 'beginner') ||
        this.teacherPersonas[0];
      
      // Create the system message for the teacher
      const systemMessage = this.createTeacherSystemPrompt(teacherPersona, languageCode);
      
      // Format the conversation history
      const formattedHistory = [
        { role: "system", content: systemMessage },
        ...history,
        { role: "user", content: message }
      ];
      
      // Choose AI service based on persona
      let response: string;
      if (teacherPersona.id % 2 === 0) {
        // Even IDs use OpenAI
        response = await this.openAIService.generateChatCompletion(
          formattedHistory,
          'gpt-3.5-turbo',
          500,
          0.7
        );
      } else {
        // Odd IDs use Gemini
        const geminiPrompt = `
        ${systemMessage}
        
        Conversation history:
        ${history.map(msg => `${msg.role === 'user' ? 'Student' : 'Teacher'}: ${msg.content}`).join('\n\n')}
        
        Student: ${message}
        
        Teacher:
        `;
        
        response = await this.geminiService.generateContent(geminiPrompt);
      }
      
      return response;
    } catch (error) {
      throw this.handleError(error, "getting teacher response");
    }
  }

  /**
   * Create a system prompt for a teacher persona
   * @param persona The teacher persona
   * @param languageCode The language code
   * @returns A system prompt for the AI
   */
  private createTeacherSystemPrompt(persona: TeacherPersona, languageCode: string): string {
    return `
    You are ${persona.name}, a ${persona.level} level ${persona.language} language teacher.
    
    Your personality: ${persona.personality}
    Your teaching style: ${persona.teachingStyle}
    Your specialties: ${persona.specialties.join(', ')}
    
    When responding to students:
    1. Stay in character as ${persona.name} at all times.
    2. Be warm, encouraging, and patient.
    3. Your primary goal is to help the student learn ${persona.language}.
    4. Use simple vocabulary and short sentences for beginners, more complex language for intermediate and advanced students.
    5. Occasionally (20% of the time) include simple phrases in ${persona.language} with translations in parentheses.
    6. Keep your responses concise (3-5 sentences maximum).
    7. If the student is confused, break down explanations into simpler steps.
    8. When correcting errors, be gentle and constructive.
    9. Refer to yourself in the first person ("I").
    
    DO NOT use placeholder responses or refuse to answer questions related to language learning.
    DO NOT break character or explain that you are an AI.
    `;
  }

  /**
   * Convert a language ID to a language code
   * @param languageId The language ID
   * @returns The language code
   */
  private getLanguageCodeFromId(languageId: number): string {
    // Map language IDs to language codes
    // In a real application, this would come from the database
    const languageMap: Record<number, string> = {
      1: 'es', // Spanish
      2: 'fr', // French
      3: 'de', // German
      4: 'it', // Italian
      5: 'ja', // Japanese
      6: 'zh', // Chinese
      7: 'ru', // Russian
      8: 'pt', // Portuguese
      9: 'ko', // Korean
      10: 'ar', // Arabic
    };
    
    return languageMap[languageId] || 'en';
  }

  /**
   * Initialize teacher personas
   * @returns Array of teacher personas
   */
  private initializeTeacherPersonas(): TeacherPersona[] {
    // In a real application, these would come from the database
    return [
      // Universal personas (for any language)
      {
        id: 1,
        name: "Professor Polyglot",
        avatar: "/assets/teachers/polyglot.png",
        description: "A universal language expert who can help with any language",
        language: "Multiple Languages",
        languageCode: "universal",
        level: "advanced",
        personality: "Academic, detail-oriented, and wise. Speaks with authority and clarity.",
        teachingStyle: "Structured and methodical, with a focus on grammar rules and language patterns.",
        specialties: ["Grammar", "Language theory", "Comparative linguistics"]
      },
      {
        id: 2,
        name: "Globetrotter Gabi",
        avatar: "/assets/teachers/globetrotter.png",
        description: "A friendly world traveler who teaches through stories and cultural experiences",
        language: "Multiple Languages",
        languageCode: "universal",
        level: "intermediate",
        personality: "Adventurous, friendly, and full of energy. Always has a story to tell.",
        teachingStyle: "Immersive and contextual, focusing on real-world usage and cultural insights.",
        specialties: ["Conversational fluency", "Travel vocabulary", "Cultural nuances"]
      },
      
      // Spanish personas
      {
        id: 101,
        name: "Carmen Castillo",
        avatar: "/assets/teachers/carmen.png",
        description: "A warm and patient Spanish teacher from Madrid",
        language: "Spanish",
        languageCode: "es",
        level: "beginner",
        personality: "Warm, patient, and encouraging. Makes students feel comfortable making mistakes.",
        teachingStyle: "Communicative and practical, focusing on building confidence through conversation.",
        specialties: ["Pronunciation", "Basic conversation", "Everyday vocabulary"]
      },
      {
        id: 102,
        name: "Javier Rodríguez",
        avatar: "/assets/teachers/javier.png",
        description: "An energetic flamenco dancer who teaches through music and rhythm",
        language: "Spanish",
        languageCode: "es",
        level: "intermediate",
        personality: "Passionate, expressive, and artistic. Infuses lessons with cultural flair.",
        teachingStyle: "Creative and rhythmic, incorporating music, movement, and cultural arts.",
        specialties: ["Idiomatic expressions", "Music and arts vocabulary", "Regional dialects"]
      },
      
      // French personas
      {
        id: 201,
        name: "Sophie Dubois",
        avatar: "/assets/teachers/sophie.png",
        description: "A chic Parisian who makes learning French stylish and fun",
        language: "French",
        languageCode: "fr",
        level: "beginner",
        personality: "Elegant, witty, and slightly dramatic. Has a flair for making simple phrases sound beautiful.",
        teachingStyle: "Immersive and aesthetic, focusing on the beauty and flow of the language.",
        specialties: ["Pronunciation", "Everyday phrases", "Cultural etiquette"]
      },
      {
        id: 202,
        name: "Marcel Lefèvre",
        avatar: "/assets/teachers/marcel.png",
        description: "A philosophical professor who explains the deeper meanings of language",
        language: "French",
        languageCode: "fr",
        level: "advanced",
        personality: "Thoughtful, philosophical, and precise. Appreciates the nuances of language.",
        teachingStyle: "Analytical and contextual, exploring the why behind language patterns.",
        specialties: ["Literary French", "Philosophical terminology", "Nuanced expression"]
      },
      
      // German personas
      {
        id: 301,
        name: "Hans Schmidt",
        avatar: "/assets/teachers/hans.png",
        description: "A structured and efficient teacher who breaks German down into logical components",
        language: "German",
        languageCode: "de",
        level: "beginner",
        personality: "Organized, clear, and methodical. Values precision and logic.",
        teachingStyle: "Systematic and rule-based, breaking complex grammar into manageable chunks.",
        specialties: ["Grammar fundamentals", "Sentence structure", "Pronunciation"]
      },
      
      // Japanese personas
      {
        id: 401,
        name: "Yuki Tanaka",
        avatar: "/assets/teachers/yuki.png",
        description: "A gentle and patient teacher who guides students through the beauty of Japanese",
        language: "Japanese",
        languageCode: "ja",
        level: "beginner",
        personality: "Calm, respectful, and thoughtful. Creates a peaceful learning environment.",
        teachingStyle: "Step-by-step and visual, with emphasis on proper form and cultural context.",
        specialties: ["Writing systems", "Polite expressions", "Basic conversation"]
      },
      
      // Chinese personas
      {
        id: 501,
        name: "Li Wei",
        avatar: "/assets/teachers/li.png",
        description: "A wise and encouraging teacher who makes Chinese accessible and fascinating",
        language: "Chinese",
        languageCode: "zh",
        level: "beginner",
        personality: "Wise, patient, and gently humorous. Uses stories and proverbs to illustrate points.",
        teachingStyle: "Balanced between structured practice and cultural insights, with many examples.",
        specialties: ["Tones and pronunciation", "Character writing", "Daily expressions"]
      }
    ];
  }
}